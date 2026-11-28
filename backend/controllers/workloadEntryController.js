const { WorkloadDailyEntry, WorkloadEmployee, Employee, Department, Category, WorkloadMaster } = require('../models');
const { Op } = require('sequelize');

// Helper to compute the first day of the current month (YYYY-MM-01)
function getFirstDayOfCurrentMonth(dateStr) {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
}

// @desc    Get all distinct dates where workload entries have been made
// @route   GET /api/workload-entries/dates
exports.getWorkloadEntryDates = async (req, res) => {
    try {
        const dates = await WorkloadDailyEntry.findAll({
            attributes: [
                [WorkloadDailyEntry.sequelize.fn('DISTINCT', WorkloadDailyEntry.sequelize.col('entryDate')), 'entryDate'],
                [WorkloadDailyEntry.sequelize.fn('COUNT', WorkloadDailyEntry.sequelize.col('id')), 'entryCount'],
            ],
            group: ['entryDate'],
            order: [['entryDate', 'DESC']],
        });

        const formatted = dates.map((d) => ({
            date: d.getDataValue('entryDate'),
            count: d.getDataValue('entryCount'),
        }));

        res.status(200).json({
            success: true,
            data: formatted,
        });
    } catch (error) {
        console.error('Error fetching workload entry dates:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching entry dates',
            error: error.message,
        });
    }
};

// @desc    Get all workload entries for a given date
// @route   GET /api/workload-entries?date=YYYY-MM-DD
exports.getWorkloadEntriesByDate = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, message: 'date query parameter is required (YYYY-MM-DD)' });
        }

        // 1. Get all enrolled workload employees
        const enrolledEmployees = await WorkloadEmployee.findAll({
            where: { status: 'Active' },
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: [
                        'id',
                        'curEmployeeCode',
                        'firstName',
                        'lastName',
                        'dateOfJoining',
                        'experience',
                        'isHostel',
                    ],
                    include: [
                        {
                            model: Department,
                            as: 'department',
                            attributes: ['id', 'departmentname', 'acronym'],
                        },
                        {
                            model: Category,
                            as: 'category',
                            attributes: ['id', 'categoryName', 'categoryCode'],
                        },
                    ],
                },
            ],
            order: [['id', 'ASC']],
        });

        const employeeIds = enrolledEmployees.map((e) => e.employeeId);

        // 2. Fetch existing daily entries for this selected date
        const existingEntries = await WorkloadDailyEntry.findAll({
            where: {
                entryDate: date,
                employeeId: { [Op.in]: employeeIds },
            },
        });

        const currentEntryMap = new Map();
        for (const entry of existingEntries) {
            currentEntryMap.set(entry.employeeId, entry);
        }

        // 3. Previous month boundary check:
        // Any date within the current month must NOT be considered as previous workload.
        // Prv.WL strictly fetches the latest entry strictly BEFORE the 1st day of the selected month.
        const firstDayOfThisMonth = getFirstDayOfCurrentMonth(date);

        const previousEntries = await WorkloadDailyEntry.findAll({
            where: {
                employeeId: { [Op.in]: employeeIds },
                entryDate: { [Op.lt]: firstDayOfThisMonth },
            },
            order: [['entryDate', 'DESC']],
        });

        const prevEntryMap = new Map();
        for (const p of previousEntries) {
            if (!prevEntryMap.has(p.employeeId)) {
                prevEntryMap.set(p.employeeId, p);
            }
        }

        // 4. Format each employee row matching the exact required headers
        const rows = enrolledEmployees.map((item, index) => {
            const emp = item.employee || {};
            const dept = emp.department || {};
            const cat = emp.category || {};
            const fullName = [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim();

            const curEntry = currentEntryMap.get(emp.id);
            const prvEntry = prevEntryMap.get(emp.id);

            // Previous workload and salary
            const prvWl = prvEntry && prvEntry.currentWorkload ? prvEntry.currentWorkload : '-';
            const prvSal = prvEntry && prvEntry.currentSalary ? Number(prvEntry.currentSalary) : '-';

            // Current workload and salary
            const curWl = curEntry && curEntry.currentWorkload ? curEntry.currentWorkload : '-';
            const curSal = curEntry && curEntry.currentSalary !== undefined ? Number(curEntry.currentSalary) : 0;
            const wasteEffi = curEntry && curEntry.wasteEfficiency !== undefined ? Number(curEntry.wasteEfficiency) : 0;
            const targetVal = curEntry && curEntry.target ? curEntry.target : '-';

            return {
                id: curEntry ? curEntry.id : null,
                workloadEmployeeId: item.id,
                employeeId: emp.id,
                slno: index + 1,
                ticketNumber: emp.curEmployeeCode || '-',
                empName: fullName || '-',
                dept: dept.acronym || dept.departmentname || '-',
                category: emp.isHostel ? 'H' : (cat.categoryCode || cat.categoryName || 'O'),
                dateOfJoining: emp.dateOfJoining || '-',
                experience: emp.experience || '-',
                target: targetVal,
                previousWorkload: prvWl,
                previousSalary: prvSal,
                currentWorkload: curWl,
                currentSalary: curSal,
                wasteEfficiency: wasteEffi,
            };
        });

        res.status(200).json({
            success: true,
            date,
            count: rows.length,
            data: rows,
        });
    } catch (error) {
        console.error('Error fetching workload entries:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching workload daily entries',
            error: error.message,
        });
    }
};

// @desc    Batch save or update workload daily entries for a date
// @route   POST /api/workload-entries/save
exports.saveWorkloadEntries = async (req, res) => {
    try {
        const { date, entries } = req.body;

        if (!date) {
            return res.status(400).json({ success: false, message: 'date is required (YYYY-MM-DD)' });
        }

        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ success: false, message: 'entries array is required' });
        }

        let savedCount = 0;

        for (const item of entries) {
            if (!item.employeeId) continue;

            // Find or initialize record for this date and employee
            let record = await WorkloadDailyEntry.findOne({
                where: {
                    entryDate: date,
                    employeeId: item.employeeId,
                },
            });

            const curWl = item.currentWorkload && item.currentWorkload !== '-' ? item.currentWorkload.trim() : null;
            const curSal = item.currentSalary !== undefined && item.currentSalary !== null && item.currentSalary !== '-' ? Number(item.currentSalary) : 0;

            if (record) {
                record.currentWorkload = curWl;
                record.currentSalary = curSal;
                record.wasteEfficiency = 0;
                record.target = '-';
                if (item.workloadMasterId) record.workloadMasterId = item.workloadMasterId;
                await record.save();
                savedCount++;
            } else {
                await WorkloadDailyEntry.create({
                    entryDate: date,
                    employeeId: item.employeeId,
                    workloadMasterId: item.workloadMasterId || null,
                    currentWorkload: curWl,
                    currentSalary: curSal,
                    wasteEfficiency: 0,
                    target: '-',
                });
                savedCount++;
            }
        }

        res.status(200).json({
            success: true,
            message: `Successfully saved ${savedCount} workload entry records for ${date}`,
            count: savedCount,
        });
    } catch (error) {
        console.error('Error saving workload entries:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while saving workload daily entries',
            error: error.message,
        });
    }
};
