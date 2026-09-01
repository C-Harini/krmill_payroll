const { ShiftAssignment, Employee, ShiftType, Company } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

// Helper function to generate dates based on recurring pattern
const generateRecurringDates = (startDate, endDate, pattern, recurringDays = null) => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
        if (pattern === 'daily') {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        } else if (pattern === 'weekly' && recurringDays && recurringDays.length > 0) {
            const dayOfWeek = currentDate.getDay();
            if (recurringDays.includes(dayOfWeek)) {
                dates.push(new Date(currentDate));
            }
            currentDate.setDate(currentDate.getDate() + 1);
        } else if (pattern === 'monthly') {
            dates.push(new Date(currentDate));
            currentDate.setMonth(currentDate.getMonth() + 1);
        } else {
            break;
        }
    }
    
    return dates;
};

// @desc    Get all shift assignments for a company
// @route   GET /api/shift-assignments?companyId=1&startDate=2024-01-01&endDate=2024-01-31
// @access  Private
exports.getShiftAssignments = async (req, res) => {
    const { companyId, startDate, endDate, employeeId, shiftTypeId, status } = req.query;
    
    if (!companyId) {
        return res.status(400).json({ message: 'Company ID is required' });
    }

    try {
        const whereClause = { companyId };
        
        if (startDate && endDate) {
            whereClause.assignmentDate = {
                [Op.between]: [startDate, endDate]
            };
        } else if (startDate) {
            whereClause.assignmentDate = { [Op.gte]: startDate };
        } else if (endDate) {
            whereClause.assignmentDate = { [Op.lte]: endDate };
        }
        
        if (employeeId) whereClause.employeeId = employeeId;
        if (shiftTypeId) whereClause.shiftTypeId = shiftTypeId;
        if (status) whereClause.status = status;

        const assignments = await ShiftAssignment.findAll({
            where: whereClause,
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: ['id', 'firstName', 'lastName', 'employeeCode'],
                },
                {
                    model: ShiftType,
                    as: 'shiftType',
                    attributes: ['id', 'name', 'startTime', 'endTime'],
                },
            ],
            order: [['assignmentDate', 'DESC'], ['id', 'DESC']],
        });
        
        res.status(200).json(assignments);
    } catch (error) {
        console.error('Error fetching shift assignments:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get shift assignment by ID
// @route   GET /api/shift-assignments/:id
// @access  Private
exports.getShiftAssignmentById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const assignment = await ShiftAssignment.findByPk(id, {
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: ['id', 'firstName', 'lastName', 'employeeCode'],
                },
                {
                    model: ShiftType,
                    as: 'shiftType',
                    attributes: ['id', 'name', 'startTime', 'endTime'],
                },
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name'],
                }
            ],
        });
        
        if (!assignment) {
            return res.status(404).json({ message: 'Shift Assignment not found' });
        }
        
        res.status(200).json(assignment);
    } catch (error) {
        console.error('Error fetching shift assignment:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create shift assignment(s)
// @route   POST /api/shift-assignments
// @access  Private
exports.createShiftAssignment = async (req, res) => {
    const {
        employeeIds, // Array of employee IDs for bulk assignment
        shiftTypeId,
        assignmentDate,
        startDate,
        endDate,
        isRecurring,
        recurringPattern,
        recurringDays,
        companyId,
        notes,
        overrideExisting, // Boolean to override existing assignments
    } = req.body;

    try {
        const employees = Array.isArray(employeeIds) ? employeeIds : [employeeIds];
        const createdAssignments = [];
        const errors = [];

        for (const employeeId of employees) {
            if (isRecurring && startDate && endDate) {
                // Generate recurring dates
                const dates = generateRecurringDates(startDate, endDate, recurringPattern, recurringDays);
                
                for (const date of dates) {
                    const dateStr = date.toISOString().split('T')[0];
                    
                    try {
                        // Check if assignment exists
                        const existing = await ShiftAssignment.findOne({
                            where: { employeeId, assignmentDate: dateStr },
                            include: [{ model: ShiftType, as: 'shiftType' }]
                        });

                        if (existing) {
                            // Check if the current shift is not completed yet!
                            const now = moment();
                            const extShift = existing.shiftType;
                            if (extShift && extShift.startTime && extShift.endTime) {
                                const startStr = dateStr + 'T' + extShift.startTime;
                                const endStr = dateStr + 'T' + extShift.endTime;
                                let startDT = moment(startStr, 'YYYY-MM-DDTHH:mm:ss');
                                let endDT = moment(endStr, 'YYYY-MM-DDTHH:mm:ss');
                                if (endDT.isBefore(startDT)) {
                                    endDT.add(1, 'day');
                                }
                                
                                if (now.isBefore(endDT)) {
                                    errors.push({
                                        employeeId,
                                        date: dateStr,
                                        message: `Cannot assign shift: Current assigned shift (${extShift.name}: ${extShift.startTime} - ${extShift.endTime}) is still active and has not completed yet.`
                                    });
                                    continue;
                                }
                            }
                        }

                        if (existing && !overrideExisting) {
                            errors.push({
                                employeeId,
                                date: dateStr,
                                message: 'Assignment already exists'
                            });
                            continue;
                        }

                        if (existing && overrideExisting) {
                            await existing.update({
                                shiftTypeId,
                                isRecurring,
                                recurringPattern,
                                recurringDays,
                                startDate,
                                endDate,
                                notes,
                                status: 'Active',
                            });
                            createdAssignments.push(existing);
                        } else {
                            const assignment = await ShiftAssignment.create({
                                employeeId,
                                shiftTypeId,
                                assignmentDate: dateStr,
                                startDate,
                                endDate,
                                isRecurring,
                                recurringPattern,
                                recurringDays,
                                companyId,
                                notes,
                                status: 'Active',
                            });
                            createdAssignments.push(assignment);
                        }
                    } catch (err) {
                        errors.push({
                            employeeId,
                            date: dateStr,
                            message: err.message
                        });
                    }
                }
            } else {
                // Single date assignment
                try {
                    const existing = await ShiftAssignment.findOne({
                        where: { employeeId, assignmentDate },
                        include: [{ model: ShiftType, as: 'shiftType' }]
                    });

                    if (existing) {
                        // Check if the current shift is not completed yet!
                        const now = moment();
                        const extShift = existing.shiftType;
                        if (extShift && extShift.startTime && extShift.endTime) {
                            const startStr = assignmentDate + 'T' + extShift.startTime;
                            const endStr = assignmentDate + 'T' + extShift.endTime;
                            let startDT = moment(startStr, 'YYYY-MM-DDTHH:mm:ss');
                            let endDT = moment(endStr, 'YYYY-MM-DDTHH:mm:ss');
                            if (endDT.isBefore(startDT)) {
                                endDT.add(1, 'day');
                            }
                            
                            if (now.isBefore(endDT)) {
                                errors.push({
                                    employeeId,
                                    date: assignmentDate,
                                    message: `Cannot assign shift: Current assigned shift (${extShift.name}: ${extShift.startTime} - ${extShift.endTime}) is still active and has not completed yet.`
                                });
                                continue;
                            }
                        }
                    }

                    if (existing && !overrideExisting) {
                        errors.push({
                            employeeId,
                            date: assignmentDate,
                            message: 'Assignment already exists'
                        });
                        continue;
                    }

                    if (existing && overrideExisting) {
                        await existing.update({
                            shiftTypeId,
                            notes,
                            status: 'Active',
                        });
                        createdAssignments.push(existing);
                    } else {
                        const assignment = await ShiftAssignment.create({
                            employeeId,
                            shiftTypeId,
                            assignmentDate,
                            companyId,
                            notes,
                            isRecurring: false,
                            status: 'Active',
                        });
                        createdAssignments.push(assignment);
                    }
                } catch (err) {
                    errors.push({
                        employeeId,
                        date: assignmentDate,
                        message: err.message
                    });
                }
            }
        }

        res.status(201).json({
            message: `Created ${createdAssignments.length} assignment(s)`,
            assignments: createdAssignments,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error) {
        console.error('Error creating shift assignments:', error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update shift assignment
// @route   PUT /api/shift-assignments/:id
// @access  Private
exports.updateShiftAssignment = async (req, res) => {
    const { id } = req.params;
    
    try {
        const assignment = await ShiftAssignment.findByPk(id, {
            include: [{ model: ShiftType, as: 'shiftType' }]
        });
        
        if (!assignment) {
            return res.status(404).json({ message: 'Shift Assignment not found' });
        }

        // Check if the current shift is not completed yet!
        const now = moment();
        const dateStr = assignment.assignmentDate;
        const extShift = assignment.shiftType;
        if (extShift && extShift.startTime && extShift.endTime) {
            const startStr = dateStr + 'T' + extShift.startTime;
            const endStr = dateStr + 'T' + extShift.endTime;
            let startDT = moment(startStr, 'YYYY-MM-DDTHH:mm:ss');
            let endDT = moment(endStr, 'YYYY-MM-DDTHH:mm:ss');
            if (endDT.isBefore(startDT)) {
                endDT.add(1, 'day');
            }
            
            if (now.isBefore(endDT)) {
                return res.status(400).json({
                    message: `Cannot update shift: Current assigned shift (${extShift.name}: ${extShift.startTime} - ${extShift.endTime}) is still active and has not completed yet.`
                });
            }
        }

        await assignment.update(req.body);
        
        const updated = await ShiftAssignment.findByPk(id, {
            include: [
                { model: Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'employeeCode'] },
                { model: ShiftType, as: 'shiftType', attributes: ['id', 'name', 'startTime', 'endTime'] },
            ],
        });
        
        res.status(200).json(updated);
    } catch (error) {
        console.error('Error updating shift assignment:', error);
        let message = 'Server Error';
        if (error.name === 'SequelizeValidationError') {
            message = error.errors.map(err => err.message).join(' ');
        }
        res.status(400).json({ message });
    }
};

// @desc    Delete shift assignment
// @route   DELETE /api/shift-assignments/:id
// @access  Private
exports.deleteShiftAssignment = async (req, res) => {
    const { id } = req.params;
    
    try {
        const assignment = await ShiftAssignment.findByPk(id);
        
        if (!assignment) {
            return res.status(404).json({ message: 'Shift Assignment not found' });
        }

        await assignment.destroy();
        res.status(200).json({ message: 'Shift Assignment deleted successfully' });
    } catch (error) {
        console.error('Error deleting shift assignment:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Bulk delete shift assignments
// @route   POST /api/shift-assignments/bulk-delete
// @access  Private
exports.bulkDeleteShiftAssignments = async (req, res) => {
    const { assignmentIds } = req.body;
    
    try {
        if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
            return res.status(400).json({ message: 'Assignment IDs array is required' });
        }

        const deleted = await ShiftAssignment.destroy({
            where: { id: { [Op.in]: assignmentIds } }
        });
        
        res.status(200).json({
            message: `Deleted ${deleted} assignment(s)`,
            count: deleted
        });
    } catch (error) {
        console.error('Error bulk deleting shift assignments:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Cancel shift assignment (soft delete - change status)
// @route   PATCH /api/shift-assignments/:id/cancel
// @access  Private
exports.cancelShiftAssignment = async (req, res) => {
    const { id } = req.params;
    
    try {
        const assignment = await ShiftAssignment.findByPk(id);
        
        if (!assignment) {
            return res.status(404).json({ message: 'Shift Assignment not found' });
        }

        await assignment.update({ status: 'Cancelled' });
        
        res.status(200).json({
            message: 'Shift Assignment cancelled successfully',
            assignment
        });
    } catch (error) {
        console.error('Error cancelling shift assignment:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};