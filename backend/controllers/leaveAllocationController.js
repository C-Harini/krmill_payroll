const { LeaveAllocation, Employee, LeaveType, LeavePeriod, Company, Department } = require('../models');
const { Op } = require('sequelize');

// Helper function to handle date values - FIXES THE EMPTY STRING ISSUE
const getValidDate = (dateValue, fallbackDate) => {
    // If dateValue is null, undefined, or empty string, use fallback
    if (!dateValue || dateValue === '') {
        return fallbackDate;
    }
    return dateValue;
};

// @desc    Get all leave allocations for a company
// @route   GET /api/leave-allocations?companyId=1&leavePeriodId=1&departmentId=1&employeeId=1
// @access  Private
exports.getLeaveAllocations = async (req, res) => {
    const { companyId, leavePeriodId, departmentId, employeeId } = req.query;
    
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    try {
        const whereClause = { companyId };
        
        if (leavePeriodId) whereClause.leavePeriodId = leavePeriodId;
        if (employeeId) whereClause.employeeId = employeeId;

        const allocations = await LeaveAllocation.findAll({
            where: whereClause,
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: ['id', 'employeeCode', 'firstName', 'lastName', 'departmentId'],
                    include: [
                        {
                            model: Department,
                            as: 'department',
                            attributes: ['id', 'departmentname'],
                            where: departmentId ? { id: departmentId } : undefined
                        }
                    ]
                },
                {
                    model: LeaveType,
                    as: 'leaveType',
                    attributes: ['id', 'name', 'isCarryForwardEnabled']
                },
                {
                    model: LeavePeriod,
                    as: 'leavePeriod',
                    attributes: ['id', 'name', 'startDate', 'endDate']
                }
            ],
            order: [['employeeId', 'ASC'], ['leaveTypeId', 'ASC']],
        });

        // Add computed fields
        const allocationsWithComputed = allocations.map(alloc => {
            const allocData = alloc.toJSON();
            allocData.totalAvailable = alloc.getTotalAvailable();
            allocData.remainingBalance = alloc.getRemainingBalance();
            allocData.carryForwardNextPeriod = alloc.getCarryForwardForNextPeriod();
            return allocData;
        });

        res.status(200).json(allocationsWithComputed);
    } catch (error) {
        console.error('Error fetching leave allocations:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get single leave allocation by ID
// @route   GET /api/leave-allocations/:id
// @access  Private
exports.getLeaveAllocationById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const allocation = await LeaveAllocation.findByPk(id, {
            include: [
                { model: Employee, as: 'employee' },
                { model: LeaveType, as: 'leaveType' },
                { model: LeavePeriod, as: 'leavePeriod' },
                { model: Company, as: 'company' }
            ]
        });

        if (!allocation) {
            return res.status(404).json({ message: 'Leave Allocation not found' });
        }

        const allocData = allocation.toJSON();
        allocData.totalAvailable = allocation.getTotalAvailable();
        allocData.remainingBalance = allocation.getRemainingBalance();
        allocData.carryForwardNextPeriod = allocation.getCarryForwardForNextPeriod();

        res.status(200).json(allocData);
    } catch (error) {
        console.error('Error fetching leave allocation:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create leave allocation (single or bulk)
// @route   POST /api/leave-allocations
// @access  Private
exports.createLeaveAllocation = async (req, res) => {
    try {
        const { employees, leaveTypeId, leavePeriodId, companyId, ...allocationData } = req.body;

        console.log('=== CREATE ALLOCATION REQUEST ===');
        console.log('Employees:', employees);
        console.log('Leave Type ID:', leaveTypeId);
        console.log('Leave Period ID:', leavePeriodId);
        console.log('Company ID:', companyId);
        console.log('Allocation Data:', allocationData);

        // Validate required fields
        if (!employees || !Array.isArray(employees) || employees.length === 0) {
            return res.status(400).json({ message: 'At least one employee must be selected' });
        }

        if (!leaveTypeId || !leavePeriodId || !companyId) {
            return res.status(400).json({ message: 'Leave Type, Leave Period, and Company are required' });
        }

        // Get leave type and period details
        const leaveType = await LeaveType.findByPk(leaveTypeId);
        const leavePeriod = await LeavePeriod.findByPk(leavePeriodId);

        if (!leaveType || !leavePeriod) {
            return res.status(404).json({ message: 'Leave Type or Leave Period not found' });
        }

        console.log('Leave Period:', leavePeriod.toJSON());

        const results = {
            success: [],
            failed: [],
            total: employees.length
        };

        // Process each employee
        for (const employeeId of employees) {
            try {
                const employee = await Employee.findByPk(employeeId);
                
                if (!employee) {
                    results.failed.push({ employeeId, error: 'Employee not found' });
                    continue;
                }

                // Check for existing allocation
                const existing = await LeaveAllocation.findOne({
                    where: { employeeId, leaveTypeId, leavePeriodId }
                });

                if (existing) {
                    results.failed.push({ 
                        employeeId, 
                        employeeCode: employee.employeeCode,
                        error: 'Allocation already exists for this period' 
                    });
                    continue;
                }

                // Calculate pro-rating if needed
                let allocatedLeaves = parseFloat(allocationData.allocatedLeaves || 0);
                let isProRated = false;
                let proRatedDays = null;

                if (allocationData.applyProRating) {
                    const joiningDate = new Date(employee.dateOfJoining);
                    const periodStart = new Date(leavePeriod.startDate);
                    const periodEnd = new Date(leavePeriod.endDate);

                    if (joiningDate > periodStart) {
                        const totalDays = (periodEnd - periodStart) / (1000 * 60 * 60 * 24);
                        const remainingDays = (periodEnd - joiningDate) / (1000 * 60 * 60 * 24);
                        proRatedDays = (allocatedLeaves / totalDays) * remainingDays;
                        proRatedDays = Math.round(proRatedDays * 2) / 2; // Round to nearest 0.5
                        allocatedLeaves = proRatedDays;
                        isProRated = true;
                    }
                }

                // Get carry forward from previous period if applicable
                let carryForward = 0;
                if (allocationData.applyCarryForward && leaveType.isCarryForwardEnabled) {
                    const prevPeriod = await LeavePeriod.findOne({
                        where: {
                            companyId,
                            endDate: { [Op.lt]: leavePeriod.startDate }
                        },
                        order: [['endDate', 'DESC']]
                    });

                    if (prevPeriod) {
                        const prevAllocation = await LeaveAllocation.findOne({
                            where: { employeeId, leaveTypeId, leavePeriodId: prevPeriod.id }
                        });

                        if (prevAllocation) {
                            carryForward = prevAllocation.getCarryForwardForNextPeriod();
                        }
                    }
                }

                // FIXED: Use helper function to properly handle date values
                const effectiveFrom = getValidDate(allocationData.effectiveFrom, leavePeriod.startDate);
                const effectiveTo = getValidDate(allocationData.effectiveTo, leavePeriod.endDate);
                
                console.log(`Creating allocation for employee ${employee.employeeCode}:`);
                console.log('- Effective From:', effectiveFrom);
                console.log('- Effective To:', effectiveTo);

                // Create allocation
                const allocation = await LeaveAllocation.create({
                    employeeId,
                    leaveTypeId,
                    leavePeriodId,
                    companyId,
                    allocatedLeaves,
                    carryForwardFromPrevious: carryForward,
                    isProRated,
                    proRatedDays,
                    effectiveFrom: effectiveFrom,  // FIXED
                    effectiveTo: effectiveTo,      // FIXED
                    allowNegativeBalance: allocationData.allowNegativeBalance || false,
                    maxNegativeLimit: allocationData.maxNegativeLimit || 0,
                    enableMonthlyAccrual: allocationData.enableMonthlyAccrual || false,
                    monthlyAccrualRate: allocationData.monthlyAccrualRate || null,
                    accrualCondition: allocationData.accrualCondition || null,
                    maxCarryForwardLimit: allocationData.maxCarryForwardLimit || null,
                    carryForwardExpiryDate: allocationData.carryForwardExpiryDate || null,
                    notifyEmployee: allocationData.notifyEmployee !== undefined ? allocationData.notifyEmployee : true,
                    notifyManager: allocationData.notifyManager || false,
                    notes: allocationData.notes || null,
                    status: 'Active'
                });

                console.log(`✅ Successfully created allocation ID: ${allocation.id}`);

                results.success.push({
                    employeeId,
                    employeeCode: employee.employeeCode,
                    allocationId: allocation.id,
                    allocated: allocatedLeaves,
                    carryForward
                });

            } catch (error) {
                console.error(`❌ Error processing employee ${employeeId}:`, error);
                results.failed.push({
                    employeeId,
                    error: error.message
                });
            }
        }

        console.log('=== ALLOCATION RESULTS ===');
        console.log('Success:', results.success.length);
        console.log('Failed:', results.failed.length);

        res.status(201).json({
            message: 'Leave allocation created successfully',
            results
        });

    } catch (error) {
        console.error('Error in createLeaveAllocation:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update leave allocation
// @route   PUT /api/leave-allocations/:id
// @access  Private
exports.updateLeaveAllocation = async (req, res) => {
    const { id } = req.params;
    
    try {
        const allocation = await LeaveAllocation.findByPk(id);
        
        if (!allocation) {
            return res.status(404).json({ message: 'Leave Allocation not found' });
        }

        await allocation.update(req.body);
        
        res.status(200).json(allocation);
    } catch (error) {
        console.error('Error updating leave allocation:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete leave allocation
// @route   DELETE /api/leave-allocations/:id
// @access  Private
exports.deleteLeaveAllocation = async (req, res) => {
    const { id } = req.params;
    
    try {
        const allocation = await LeaveAllocation.findByPk(id);
        
        if (!allocation) {
            return res.status(404).json({ message: 'Leave Allocation not found' });
        }

        // Check if allocation has been used
        if (allocation.usedLeaves > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete allocation that has been partially used' 
            });
        }

        await allocation.destroy();
        
        res.status(200).json({ message: 'Leave Allocation deleted successfully' });
    } catch (error) {
        console.error('Error deleting leave allocation:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Process monthly accrual for all eligible allocations
// @route   POST /api/leave-allocations/process-accrual
// @access  Private (Should be run as cron job)
exports.processMonthlyAccrual = async (req, res) => {
    try {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Find all active allocations with monthly accrual enabled
        const allocations = await LeaveAllocation.findAll({
            where: {
                enableMonthlyAccrual: true,
                status: 'Active',
                effectiveFrom: { [Op.lte]: today },
                effectiveTo: { [Op.gte]: today }
            },
            include: [
                { model: Employee, as: 'employee' }
            ]
        });

        let processed = 0;
        const results = [];

        for (const allocation of allocations) {
            try {
                // Check accrual condition
                let eligible = false;

                if (allocation.accrualCondition === 'first_year') {
                    const joiningDate = new Date(allocation.employee.dateOfJoining);
                    const oneYearLater = new Date(joiningDate);
                    oneYearLater.setFullYear(joiningDate.getFullYear() + 1);
                    eligible = today <= oneYearLater;
                } else if (allocation.accrualCondition === 'all_employees') {
                    eligible = true;
                }

                if (eligible) {
                    const newAccrued = parseFloat(allocation.totalAccruedTillDate) + 
                                     parseFloat(allocation.monthlyAccrualRate);
                    
                    await allocation.update({
                        totalAccruedTillDate: newAccrued
                    });

                    processed++;
                    results.push({
                        employeeId: allocation.employeeId,
                        allocationId: allocation.id,
                        accrued: allocation.monthlyAccrualRate
                    });
                }
            } catch (error) {
                console.error(`Error processing accrual for allocation ${allocation.id}:`, error);
            }
        }

        res.status(200).json({
            message: 'Monthly accrual processed',
            processed,
            results
        });

    } catch (error) {
        console.error('Error processing monthly accrual:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Bulk create leave allocations from Excel upload
// @route   POST /api/leave-allocations/bulk
// @access  Private
exports.bulkCreateLeaveAllocations = async (req, res) => {
    try {
        const { companyId, allocations } = req.body;

        console.log('=== BULK ALLOCATION REQUEST ===');
        console.log('Company ID:', companyId);
        console.log('Number of allocations:', allocations?.length);

        if (!companyId || !allocations || !Array.isArray(allocations) || allocations.length === 0) {
            return res.status(400).json({ message: 'Company ID and allocations array are required' });
        }

        const results = {
            success: [],
            failed: [],
            total: allocations.length
        };

        // Process each allocation
        for (const allocationData of allocations) {
            try {
                const { employeeCode, employeeId, leaveTypeId, leavePeriodId, ...restData } = allocationData;

                console.log(`\nProcessing allocation for employee: ${employeeCode}`);

                // Find employee if not provided
                let empId = employeeId;
                if (!empId && employeeCode) {
                    const employee = await Employee.findOne({
                        where: { employeeCode, companyId }
                    });
                    if (!employee) {
                        results.failed.push({
                            employeeCode,
                            error: 'Employee not found'
                        });
                        continue;
                    }
                    empId = employee.id;
                }

                if (!empId || !leaveTypeId || !leavePeriodId) {
                    results.failed.push({
                        employeeCode,
                        error: 'Missing required fields: employeeId, leaveTypeId, or leavePeriodId'
                    });
                    continue;
                }

                // Check for existing allocation
                const existing = await LeaveAllocation.findOne({
                    where: { employeeId: empId, leaveTypeId, leavePeriodId }
                });

                if (existing) {
                    results.failed.push({
                        employeeCode,
                        error: 'Allocation already exists for this period'
                    });
                    continue;
                }

                // Get employee and period details for pro-rating
                const employee = await Employee.findByPk(empId);
                const leavePeriod = await LeavePeriod.findByPk(leavePeriodId);
                const leaveType = await LeaveType.findByPk(leaveTypeId);

                let allocatedLeaves = parseFloat(restData.allocatedLeaves || 0);
                let isProRated = false;
                let proRatedDays = null;

                // Apply pro-rating if enabled
                if (restData.applyProRating && employee && leavePeriod) {
                    const joiningDate = new Date(employee.dateOfJoining);
                    const periodStart = new Date(leavePeriod.startDate);
                    const periodEnd = new Date(leavePeriod.endDate);

                    if (joiningDate > periodStart) {
                        const totalDays = (periodEnd - periodStart) / (1000 * 60 * 60 * 24);
                        const remainingDays = (periodEnd - joiningDate) / (1000 * 60 * 60 * 24);
                        proRatedDays = (allocatedLeaves / totalDays) * remainingDays;
                        proRatedDays = Math.round(proRatedDays * 2) / 2;
                        allocatedLeaves = proRatedDays;
                        isProRated = true;
                    }
                }

                // Calculate carry forward if enabled
                let carryForward = 0;
                if (restData.applyCarryForward && leaveType?.isCarryForwardEnabled) {
                    const prevPeriod = await LeavePeriod.findOne({
                        where: {
                            companyId,
                            endDate: { [Op.lt]: leavePeriod.startDate }
                        },
                        order: [['endDate', 'DESC']]
                    });

                    if (prevPeriod) {
                        const prevAllocation = await LeaveAllocation.findOne({
                            where: { employeeId: empId, leaveTypeId, leavePeriodId: prevPeriod.id }
                        });

                        if (prevAllocation) {
                            carryForward = prevAllocation.getCarryForwardForNextPeriod();
                        }
                    }
                }

                // FIXED: Use helper function to properly handle date values
                const effectiveFrom = getValidDate(restData.effectiveFrom, leavePeriod.startDate);
                const effectiveTo = getValidDate(restData.effectiveTo, leavePeriod.endDate);

                // Create allocation
                const allocation = await LeaveAllocation.create({
                    employeeId: empId,
                    leaveTypeId,
                    leavePeriodId,
                    companyId,
                    allocatedLeaves,
                    carryForwardFromPrevious: carryForward,
                    isProRated,
                    proRatedDays,
                    effectiveFrom: effectiveFrom,  // FIXED
                    effectiveTo: effectiveTo,      // FIXED
                    allowNegativeBalance: restData.allowNegativeBalance || false,
                    maxNegativeLimit: restData.maxNegativeLimit || 0,
                    enableMonthlyAccrual: restData.enableMonthlyAccrual || false,
                    monthlyAccrualRate: restData.monthlyAccrualRate || null,
                    maxCarryForwardLimit: restData.maxCarryForwardLimit || null,
                    carryForwardExpiryDate: restData.carryForwardExpiryDate || null,
                    notifyEmployee: restData.notifyEmployee !== undefined ? restData.notifyEmployee : true,
                    notifyManager: restData.notifyManager || false,
                    notes: restData.notes || null,
                    status: 'Active'
                });

                console.log(`✅ Created allocation ID: ${allocation.id}`);

                results.success.push({
                    employeeCode,
                    employeeId: empId,
                    allocationId: allocation.id,
                    allocated: allocatedLeaves,
                    carryForward
                });

            } catch (error) {
                console.error(`❌ Error processing ${allocationData.employeeCode}:`, error);
                results.failed.push({
                    employeeCode: allocationData.employeeCode,
                    error: error.message
                });
            }
        }

        console.log('=== BULK ALLOCATION RESULTS ===');
        console.log('Success:', results.success.length);
        console.log('Failed:', results.failed.length);

        res.status(201).json({
            message: 'Bulk leave allocation completed',
            results
        });

    } catch (error) {
        console.error('Error in bulk leave allocation:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get leave balance report
// @route   GET /api/leave-allocations/reports/balance
// @access  Private
exports.getLeaveBalanceReport = async (req, res) => {
    const { companyId, leavePeriodId, departmentId } = req.query;

    if (!companyId || !leavePeriodId) {
        return res.status(400).json({ message: 'Company ID and Leave Period ID are required' });
    }

    try {
        const whereClause = { companyId, leavePeriodId };

        const allocations = await LeaveAllocation.findAll({
            where: whereClause,
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: ['id', 'employeeCode', 'firstName', 'lastName'],
                    include: [
                        {
                            model: Department,
                            as: 'department',
                            attributes: ['id', 'name'],
                            where: departmentId ? { id: departmentId } : undefined
                        }
                    ]
                },
                {
                    model: LeaveType,
                    as: 'leaveType',
                    attributes: ['id', 'name']
                }
            ],
            order: [['employeeId', 'ASC']]
        });

        const report = allocations.map(alloc => ({
            employeeCode: alloc.employee.employeeCode,
            employeeName: alloc.employee.firstName,
            department: alloc.employee.department.name,
            leaveType: alloc.leaveType.name,
            allocated: alloc.allocatedLeaves,
            carryForward: alloc.carryForwardFromPrevious,
            totalAvailable: alloc.getTotalAvailable(),
            used: alloc.usedLeaves,
            balance: alloc.getRemainingBalance(),
            status: alloc.getRemainingBalance() < 3 ? 'Low' : 'OK'
        }));

        res.status(200).json(report);
    } catch (error) {
        console.error('Error generating balance report:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
