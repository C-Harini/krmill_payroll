const { WorkloadEmployee, Employee, Department, Category } = require('../models');
const { Op } = require('sequelize');

// Helper: auto-seed trainees if WorkloadEmployee table is empty
const ensureInitialTrainees = async () => {
    const count = await WorkloadEmployee.count();
    if (count === 0) {
        const trainees = await Employee.findAll({
            where: {
                isTrainee: true,
                status: 'Active',
            },
            attributes: ['id'],
            limit: 50,
        });

        if (trainees && trainees.length > 0) {
            const seedData = trainees.map(t => ({
                employeeId: t.id,
                status: 'Active',
            }));
            await WorkloadEmployee.bulkCreate(seedData, { ignoreDuplicates: true });
        }
    }
};

// @desc    Get all enrolled workload employees
// @route   GET /api/workload-employees
exports.getAllWorkloadEmployees = async (req, res) => {
    try {
        await ensureInitialTrainees();

        const { search } = req.query;

        const employeeWhere = { status: 'Active' };
        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            employeeWhere[Op.or] = [
                { curEmployeeCode: { [Op.like]: query } },
                { firstName: { [Op.like]: query } },
                { lastName: { [Op.like]: query } },
            ];
        }

        const enrolled = await WorkloadEmployee.findAll({
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    where: employeeWhere,
                    attributes: ['id', 'curEmployeeCode', 'firstName', 'lastName', 'isHostel', 'isTrainee', 'status'],
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
            order: [
                ['id', 'ASC'],
            ],
        });

        const formatted = enrolled.map((item, index) => {
            const emp = item.employee || {};
            const dept = emp.department || {};
            const cat = emp.category || {};
            const fullName = [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim();

            return {
                id: item.id,
                employeeId: emp.id,
                slno: index + 1,
                ticketNo: emp.curEmployeeCode || '-',
                employeeName: fullName || '-',
                department: dept.acronym || dept.departmentname || '-',
                category: cat.categoryCode || cat.categoryName || '-',
                ho: emp.isHostel ? 'H' : 'O',
                status: item.status,
            };
        });

        res.status(200).json({
            success: true,
            count: formatted.length,
            data: formatted,
        });
    } catch (error) {
        console.error('Error fetching workload employees:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching workload employees',
            error: error.message,
        });
    }
};

// @desc    Get master employees list for the Add Modal popup
// @route   GET /api/workload-employees/available
exports.getAvailableEmployees = async (req, res) => {
    try {
        const { search } = req.query;
        const where = { status: 'Active' };

        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            where[Op.or] = [
                { curEmployeeCode: { [Op.like]: query } },
                { firstName: { [Op.like]: query } },
                { lastName: { [Op.like]: query } },
            ];
        }

        // Get currently enrolled employee IDs
        const enrolled = await WorkloadEmployee.findAll({
            attributes: ['employeeId'],
        });
        const enrolledIds = new Set(enrolled.map(e => e.employeeId));

        const employees = await Employee.findAll({
            where,
            attributes: ['id', 'curEmployeeCode', 'firstName', 'lastName', 'isHostel', 'isTrainee'],
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
            order: [
                ['firstName', 'ASC'],
            ],
        });

        const formatted = employees.map(emp => {
            const dept = emp.department || {};
            const cat = emp.category || {};
            const fullName = [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim();

            return {
                id: emp.id,
                employeeName: fullName || '-',
                cat: emp.isHostel ? 'H' : (cat.categoryCode || cat.categoryName || 'O'),
                dept: dept.acronym || dept.departmentname || '-',
                ticketNo: emp.curEmployeeCode || '-',
                isEnrolled: enrolledIds.has(emp.id),
            };
        });

        res.status(200).json({
            success: true,
            count: formatted.length,
            data: formatted,
        });
    } catch (error) {
        console.error('Error fetching available employees for modal:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching employees',
            error: error.message,
        });
    }
};

// @desc    Add employees to workload
// @route   POST /api/workload-employees
exports.addWorkloadEmployees = async (req, res) => {
    try {
        const { employeeIds } = req.body;

        if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Array of employeeIds is required',
            });
        }

        let addedCount = 0;
        for (const empId of employeeIds) {
            const existing = await WorkloadEmployee.findOne({ where: { employeeId: empId } });
            if (!existing) {
                await WorkloadEmployee.create({
                    employeeId: empId,
                    status: 'Active',
                });
                addedCount++;
            }
        }

        res.status(201).json({
            success: true,
            message: `Successfully added ${addedCount} employee(s) to workload`,
            count: addedCount,
        });
    } catch (error) {
        console.error('Error adding employees to workload:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while adding employees',
            error: error.message,
        });
    }
};

// @desc    Remove single employee from workload
// @route   DELETE /api/workload-employees/:id
exports.deleteWorkloadEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await WorkloadEmployee.findByPk(id);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record not found in workload list',
            });
        }

        await record.destroy();

        res.status(200).json({
            success: true,
            message: 'Employee removed from workload list successfully',
        });
    } catch (error) {
        console.error('Error deleting workload employee:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while removing employee',
            error: error.message,
        });
    }
};

// @desc    Bulk remove employees from workload
// @route   POST /api/workload-employees/bulk-delete
exports.bulkDeleteWorkloadEmployees = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Array of ids is required',
            });
        }

        const count = await WorkloadEmployee.destroy({
            where: {
                id: { [Op.in]: ids },
            },
        });

        res.status(200).json({
            success: true,
            message: `Successfully removed ${count} employee(s) from workload`,
            count,
        });
    } catch (error) {
        console.error('Error bulk removing workload employees:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during bulk delete',
            error: error.message,
        });
    }
};
