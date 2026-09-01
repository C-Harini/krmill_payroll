const cron = require('node-cron');
const { BiometricDevice, BiometricPunch, Employee, ShiftType, Company } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
const ZKLib = require('node-zklib');
const { processRealtimePunch } = require('./attendanceProcessor');


// ============================================
// AUTO SYNC SERVICE - Runs every 5 minutes
// ============================================

class BiometricAutoSyncService {
    constructor() {
        this.syncJob = null;
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.syncHistory = [];
        this.maxHistorySize = 100;
    }

    //  * Start the auto-sync scheduler
    //  * Runs every 5 minutes: 
    start() {
        if (this.syncJob) {
            console.log('⚠️  Auto-sync service is already running');
            return;
        }

        // Run every 5 minutes
        this.syncJob = cron.schedule('*/5 * * * *', async () => {
            await this.syncAllDevices();
        });

        console.log('✅ Biometric Auto-Sync Service started - Running every 5 minutes');

        // Run immediately on startup
        setTimeout(() => this.syncAllDevices(), 5000);
    }

    /**
     * Stop the auto-sync scheduler
     */
    stop() {
        if (this.syncJob) {
            this.syncJob.stop();
            this.syncJob = null;
            console.log('🛑 Biometric Auto-Sync Service stopped');
        }
    }

    /**
     * Main sync function - syncs all active devices
     */
    async syncAllDevices() {
        if (this.isSyncing) {
            console.log('⏳ Sync already in progress, skipping...');
            return;
        }

        this.isSyncing = true;
        const syncStartTime = new Date();
        console.log(`\n🔄 [${moment().format('YYYY-MM-DD HH:mm:ss')}] Starting auto-sync for all devices...`);

        try {
            // Get all active devices
            const devices = await BiometricDevice.findAll({
                where: {
                    status: 'Active',
                    isAutoSyncEnabled: true  // Add this field to your BiometricDevice model
                },
                include: [{
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                }]
            });

            if (devices.length === 0) {
                console.log('ℹ️  No active devices found for auto-sync');
                this.isSyncing = false;
                return;
            }

            console.log(`📡 Found ${devices.length} active device(s) to sync`);

            const syncResults = {
                totalDevices: devices.length,
                successfulDevices: 0,
                failedDevices: 0,
                totalImported: 0,
                totalDuplicates: 0,
                totalNotFound: 0,
                totalFailed: 0,
                deviceDetails: []
            };

            // Sync each device
            for (const device of devices) {
                const deviceResult = await this.syncSingleDevice(device);
                syncResults.deviceDetails.push(deviceResult);

                if (deviceResult.success) {
                    syncResults.successfulDevices++;
                    syncResults.totalImported += deviceResult.imported;
                    syncResults.totalDuplicates += deviceResult.duplicates;
                    syncResults.totalNotFound += deviceResult.notFound;
                    syncResults.totalFailed += deviceResult.failed;
                } else {
                    syncResults.failedDevices++;
                }
            }

            const syncEndTime = new Date();
            const duration = (syncEndTime - syncStartTime) / 1000;

            // Store sync history
            this.lastSyncTime = syncEndTime;
            this.addToHistory({
                timestamp: syncEndTime,
                duration: duration,
                results: syncResults
            });

            console.log(`\n✅ Auto-sync completed in ${duration}s`);
            console.log(`   📊 Devices: ${syncResults.successfulDevices}/${syncResults.totalDevices} successful`);
            console.log(`   ✅ Imported: ${syncResults.totalImported}`);
            console.log(`   ⏭️  Duplicates: ${syncResults.totalDuplicates}`);
            console.log(`   ❓ Not Found: ${syncResults.totalNotFound}`);
            console.log(`   ❌ Failed: ${syncResults.totalFailed}\n`);

        } catch (error) {
            console.error('❌ Error in auto-sync:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sync a single device
     */
    async syncSingleDevice(device) {
        let zkInstance = null;
        const deviceStartTime = Date.now();

        try {
            console.log(`  📱 Syncing: ${device.name} (${device.deviceIP})`);

            // Connect to device
            /*      
                      zkInstance = new ZKLib(device.deviceIP, 4370, 10000, 4000);
                      await zkInstance.createSocket();
          
                      // Get attendance logs
                      const attendanceData = await zkInstance.getAttendances();
                      const logs = attendanceData.data;
                      console.log("Total Logs:", logs.length);
          
          const latest = logs.reduce((max, l) => {
              const t = new Date(l.recordTime);
              return t > max ? t : max;
          }, new Date(0));
          
          console.log("================================");
          console.log("LATEST RECORD FROM DEVICE:", latest);
          console.log("================================");
          
          
                      await zkInstance.disconnect();
                      zkInstance = null;
          
                      console.log(`     Retrieved ${logs.length} records from ${device.name}`);
          */

            // Connect to device
            zkInstance = new ZKLib(device.deviceIP, 4370, 10000, 30000);

            console.log("STEP 1 : Connecting to device...");
            await zkInstance.createSocket();

            const info = await zkInstance.getInfo();
            console.log("DEVICE INFO:", info);

            const users = await zkInstance.getUsers();
            console.log("TOTAL USERS:", users.data.length);

            console.log("############################");
            console.log("AFTER createSocket()");
            console.log("############################");
            console.log("STEP 2 : Connected successfully");

            let attendanceData;

            try {
                console.log("STEP 3 : Calling getAttendances()...");
                attendanceData = await zkInstance.getAttendances();
                console.log("STEP 4 : getAttendances() returned successfully");
            } catch (err) {
                console.error("❌ getAttendances() ERROR:", err);
                throw err;
            }

            console.log("STEP 5 : AttendanceData Type =", typeof attendanceData);
            console.dir(attendanceData, { depth: 2 });

            const logs = attendanceData.data || [];

            console.log("STEP 6 : Total Logs =", logs.length);

            if (logs.length > 0) {

                console.log("========================================");
                console.log("FIRST RECORD :", logs[0]);
                console.log("LAST RECORD  :", logs[logs.length - 1]);

                const latest = logs.reduce((max, l) => {
                    const t = new Date(l.recordTime);
                    return t > max ? t : max;
                }, new Date(0));

                console.log("LATEST RECORD FROM DEVICE :", latest);

                const validLogs = logs.filter(l =>
                    l.deviceUserId &&
                    l.deviceUserId.toString().trim() !== "" &&
                    new Date(l.recordTime).getFullYear() >= 2005
                );

                console.log("VALID LOG COUNT :", validLogs.length);

                if (validLogs.length > 0) {
                    const latestValid = validLogs.reduce((max, l) => {
                        const t = new Date(l.recordTime);
                        return t > max ? t : max;
                    }, new Date(0));

                    console.log("LATEST VALID RECORD :", latestValid);
                }

                console.log("========================================");
            }

            await zkInstance.disconnect();
            zkInstance = null;

            console.log(`Retrieved ${logs.length} records from ${device.name}`);

            // Process and import logs
            const results = {
                success: true,
                deviceId: device.id,
                deviceName: device.name,
                deviceIP: device.deviceIP,
                totalRecords: logs.length,
                imported: 0,
                duplicates: 0,
                notFound: 0,
                failed: 0,
                duration: 0
            };

            for (const log of logs) {
                try {
                    const recordTime = new Date(log.recordTime);


                    if (!log.deviceUserId || !log.recordTime) {
                        console.log("Skipping Invalid Log:", log);
                        continue;
                    }

                    const biometricNumber = log.deviceUserId.toString().trim();

                    if (biometricNumber === "" || recordTime.getFullYear() < 2005) {
                        console.log("Skipping Invalid Log:", log);
                        continue;
                    }
                    const punchDateTime = moment(recordTime);

                    // Check for duplicates
                    const existingPunch = await BiometricPunch.findOne({
                        where: {
                            biometricEnrollmentId: biometricNumber,
                            punchTime: {
                                [Op.between]: [
                                    punchDateTime.clone().subtract(2, 'minutes').toDate(),
                                    punchDateTime.clone().add(2, 'minutes').toDate()
                                ]
                            }
                        }
                    });

                    if (existingPunch) {
                        results.duplicates++;
                        continue;
                    }

                    // Find employee
                    const employee = await Employee.findOne({
                        where: {
                            biometricEnrollmentId: biometricNumber,
                            companyId: device.companyId,
                            status: 'Active'
                        },
                        include: [{ model: ShiftType, as: 'shiftType' }]
                    });

                    if (!employee) {
                        results.notFound++;
                        continue;
                    }

                    // Get today's punches for determining IN/OUT
                    const punchDate = punchDateTime.format('YYYY-MM-DD');
                    const todayPunches = await BiometricPunch.findAll({
                        where: { employeeId: employee.id, punchDate: punchDate },
                        order: [['punchTime', 'ASC']]
                    });

                    // Determine punch type
                    const punchType = this.determinePunchType(punchDateTime, employee.shiftType, todayPunches);

                    // Calculate attendance flags
                    const { isLate, isEarlyOut } = this.calculateAttendanceFlags(
                        punchDateTime,
                        punchType,
                        employee.shiftType
                    );

                    // Create punch record
                    await BiometricPunch.create({
                        employeeId: employee.id,
                        biometricDeviceId: device.id,
                        biometricEnrollmentId: biometricNumber,
                        punchTime: recordTime,
                        punchDate: punchDate,
                        punchType: punchType,
                        //shiftTypeId: employee.shiftTypeId,
                        shiftTypeId: employee.shiftTypeId > 0 ? employee.shiftTypeId : null,
                        isLate: isLate,
                        isEarlyOut: isEarlyOut,
                        isManual: false,
                        companyId: device.companyId,
                        status: 'Valid'
                    });

                    await processRealtimePunch({
                        employeeId: employee.id,
                        punchTime: recordTime,
                        punchType: punchType,
                        companyId: device.companyId
                    });


                    results.imported++;

                } catch (error) {
                    results.failed++;
                    console.error(`     ❌ Error processing record:`, error.message);
                }
            }

            results.duration = Date.now() - deviceStartTime;
            console.log(`     ✅ ${device.name}: Imported ${results.imported}, Skipped ${results.duplicates} duplicates`);

            return results;

        } catch (error) {
            console.error(`     ❌ ${device.name}: Connection failed -`, error.message);
            return {
                success: false,
                deviceId: device.id,
                deviceName: device.name,
                deviceIP: device.deviceIP,
                error: error.message,
                imported: 0,
                duplicates: 0,
                notFound: 0,
                failed: 0,
                duration: Date.now() - deviceStartTime
            };
        } finally {
            if (zkInstance) {
                try {
                    await zkInstance.disconnect();
                } catch (e) {
                    console.error('Error disconnecting:', e);
                }
            }
        }
    }

    /**
     * Helper: Determine punch type (IN or OUT)
     */
    determinePunchType(punchTime, shift, todayPunches) {
        if (todayPunches.length === 0) {
            if (!shift) return 'IN';

            const shiftStart = moment(shift.startTime, 'HH:mm:ss');
            const shiftEnd = moment(shift.endTime, 'HH:mm:ss');
            const punchHour = moment(punchTime).format('HH:mm:ss');
            const punchMoment = moment(punchHour, 'HH:mm:ss');

            const earlyWindow = shiftStart.clone().subtract(2, 'hours');
            const lateWindow = shiftStart.clone().add(2, 'hours');

            if (punchMoment.isBetween(earlyWindow, lateWindow)) {
                return 'IN';
            }

            const endEarlyWindow = shiftEnd.clone().subtract(1, 'hour');
            const endLateWindow = shiftEnd.clone().add(2, 'hours');

            if (punchMoment.isBetween(endEarlyWindow, endLateWindow)) {
                return 'OUT';
            }

            return 'IN';
        }

        const lastPunch = todayPunches[todayPunches.length - 1];
        return lastPunch.punchType === 'IN' ? 'OUT' : 'IN';
    }

    /**
     * Helper: Calculate late and early-out flags
     */
    calculateAttendanceFlags(punchTime, punchType, shift) {
        let isLate = false;
        let isEarlyOut = false;

        if (!shift) {
            return { isLate, isEarlyOut };
        }

        const shiftStart = moment(shift.startTime, 'HH:mm:ss');
        const shiftEnd = moment(shift.endTime, 'HH:mm:ss');
        const graceIn = shift.graceTimeIn || 0;
        const graceOut = shift.graceTimeOut || 0;

        const punchHour = moment(punchTime).format('HH:mm:ss');
        const punchMoment = moment(punchHour, 'HH:mm:ss');

        if (punchType === 'IN') {
            const lateThreshold = shiftStart.clone().add(graceIn, 'minutes');
            if (punchMoment.isAfter(lateThreshold)) {
                isLate = true;
            }
        } else if (punchType === 'OUT') {
            const earlyThreshold = shiftEnd.clone().subtract(graceOut, 'minutes');
            if (punchMoment.isBefore(earlyThreshold)) {
                isEarlyOut = true;
            }
        }

        return { isLate, isEarlyOut };
    }

    /**
     * Add entry to sync history
     */
    addToHistory(entry) {
        this.syncHistory.unshift(entry);

        // Keep only last N entries
        if (this.syncHistory.length > this.maxHistorySize) {
            this.syncHistory = this.syncHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Get sync status
     */
    getStatus() {
        return {
            isRunning: this.syncJob !== null,
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            uptime: this.syncJob ? moment(this.lastSyncTime).fromNow() : 'Not started',
            historyCount: this.syncHistory.length,
            recentHistory: this.syncHistory.slice(0, 10)
        };
    }

    isDeviceBusy() {
        return this.isSyncing;
    }
    /**
     * Manual trigger sync (for testing or on-demand sync)
     */
    async triggerManualSync() {
        if (this.isSyncing) {
            return {
                success: false,
                message: 'Sync already in progress'
            };
        }

        await this.syncAllDevices();

        return {
            success: true,
            message: 'Manual sync completed',
            lastSync: this.lastSyncTime
        };
    }
}

// Create singleton instance
const autoSyncService = new BiometricAutoSyncService();

module.exports = autoSyncService;
