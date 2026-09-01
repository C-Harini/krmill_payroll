const { BiometricPunch, Employee, BiometricDevice, Company, ShiftType, Department, Designation } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
const ZKLib = require('node-zklib');
const autoSyncService = require('../services/BiometricAutoSyncService');
const { processRealtimePunch } = require('../services/attendanceProcessor');


// @desc    Get all biometric punches with filters
// @route   GET /api/biometric-punches
// @access  Private
exports.getBiometricPunches = async (req, res) => {
    const { companyId, employeeId, deviceId, date, fromDate, toDate, punchType, page = 1, limit = 50 } = req.query;

    if (!companyId) {
        return res.status(400).json({ success: false, message: 'Company ID is required' });
    }

    try {
        const whereClause = { companyId };
        if (employeeId) whereClause.employeeId = employeeId;
        if (deviceId) whereClause.biometricDeviceId = deviceId;
        if (punchType) whereClause.punchType = punchType;

        if (date) {
            whereClause.punchDate = date;
        } else if (fromDate && toDate) {
            whereClause.punchDate = { [Op.between]: [fromDate, toDate] };
        } else if (fromDate) {
            whereClause.punchDate = { [Op.gte]: fromDate };
        } else if (toDate) {
            whereClause.punchDate = { [Op.lte]: toDate };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: punches } = await BiometricPunch.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: ['id', 'employeeCode', 'firstName', 'lastName', 'profilePhoto'],
                    include: [
                        { model: Department, as: 'department', attributes: ['departmentname', ['departmentname', 'departmentName'], ['departmentname', 'name']] },
                        { model: Designation, as: 'designation', attributes: ['name'] }
                    ]
                },
                {
                    model: BiometricDevice,
                    as: 'device',
                    attributes: ['id', 'name', 'location', 'deviceIP']
                },
                {
                    model: ShiftType,
                    as: 'shift',
                    attributes: ['id', 'name', 'startTime', 'endTime']
                }
            ],
            order: [['punchTime', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        const todayDate = moment().format('YYYY-MM-DD');
        const todayPunches = await BiometricPunch.count({
            where: { companyId, punchDate: todayDate }
        });

        const uniqueEmployees = await BiometricPunch.count({
            where: whereClause,
            distinct: true,
            col: 'employeeId'
        });

        const lastPunch = await BiometricPunch.findOne({
            where: { companyId },
            order: [['punchTime', 'DESC']],
            include: [{ model: Employee, as: 'employee', attributes: ['firstName', 'lastName'] }]
        });

        res.status(200).json({
            success: true,
            data: punches,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(count / parseInt(limit))
            },
            summary: {
                totalRecords: count,
                todayPunches: todayPunches,
                uniqueEmployees: uniqueEmployees,
                lastPunch: lastPunch ? {
                    employee: `${lastPunch.employee.firstName} ${lastPunch.employee.lastName}`,
                    time: lastPunch.punchTime,
                    type: lastPunch.punchType
                } : null
            }
        });
    } catch (error) {
        console.error('Error fetching biometric punches:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get punch by ID
// @route   GET /api/biometric-punches/:id
// @access  Private
exports.getPunchById = async (req, res) => {
    const { id } = req.params;

    try {
        const punch = await BiometricPunch.findByPk(id, {
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    include: [
                        { model: Department, as: 'department' },
                        { model: Designation, as: 'designation' }
                    ]
                },
                { model: BiometricDevice, as: 'device' },
                { model: ShiftType, as: 'shift' }
            ]
        });

        if (!punch) {
            return res.status(404).json({ success: false, message: 'Punch record not found' });
        }

        res.status(200).json({ success: true, data: punch });
    } catch (error) {
        console.error('Error fetching punch by ID:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Record a new punch (manual entry)
// @route   POST /api/biometric-punches
// @access  Private
exports.recordPunch = async (req, res) => {
    const {
        employeeId,
        biometricDeviceId,
        biometricEnrollmentId,
        punchTime,
        punchType,
        isManual = true,
        remarks,
        companyId
    } = req.body;

    if (!employeeId || !punchTime || !punchType || !companyId) {
        return res.status(400).json({
            success: false,
            message: 'Required fields: employeeId, punchTime, punchType, companyId'
        });
    }

    try {
        const employee = await Employee.findOne({
            where: { id: employeeId, companyId },
            include: [{ model: ShiftType, as: 'shiftType' }]
        });

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        const punchDateTime = moment(punchTime);
        const punchDate = punchDateTime.format('YYYY-MM-DD');

        const todayPunches = await BiometricPunch.findAll({
            where: { employeeId: employee.id, punchDate: punchDate },
            order: [['punchTime', 'ASC']]
        });

        const { isLate, isEarlyOut } = calculateAttendanceFlags(punchDateTime, punchType, employee.shiftType);

        const newPunch = await BiometricPunch.create({
            employeeId: employeeId,
            biometricDeviceId: biometricDeviceId || null,
            biometricEnrollmentId: biometricEnrollmentId || employee.biometricEnrollmentId,
            punchTime: punchTime,
            punchDate: punchDate,
            punchType: punchType,
            //shiftTypeId: employee.shiftTypeId,
            shiftTypeId: employee.shiftTypeId > 0 ? employee.shiftTypeId : null,
            isLate: isLate,
            isEarlyOut: isEarlyOut,
            isManual: isManual,
            remarks: remarks,
            companyId: companyId,
            status: 'Valid'
        });

        await processRealtimePunch({
            employeeId: employeeId,
            punchTime: punchTime,
            punchType: punchType,
            companyId: companyId
        });


        const completePunch = await BiometricPunch.findByPk(newPunch.id, {
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: ['id', 'employeeCode', 'firstName', 'lastName'],
                    include: [{ model: Department, as: 'department', attributes: ['departmentname', ['departmentname', 'name']] }]
                },
                { model: BiometricDevice, as: 'device', attributes: ['id', 'name', 'location'] },
                { model: ShiftType, as: 'shift', attributes: ['name', 'startTime', 'endTime'] }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Punch recorded successfully',
            data: completePunch
        });
    } catch (error) {
        console.error('Error recording punch:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Update punch record
// @route   PUT /api/biometric-punches/:id
// @access  Private
exports.updatePunch = async (req, res) => {
    const { id } = req.params;
    const { punchTime, punchType, remarks, status } = req.body;

    try {
        const punch = await BiometricPunch.findByPk(id);

        if (!punch) {
            return res.status(404).json({ success: false, message: 'Punch record not found' });
        }

        const updateData = {};
        if (punchTime) {
            updateData.punchTime = punchTime;
            updateData.punchDate = moment(punchTime).format('YYYY-MM-DD');
        }
        if (punchType) updateData.punchType = punchType;
        if (remarks !== undefined) updateData.remarks = remarks;
        if (status) updateData.status = status;

        await punch.update(updateData);

        const updatedPunch = await BiometricPunch.findByPk(id, {
            include: [
                { model: Employee, as: 'employee', include: [{ model: Department, as: 'department' }] },
                { model: BiometricDevice, as: 'device' },
                { model: ShiftType, as: 'shift' }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Punch record updated successfully',
            data: updatedPunch
        });
    } catch (error) {
        console.error('Error updating punch:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Delete punch record
// @route   DELETE /api/biometric-punches/:id
// @access  Private
exports.deletePunch = async (req, res) => {
    const { id } = req.params;

    try {
        const punch = await BiometricPunch.findByPk(id);

        if (!punch) {
            return res.status(404).json({ success: false, message: 'Punch record not found' });
        }

        await punch.destroy();

        res.status(200).json({
            success: true,
            message: 'Punch record deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting punch:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get employee's daily punch summary
// @route   GET /api/biometric-punches/employee/:employeeId/daily
// @access  Private
exports.getEmployeeDailySummary = async (req, res) => {
    const { employeeId } = req.params;
    const { date } = req.query;

    const targetDate = date || moment().format('YYYY-MM-DD');

    try {
        const punches = await BiometricPunch.findAll({
            where: { employeeId: employeeId, punchDate: targetDate },
            include: [
                { model: BiometricDevice, as: 'device', attributes: ['name', 'location'] },
                { model: ShiftType, as: 'shift', attributes: ['name', 'startTime', 'endTime'] }
            ],
            order: [['punchTime', 'ASC']]
        });

        let totalWorkingMinutes = 0;
        for (let i = 0; i < punches.length - 1; i += 2) {
            if (punches[i].punchType === 'IN' && punches[i + 1] && punches[i + 1].punchType === 'OUT') {
                const inTime = moment(punches[i].punchTime);
                const outTime = moment(punches[i + 1].punchTime);
                totalWorkingMinutes += outTime.diff(inTime, 'minutes');
            }
        }

        const workingHours = Math.floor(totalWorkingMinutes / 60);
        const workingMinutes = totalWorkingMinutes % 60;

        res.status(200).json({
            success: true,
            date: targetDate,
            punches: punches,
            summary: {
                totalPunches: punches.length,
                firstIn: punches.length > 0 ? punches[0].punchTime : null,
                lastOut: punches.length > 0 ? punches[punches.length - 1].punchTime : null,
                workingHours: `${workingHours}h ${workingMinutes}m`,
                totalMinutes: totalWorkingMinutes,
                isLate: punches.length > 0 ? punches[0].isLate : false,
                isEarlyOut: punches.length > 0 ? punches[punches.length - 1].isEarlyOut : false
            }
        });
    } catch (error) {
        console.error('Error fetching employee daily summary:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Fetch attendance from biometric device (preview only)
// @route   GET /api/biometric-punches/fetch-from-device/:deviceId
// @access  Private
if (autoSyncService.isDeviceBusy()) {
    return res.status(409).json({
        success: false,
        message: 'Auto-sync is currently running. Please try again in a moment.'
    });
}

exports.fetchPunchesFromDevice = async (req, res) => {
    const { deviceId } = req.params;
    let zkInstance = null;
    let device = null;

    try {
        device = await BiometricDevice.findByPk(deviceId);
        if (!device) {
            return res.status(404).json({ success: false, message: 'Biometric device not found' });
        }

        console.log(`📡 Connecting to device: ${device.name} at ${device.deviceIP}`);

        zkInstance = new ZKLib(device.deviceIP, 4370, 10000, 4000);
        await zkInstance.createSocket();
        console.log('✅ Socket connected');

        const attendanceData = await zkInstance.getAttendances();
        const logs = attendanceData.data;
        console.log("Total Logs:", logs.length);

        if (logs.length > 0) {
            console.log("First Log:", logs[0]);
            console.log("Last Log:", logs[logs.length - 1]);
        }
        console.log(`✅ Retrieved ${logs.length} attendance records`);

        await zkInstance.disconnect();
        zkInstance = null;

        const formattedLogs = logs.map(log => ({
            biometricEnrollmentId: log.deviceUserId.toString(),
            punchTime: new Date(log.recordTime),
            deviceId: device.id,
            deviceName: device.name,
            deviceLocation: device.location,
            companyId: device.companyId
        }));

        formattedLogs.sort((a, b) => b.punchTime - a.punchTime);

        return res.json({
            success: true,
            message: `✅ Successfully fetched ${formattedLogs.length} attendance records from device`,
            deviceInfo: {
                id: device.id,
                name: device.name,
                ip: device.deviceIP,
                location: device.location
            },
            data: formattedLogs,
            summary: {
                totalRecords: formattedLogs.length,
                dateRange: formattedLogs.length > 0 ? {
                    from: new Date(Math.min(...formattedLogs.map(r => r.punchTime))),
                    to: new Date(Math.max(...formattedLogs.map(r => r.punchTime)))
                } : null
            }
        });

    } catch (error) {
        console.error('❌ Error fetching punches:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch attendance from device',
            error: error.message,
            device: { name: device?.name, ip: device?.deviceIP }
        });
    } finally {
        if (zkInstance) {
            try {
                await zkInstance.disconnect();
            } catch (e) {
                console.error('Error disconnecting:', e);
            }
        }
    }
};

// @desc    Fetch AND auto-import punches from device (manual trigger)
// @route   POST /api/biometric-punches/fetch-and-import/:deviceId
// @access  Private

if (autoSyncService.isDeviceBusy()) {
    return res.status(409).json({
        success: false,
        message: 'Auto-sync is currently running. Please try again in a moment.'
    });
}

exports.fetchAndImportPunches = async (req, res) => {
    const { deviceId } = req.params;
    const { companyId } = req.body;

    if (!companyId) {
        return res.status(400).json({ success: false, message: 'companyId is required in request body' });
    }

    let zkInstance = null;

    try {
        const device = await BiometricDevice.findByPk(deviceId);
        if (!device) {
            return res.status(404).json({ success: false, message: 'Device not found' });
        }

        console.log(`📡 Fetching and importing from: ${device.name}`);

        zkInstance = new ZKLib(device.deviceIP, 4370, 10000, 4000);
        await zkInstance.createSocket();
        console.log('✅ Connected to device');

        const attendanceData = await zkInstance.getAttendances();
        const logs = attendanceData.data;
        console.log(`✅ Fetched ${logs.length} records from device`);

        if (logs.length > 0) {
            const sortedLogs = [...logs].sort(
                (a, b) => new Date(a.recordTime) - new Date(b.recordTime)
            );
            console.log("======================================");
            console.log("Total Records :", logs.length);
            console.log("Oldest Record :", sortedLogs[0]);
            console.log("Latest Record :", sortedLogs[sortedLogs.length - 1]);
            console.log("======================================");
        }

        await zkInstance.disconnect();
        zkInstance = null;

        const results = {
            success: [],
            failed: [],
            duplicates: [],
            notFound: []
        };

        for (const log of logs) {
            try {
                const recordTime = new Date(log.recordTime);
                const biometricNumber = log.deviceUserId.toString();
                const punchDateTime = moment(recordTime);

                console.log(
                    `Processing -> DeviceUserId: ${biometricNumber}, Time: ${recordTime}`
                );

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
                    results.duplicates.push({
                        biometricNumber,
                        punchTime: recordTime,
                        message: 'Already exists'
                    });
                    continue;
                }

                const employee = await Employee.findOne({
                    where: {
                        biometricEnrollmentId: biometricNumber,
                        companyId: companyId,
                        status: 'Active'
                    },
                    include: [{ model: ShiftType, as: 'shiftType' }]
                });

                if (!employee) {

                    console.log("======================================");
                    console.log("EMPLOYEE NOT FOUND");
                    console.log("Company ID :", companyId);
                    console.log("Device User ID :", biometricNumber);
                    console.log("Punch Time :", recordTime);
                    console.log("======================================");

                    results.notFound.push({
                        biometricNumber,
                        punchTime: recordTime,
                        message: 'Employee not found'
                    });
                    continue;
                }

                const punchDate = punchDateTime.format('YYYY-MM-DD');
                const todayPunches = await BiometricPunch.findAll({
                    where: { employeeId: employee.id, punchDate: punchDate },
                    order: [['punchTime', 'ASC']]
                });

                const punchType = determinePunchType(punchDateTime, employee.shiftType, todayPunches);
                const { isLate, isEarlyOut } = calculateAttendanceFlags(punchDateTime, punchType, employee.shiftType);

                const newPunch = await BiometricPunch.create({
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
                    companyId: companyId,
                    status: 'Valid'
                });

                await processRealtimePunch({
                    employeeId: employee.id,
                    punchTime: recordTime,
                    punchType: punchType,
                    companyId: companyId
                });


                results.success.push({
                    id: newPunch.id,
                    biometricNumber,
                    employeeName: `${employee.firstName} ${employee.lastName}`,
                    employeeCode: employee.employeeCode,
                    punchTime: recordTime,
                    punchType: punchType
                });

            } catch (error) {
                results.failed.push({
                    biometricNumber: log.deviceUserId,
                    error: error.message
                });
            }
        }

        return res.json({
            success: true,
            message: '✅ Fetch and import completed',
            device: {
                name: device.name,
                ip: device.deviceIP,
                location: device.location
            },
            summary: {
                total: logs.length,
                imported: results.success.length,
                duplicates: results.duplicates.length,
                notFound: results.notFound.length,
                failed: results.failed.length
            },
            details: results
        });

    } catch (error) {
        console.error('❌ Error in fetch and import:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch and import',
            error: error.message
        });
    } finally {
        if (zkInstance) {
            try {
                await zkInstance.disconnect();
            } catch (e) {
                console.error('Error disconnecting:', e);
            }
        }
    }
};

// ============================================
// AUTO-SYNC MANAGEMENT ENDPOINTS (NEW)
// ============================================

// @desc    Get auto-sync status
// @route   GET /api/biometric-punches/auto-sync/status
// @access  Private
exports.getAutoSyncStatus = async (req, res) => {
    try {
        const status = autoSyncService.getStatus();

        res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error getting auto-sync status:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Start auto-sync service
// @route   POST /api/biometric-punches/auto-sync/start
// @access  Private (Admin only)
exports.startAutoSync = async (req, res) => {
    try {
        autoSyncService.start();

        res.status(200).json({
            success: true,
            message: 'Auto-sync service started successfully',
            status: autoSyncService.getStatus()
        });
    } catch (error) {
        console.error('Error starting auto-sync:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Stop auto-sync service
// @route   POST /api/biometric-punches/auto-sync/stop
// @access  Private (Admin only)
exports.stopAutoSync = async (req, res) => {
    try {
        autoSyncService.stop();

        res.status(200).json({
            success: true,
            message: 'Auto-sync service stopped successfully',
            status: autoSyncService.getStatus()
        });
    } catch (error) {
        console.error('Error stopping auto-sync:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Trigger manual sync immediately
// @route   POST /api/biometric-punches/auto-sync/trigger
// @access  Private (Admin only)
exports.triggerManualSync = async (req, res) => {
    try {
        const result = await autoSyncService.triggerManualSync();

        res.status(200).json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (error) {
        console.error('Error triggering manual sync:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// Helper functions
function determinePunchType(punchTime, shift, todayPunches) {
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

function calculateAttendanceFlags(punchTime, punchType, shift) {
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
