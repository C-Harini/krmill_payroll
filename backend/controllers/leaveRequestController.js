const { 
    LeaveRequest, 
    LeaveApproval, 
    LeaveRequestHistory,
    LeaveAllocation,
    LeaveType,
    Employee,
    Company,
    Designation,
    sequelize
} = require('../models');
const { Op } = require('sequelize');

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate working days between two dates (excluding weekends)
 */
const calculateWorkingDays = (startDate, endDate) => {
    let count = 0;
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
};

/**
 * Check if employee has overlapping leave requests
 */
const checkOverlappingLeaves = async (employeeId, startDate, endDate, excludeRequestId = null) => {
    const where = {
        employeeId,
        status: { [Op.in]: ['Pending', 'Approved'] },
        [Op.or]: [
            {
                startDate: { [Op.between]: [startDate, endDate] }
            },
            {
                endDate: { [Op.between]: [startDate, endDate] }
            },
            {
                [Op.and]: [
                    { startDate: { [Op.lte]: startDate } },
                    { endDate: { [Op.gte]: endDate } }
                ]
            }
        ]
    };
    
    if (excludeRequestId) {
        where.id = { [Op.ne]: excludeRequestId };
    }
    
    const overlapping = await LeaveRequest.findOne({ where });
    return overlapping;
};

/**
 * Get approver chain for an employee
 */
const getApproverChain = async (employeeId) => {
    const employee = await Employee.findByPk(employeeId, {
        include: [{
            model: Employee,
            as: 'reportingManager',
            required: false
        }]
    });
    
    const approvers = [];
    
    // Level 1: Reporting Manager
    if (employee && employee.reportingManagerId) {
        approvers.push({
            level: 1,
            approverId: employee.reportingManagerId,
            role: 'Reporting Manager'
        });
    }

    // Fallback: If no reporting manager is assigned, find a default approver
    if (approvers.length === 0) {
        // Find first active employee with designation containing 'HR' or 'Manager' (excluding the requester)
        const fallbackEmployee = await Employee.findOne({
            where: {
                status: 'Active',
                id: { [Op.ne]: employeeId }
            },
            include: [{
                model: Designation,
                as: 'designation',
                where: {
                    name: {
                        [Op.or]: [
                            { [Op.like]: '%HR%' },
                            { [Op.like]: '%hr%' },
                            { [Op.like]: '%Manager%' },
                            { [Op.like]: '%manager%' }
                        ]
                    }
                }
            }]
        });

        if (fallbackEmployee) {
            approvers.push({
                level: 1,
                approverId: fallbackEmployee.id,
                role: 'System Fallback Approver (HR/Manager)'
            });
        } else {
            // Absolute fallback: Find the first active employee that is not the requester
            const absoluteFallback = await Employee.findOne({
                where: {
                    status: 'Active',
                    id: { [Op.ne]: employeeId }
                },
                order: [['id', 'ASC']]
            });

            if (absoluteFallback) {
                approvers.push({
                    level: 1,
                    approverId: absoluteFallback.id,
                    role: 'System Fallback Approver'
                });
            }
        }
    }
    
    return approvers;
};

// ============================================
// CREATE LEAVE REQUEST
// ============================================

exports.createLeaveRequest = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const {
            employeeId,
            leaveTypeId,
            startDate,
            endDate,
            leaveCategory,
            halfDayType,
            reason,
            contactDuringLeave,
            addressDuringLeave,
            documentPaths,
            companyId,
            submitImmediately = false
        } = req.body;

        // Validate dates
        if (new Date(startDate) < new Date().setHours(0, 0, 0, 0)) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Cannot apply for leave in the past' });
        }

        // Check for overlapping leaves
        const overlapping = await checkOverlappingLeaves(employeeId, startDate, endDate);
        if (overlapping) {
            await transaction.rollback();
            return res.status(400).json({ 
                message: 'You already have a leave request for overlapping dates',
                overlappingRequest: overlapping
            });
        }

        // Calculate total days
        let totalDays;
        if (leaveCategory === 'Half Day') {
            totalDays = 0.5;
        } else if (leaveCategory === 'Short Leave') {
            totalDays = 0.25;
        } else {
            totalDays = calculateWorkingDays(startDate, endDate);
        }

        // Get leave allocation and check balance
        const allocation = await LeaveAllocation.findOne({
            where: {
                employeeId,
                leaveTypeId,
                status: 'Active'
            }
        });

        if (!allocation) {
            await transaction.rollback();
            return res.status(400).json({ 
                message: 'No active leave allocation found for this leave type' 
            });
        }

        // Calculate available balance properly
        const totalAllocated = parseFloat(allocation.allocatedLeaves) + parseFloat(allocation.carryForwardFromPrevious || 0);
        const usedLeaves = parseFloat(allocation.usedLeaves || 0);
        const availableBalance = totalAllocated - usedLeaves;

        if (totalDays > availableBalance) {
            await transaction.rollback();
            return res.status(400).json({ 
                message: `Insufficient leave balance. You have ${availableBalance} days available, but requesting ${totalDays} days.`
            });
        }

        // Get leave type details
        const leaveType = await LeaveType.findByPk(leaveTypeId);
        if (!leaveType) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Invalid leave type' });
        }

        if (leaveType.status !== 'Active') {
            await transaction.rollback();
            return res.status(400).json({ message: 'This leave type is not active' });
        }

        // Check max consecutive days
        if (leaveType.maxConsecutiveLeaves && leaveType.maxConsecutiveLeaves > 0 && totalDays > leaveType.maxConsecutiveLeaves) {
            await transaction.rollback();
            return res.status(400).json({ 
                message: `Maximum ${leaveType.maxConsecutiveLeaves} consecutive days allowed for this leave type` 
            });
        }

        // Validate reason
        if (!reason || reason.trim().length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Reason for leave is required' });
        }

        // Get approver chain
        const approvers = await getApproverChain(employeeId);
        const maxApprovalLevel = approvers.length;

        // Create leave request
        const leaveRequest = await LeaveRequest.create({
            employeeId,
            leaveTypeId,
            leaveAllocationId: allocation.id,
            companyId,
            startDate,
            endDate,
            totalDays,
            leaveCategory,
            halfDayType: leaveCategory === 'Half Day' ? halfDayType : null,
            reason,
            contactDuringLeave,
            addressDuringLeave,
            hasDocuments: documentPaths && documentPaths.length > 0,
            documentPaths,
            status: submitImmediately ? 'Pending' : 'Draft',
            currentApprovalLevel: submitImmediately ? 1 : 0,
            maxApprovalLevel,
            appliedDate: submitImmediately ? new Date() : null,
            createdBy: employeeId
        }, { transaction });

        // If submitting immediately
        if (submitImmediately) {
            // Create approval records
            for (const approver of approvers) {
                await LeaveApproval.create({
                    leaveRequestId: leaveRequest.id,
                    approverId: approver.approverId,
                    approverLevel: approver.level,
                    approverRole: approver.role,
                    status: 'Pending',
                    companyId
                }, { transaction });
            }

            // Update allocation
            allocation.usedLeaves = usedLeaves + totalDays;
            await allocation.save({ transaction });

            // Log history
            await LeaveRequestHistory.create({
                leaveRequestId: leaveRequest.id,
                action: 'Submitted',
                actionBy: employeeId,
                oldStatus: 'Draft',
                newStatus: 'Pending',
                comments: 'Leave request submitted for approval',
                companyId,
            }, { transaction });
        } else {
            // Log history for draft
            await LeaveRequestHistory.create({
                leaveRequestId: leaveRequest.id,
                action: 'Created',
                actionBy: employeeId,
                newStatus: 'Draft',
                comments: 'Leave request created as draft',
                companyId,
            }, { transaction });
        }

        await transaction.commit();

        // Fetch complete request
        const completeRequest = await LeaveRequest.findByPk(leaveRequest.id, {
            include: [
                { model: Employee, as: 'Employee', attributes: ['id', 'firstName', 'lastName', 'officialEmail'] },
                { model: LeaveType, attributes: ['id', 'name', 'isPaid'] },
                { model: LeaveApproval, include: [{ model: Employee, as: 'Approver' }] }
            ]
        });

        res.status(201).json({
            message: submitImmediately ? 'Leave request submitted successfully' : 'Leave request saved as draft',
            leaveRequest: completeRequest
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error creating leave request:', error);
        res.status(500).json({ 
            message: 'Error creating leave request', 
            error: error.message 
        });
    }
};

// ============================================
// GET LEAVE REQUESTS (WITH FILTERS)
// ============================================

exports.getLeaveRequests = async (req, res) => {
  try {
    const { status } = req.query;

    const where = { 
      isDeleted: false,
      status: { [Op.ne]: 'Cancelled' }
    };
    if (status && status !== 'All') {
      where.status = status;
    }

    const leaves = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: Employee,
          as: 'Employee',
          attributes: ['id', 'firstName', 'lastName', 'employeeCode']
        },
        {
          model: LeaveType,
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(leaves); // ✅ ARRAY ONLY

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch leave requests'
    });
  }
};


// ============================================
// GET SINGLE LEAVE REQUEST
// ============================================

exports.getLeaveRequestById = async (req, res) => {
    try {
        const { id } = req.params;

        const leaveRequest = await LeaveRequest.findOne({
            where: { id, isDeleted: false },
            include: [
                { 
                    model: Employee, 
                    as: 'Employee', 
                    attributes: ['id', 'firstName', 'lastName', 'officialEmail', 'employeeCode'] 
                },
                { 
                    model: LeaveType, 
                    attributes: ['id', 'name', 'isPaid', 'description'] 
                },
                { 
                    model: LeaveAllocation, 
                    attributes: ['id', 'allocatedLeaves', 'usedLeaves', 'carryForwardFromPrevious'] 
                },
                {
                    model: LeaveApproval,
                    include: [{
                        model: Employee,
                        as: 'Approver',
                        attributes: ['id', 'firstName', 'lastName', 'officialEmail']
                    }],
                    order: [['approverLevel', 'ASC']]
                },
                {
                    model: LeaveRequestHistory,
                    include: [{
                        model: Employee,
                        as: 'ActionBy',
                        attributes: ['id', 'firstName', 'lastName']
                    }],
                    order: [['actionDate', 'DESC']]
                }
            ]
        });

        if (!leaveRequest) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        res.status(200).json(leaveRequest);

    } catch (error) {
        console.error('Error fetching leave request:', error);
        res.status(500).json({ 
            message: 'Error fetching leave request', 
            error: error.message 
        });
    }
};

// ============================================
// UPDATE LEAVE REQUEST (DRAFT ONLY)
// ============================================

exports.updateLeaveRequest = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const updates = req.body;

        const leaveRequest = await LeaveRequest.findOne({
            where: { id, isDeleted: false }
        });

        if (!leaveRequest) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Leave request not found' });
        }

        if (leaveRequest.status !== 'Draft') {
            await transaction.rollback();
            return res.status(400).json({ 
                message: 'Only draft leave requests can be edited' 
            });
        }

        // Recalculate total days if dates changed
        if (updates.startDate || updates.endDate || updates.leaveCategory) {
            const startDate = updates.startDate || leaveRequest.startDate;
            const endDate = updates.endDate || leaveRequest.endDate;
            const category = updates.leaveCategory || leaveRequest.leaveCategory;

            if (category === 'Half Day') {
                updates.totalDays = 0.5;
            } else if (category === 'Short Leave') {
                updates.totalDays = 0.25;
            } else {
                updates.totalDays = calculateWorkingDays(startDate, endDate);
            }
        }

        await leaveRequest.update(updates, { transaction });

        // Log history
        await LeaveRequestHistory.create({
            leaveRequestId: leaveRequest.id,
            action: 'Modified',
            actionBy: updates.updatedBy || leaveRequest.employeeId,
            oldStatus: 'Draft',
            newStatus: 'Draft',
            comments: 'Leave request modified',
            companyId: leaveRequest.companyId,
        }, { transaction });

        await transaction.commit();

        const updatedRequest = await LeaveRequest.findByPk(id, {
            include: [
                { model: Employee, as: 'Employee' },
                { model: LeaveType }
            ]
        });

        res.status(200).json({
            message: 'Leave request updated successfully',
            leaveRequest: updatedRequest
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error updating leave request:', error);
        res.status(500).json({ 
            message: 'Error updating leave request', 
            error: error.message 
        });
    }
};

// ============================================
// SUBMIT DRAFT FOR APPROVAL
// ============================================

exports.submitLeaveRequest = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { submittedBy } = req.body;

        const leaveRequest = await LeaveRequest.findOne({
            where: { id, isDeleted: false },
            include: [{ model: LeaveAllocation }]
        });

        if (!leaveRequest) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Leave request not found' });
        }

        if (leaveRequest.status !== 'Draft') {
            await transaction.rollback();
            return res.status(400).json({ 
                message: 'Only draft requests can be submitted' 
            });
        }

        // Check balance again
        const allocation = leaveRequest.LeaveAllocation;
        const totalAllocated = parseFloat(allocation.allocatedLeaves) + parseFloat(allocation.carryForwardFromPrevious || 0);
        const usedLeaves = parseFloat(allocation.usedLeaves || 0);
        const availableBalance = totalAllocated - usedLeaves;
        
        if (leaveRequest.totalDays > availableBalance) {
            await transaction.rollback();
            return res.status(400).json({ 
                message: `Insufficient balance. Available: ${availableBalance} days` 
            });
        }

        // Get approver chain
        const approvers = await getApproverChain(leaveRequest.employeeId);
        
        if (approvers.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ 
                message: 'No approvers found for this employee' 
            });
        }

        // Update request status
        await leaveRequest.update({
            status: 'Pending',
            currentApprovalLevel: 1,
            maxApprovalLevel: approvers.length,
            appliedDate: new Date(),
            submittedBy: submittedBy || leaveRequest.employeeId
        }, { transaction });

        // Create approval records
        for (const approver of approvers) {
            await LeaveApproval.create({
                leaveRequestId: leaveRequest.id,
                approverId: approver.approverId,
                approverLevel: approver.level,
                approverRole: approver.role,
                status: 'Pending',
                companyId: leaveRequest.companyId
            }, { transaction });
        }

        // Update allocation
        allocation.usedLeaves = usedLeaves + parseFloat(leaveRequest.totalDays);
        await allocation.save({ transaction });

        // Log history
        await LeaveRequestHistory.create({
            leaveRequestId: leaveRequest.id,
            action: 'Submitted',
            actionBy: submittedBy || leaveRequest.employeeId,
            oldStatus: 'Draft',
            newStatus: 'Pending',
            comments: 'Leave request submitted for approval',
            companyId: leaveRequest.companyId,
        }, { transaction });

        await transaction.commit();

        res.status(200).json({
            message: 'Leave request submitted successfully',
            leaveRequest: await LeaveRequest.findByPk(id, {
                include: [
                    { model: Employee, as: 'Employee' },
                    { model: LeaveType },
                    { model: LeaveApproval }
                ]
            })
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error submitting leave request:', error);
        res.status(500).json({ 
            message: 'Error submitting leave request', 
            error: error.message 
        });
    }
};

// ============================================
// APPROVE/REJECT LEAVE REQUEST
// ============================================


exports.processLeaveApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comments } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const leave = await LeaveRequest.findByPk(id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending requests allowed' });
    }

    leave.status = action === 'approve' ? 'Approved' : 'Rejected';
    leave.rejectionReason = action === 'reject' ? comments : null;
    await leave.save();

    res.status(200).json({
      message: `Leave ${action}d successfully`
    });

  } catch (err) {
    res.status(500).json({ message: 'Approval failed' });
  }
};





exports.getAllLeaveRequests = async (req, res) => {
  try {
    const { status } = req.query; // Pending | Approved | Rejected

    const whereCondition = {};
    if (status) {
      whereCondition.status = status;
    }

    const leaves = await LeaveRequest.findAll({
      where: whereCondition,
      include: [
        {
          model: Employee,
          as: 'Employee',
          attributes: ['id', 'firstName', 'lastName', 'employeeCode']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: leaves
    });

  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave requests'
    });
  }
};

// ============================================
// CANCEL LEAVE REQUEST
// ============================================

exports.cancelLeaveRequest = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { cancelledBy, cancellationReason } = req.body;

        const leaveRequest = await LeaveRequest.findOne({
            where: { id, isDeleted: false },
            include: [{ model: LeaveAllocation }]
        });

        if (!leaveRequest) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Leave request not found' });
        }

        if (!['Pending', 'Approved'].includes(leaveRequest.status)) {
            await transaction.rollback();
            return res.status(400).json({ 
                message: 'Only pending or approved requests can be cancelled' 
            });
        }

        const oldStatus = leaveRequest.status;

        await leaveRequest.update({
            status: 'Cancelled',
            cancelledBy: cancelledBy || leaveRequest.employeeId,
            cancelledAt: new Date(),
            cancellationReason
        }, { transaction });

        // Restore balance
        if (oldStatus === 'Pending' || oldStatus === 'Approved') {
            const allocation = leaveRequest.LeaveAllocation;
            allocation.usedLeaves = parseFloat(allocation.usedLeaves) - parseFloat(leaveRequest.totalDays);
            await allocation.save({ transaction });
        }

        // Update pending approvals
        await LeaveApproval.update(
            { status: 'Skipped' },
            { 
                where: { 
                    leaveRequestId: id, 
                    status: 'Pending' 
                },
                transaction 
            }
        );

        // Log history
        await LeaveRequestHistory.create({
            leaveRequestId: id,
            action: 'Cancelled',
            actionBy: cancelledBy || leaveRequest.employeeId,
            oldStatus,
            newStatus: 'Cancelled',
            comments: cancellationReason || 'Leave request cancelled',
            companyId: leaveRequest.companyId,
        }, { transaction });

        await transaction.commit();

        res.status(200).json({
            message: 'Leave request cancelled successfully',
            leaveRequest: await LeaveRequest.findByPk(id, {
                include: [
                    { model: Employee, as: 'Employee' },
                    { model: LeaveApproval }
                ]
            })
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error cancelling leave request:', error);
        res.status(500).json({ 
            message: 'Error cancelling leave request', 
            error: error.message 
        });
    }
};

// ============================================
// DELETE LEAVE REQUEST (SOFT DELETE)
// ============================================

exports.deleteLeaveRequest = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { deletedBy } = req.body;

        const leaveRequest = await LeaveRequest.findOne({
            where: { id, isDeleted: false }
        });

        if (!leaveRequest) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Leave request not found' });
        }

        if (!['Draft', 'Rejected', 'Cancelled'].includes(leaveRequest.status)) {
            await transaction.rollback();
            return res.status(400).json({ 
                message: 'Only draft, rejected, or cancelled requests can be deleted' 
            });
        }

        await leaveRequest.update({ isDeleted: true }, { transaction });

        await LeaveRequestHistory.create({
            leaveRequestId: id,
            action: 'Deleted',
            actionBy: deletedBy || leaveRequest.employeeId,
            oldStatus: leaveRequest.status,
            newStatus: 'Deleted',
            comments: 'Leave request deleted',
            companyId: leaveRequest.companyId,
        }, { transaction });

        await transaction.commit();

        res.status(200).json({ message: 'Leave request deleted successfully' });

    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting leave request:', error);
        res.status(500).json({ 
            message: 'Error deleting leave request', 
            error: error.message 
        });
    }
};

// ============================================
// GET PENDING APPROVALS FOR APPROVER
// ============================================

exports.getPendingApprovals = async (req, res) => {
    try {
        const { approverId, companyId } = req.query;

        if (!approverId) {
            return res.status(400).json({ message: 'Approver ID is required' });
        }

        const pendingApprovals = await LeaveApproval.findAll({
            where: {
                approverId,
                status: 'Pending'
            },
            include: [{
                model: LeaveRequest,
                where: {
                    status: 'Pending',
                    isDeleted: false,
                    ...(companyId && { companyId })
                },
                include: [
                    { 
                        model: Employee, 
                        as: 'Employee',
                        attributes: ['id', 'firstName', 'lastName', 'officialEmail', 'employeeCode', 'designation']
                    },
                    { 
                        model: LeaveType,
                        attributes: ['id', 'name', 'isPaid']
                    }
                ]
            }],
            order: [[LeaveRequest, 'appliedDate', 'ASC']]
        });

        const filteredApprovals = pendingApprovals.filter(approval => {
            return approval.LeaveRequest.currentApprovalLevel === approval.approverLevel;
        });

        res.status(200).json({
            total: filteredApprovals.length,
            approvals: filteredApprovals
        });

    } catch (error) {
        console.error('Error fetching pending approvals:', error);
        res.status(500).json({ 
            message: 'Error fetching pending approvals', 
            error: error.message 
        });
    }
};

// ============================================
// GET TEAM LEAVE CALENDAR
// ============================================

exports.getTeamLeaveCalendar = async (req, res) => {
    try {
        const { companyId, departmentId, startDate, endDate } = req.query;

        const where = {
            status: { [Op.in]: ['Pending', 'Approved'] },
            isDeleted: false,
            startDate: { [Op.lte]: endDate },
            endDate: { [Op.gte]: startDate }
        };

        if (companyId) where.companyId = companyId;

        const leaveRequests = await LeaveRequest.findAll({
            where,
            include: [
                { 
                    model: Employee, 
                    as: 'Employee',
                    attributes: ['id', 'firstName', 'lastName', 'employeeCode', 'departmentId'],
                    ...(departmentId && {
                        where: { departmentId }
                    })
                },
                { 
                    model: LeaveType,
                    attributes: ['id', 'name']
                }
            ],
            order: [['startDate', 'ASC']]
        });

        res.status(200).json({
            total: leaveRequests.length,
            calendar: leaveRequests
        });

    } catch (error) {
        console.error('Error fetching team calendar:', error);
        res.status(500).json({ 
            message: 'Error fetching team calendar', 
            error: error.message 
        });
    }
};

// ============================================
// GET EMPLOYEE LEAVE SUMMARY
// ============================================

exports.getEmployeeLeaveSummary = async (req, res) => {
    try {
        const { employeeId, year } = req.query;

        if (!employeeId) {
            return res.status(400).json({ message: 'Employee ID is required' });
        }

        const currentYear = year || new Date().getFullYear();

        // Get all allocations for the employee
        const allocations = await LeaveAllocation.findAll({
            where: {
                employeeId,
                status: 'Active'
            },
            include: [{
                model: LeaveType,
                as: 'leaveType',
                attributes: ['id', 'name', 'isPaid']
            }]
        });

        // Get leave requests for the year
        const leaveRequests = await LeaveRequest.findAll({
            where: {
                employeeId,
                isDeleted: false,
                startDate: {
                    [Op.gte]: `${currentYear}-01-01`,
                    [Op.lte]: `${currentYear}-12-31`
                }
            },
            include: [{
                model: LeaveType,
                attributes: ['id', 'name']
            }],
            order: [['startDate', 'DESC']]
        });

        // Calculate summary
        const summary = allocations.map(allocation => {
            const requests = leaveRequests.filter(req => req.leaveTypeId === allocation.leaveTypeId);
            const approved = requests.filter(req => req.status === 'Approved');
            const pending = requests.filter(req => req.status === 'Pending');

            // Calculate proper balance
            const totalAllocated = parseFloat(allocation.allocatedLeaves) + parseFloat(allocation.carryForwardFromPrevious || 0);
            const used = parseFloat(allocation.usedLeaves || 0);
            const available = totalAllocated - used;

            return {
                leaveType: allocation.leaveType,
                allocated: totalAllocated,
                used: used,
                available: available,
                pending: pending.reduce((sum, req) => sum + parseFloat(req.totalDays), 0),
                requests: {
                    total: requests.length,
                    approved: approved.length,
                    pending: pending.length,
                    rejected: requests.filter(req => req.status === 'Rejected').length
                }
            };
        });

        res.status(200).json({
            employeeId,
            year: currentYear,
            summary,
            recentRequests: leaveRequests.slice(0, 10)
        });

    } catch (error) {
        console.error('Error fetching employee leave summary:', error);
        res.status(500).json({ 
            message: 'Error fetching employee leave summary', 
            error: error.message 
        });
    }
};