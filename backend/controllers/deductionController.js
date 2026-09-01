const { Deduction, Employee, Department, Company } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all deductions for a company (with optional filters)
// @route   GET /api/deductions?companyId=1&month=1&year=2026&departmentId=1
// @access  Private
exports.getDeductions = async (req, res) => {
    const { companyId, month, year, departmentId, employeeId } = req.query;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    try {
        const where = { companyId };
        if (month) where.month = month;
        if (year) where.year = year;
        if (departmentId) where.departmentId = departmentId;
        if (employeeId) where.employeeId = employeeId;

        const deductions = await Deduction.findAll({
            where,
            include: [
                { model: Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'employeeCode'] },
                { model: Department, as: 'department', attributes: ['id', 'departmentname', 'acronym'] },
            ],
            order: [['createdAt', 'DESC']],
        });
        res.status(200).json(deductions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new deduction entry
// @route   POST /api/deductions
// @access  Private
exports.createDeduction = async (req, res) => {
    const { employeeId, departmentId, companyId, month, year, deductionType, amount, remarks } = req.body;

    if (!employeeId || !departmentId || !companyId || !month || !year || !deductionType || !amount) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const existing = await Deduction.findOne({
            where: { employeeId, month, year, deductionType }
        });
        if (existing) {
            return res.status(409).json({
                message: `Deduction entry already exists for this employee with type "${deductionType}" for ${month}/${year}. Please edit the existing entry instead.`
            });
        }

        const newDeduction = await Deduction.create({
            employeeId, departmentId, companyId, month, year, deductionType, amount, remarks
        });

        const deduction = await Deduction.findByPk(newDeduction.id, {
            include: [
                { model: Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'employeeCode'] },
                { model: Department, as: 'department', attributes: ['id', 'departmentname', 'acronym'] },
            ],
        });

        res.status(201).json(deduction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a deduction entry
// @route   PUT /api/deductions/:id
// @access  Private
exports.updateDeduction = async (req, res) => {
    const { id } = req.params;
    const { employeeId, departmentId, companyId, month, year, deductionType, amount, remarks } = req.body;

    try {
        const deduction = await Deduction.findByPk(id);
        if (!deduction) {
            return res.status(404).json({ message: 'Deduction not found' });
        }

        if (employeeId !== deduction.employeeId || month !== deduction.month ||
            year !== deduction.year || deductionType !== deduction.deductionType) {
            const existing = await Deduction.findOne({
                where: {
                    employeeId, month, year, deductionType,
                    id: { [Op.ne]: id }
                }
            });
            if (existing) {
                return res.status(409).json({
                    message: `Duplicate entry: This employee already has a "${deductionType}" deduction for ${month}/${year}.`
                });
            }
        }

        await deduction.update({ employeeId, departmentId, companyId, month, year, deductionType, amount, remarks });

        const updated = await Deduction.findByPk(id, {
            include: [
                { model: Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'employeeCode'] },
                { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name'], 'acronym'] },
            ],
        });

        res.status(200).json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a deduction entry
// @route   DELETE /api/deductions/:id
// @access  Private
exports.deleteDeduction = async (req, res) => {
    const { id } = req.params;

    try {
        const deduction = await Deduction.findByPk(id);
        if (!deduction) {
            return res.status(404).json({ message: 'Deduction not found' });
        }

        await deduction.destroy();
        res.status(200).json({ message: 'Deduction deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get consolidated deduction report
// @route   GET /api/deductions/report?companyId=1&month=1&year=2026&departmentIds=1,2,3&deductionTypes=Mess,Stores
// @access  Private
exports.getConsolidatedReport = async (req, res) => {
    const { companyId, month, year, departmentIds, deductionTypes } = req.query;

    if (!companyId || !month || !year) {
        return res.status(400).json({ message: 'companyId, month, and year are required' });
    }

    try {
        const where = { companyId, month, year };

        if (departmentIds) {
            where.departmentId = { [Op.in]: departmentIds.split(',').map(Number) };
        }
        if (deductionTypes) {
            where.deductionType = { [Op.in]: deductionTypes.split(',') };
        }

        const deductions = await Deduction.findAll({
            where,
            include: [
                { model: Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'employeeCode'] },
                { model: Department, as: 'department', attributes: ['id', 'departmentname', ['departmentname', 'name'], 'acronym'] },
            ],
            order: [
                [{ model: Department, as: 'department' }, 'departmentname', 'ASC'],
                [{ model: Employee, as: 'employee' }, 'firstName', 'ASC'],
            ],
        });

        // Pivot: group by employee, spread deduction types as columns
        const employeeMap = {};
        deductions.forEach(d => {
            const key = d.employeeId;
            if (!employeeMap[key]) {
                employeeMap[key] = {
                    employeeId: d.employeeId,
                    employeeCode: d.employee.employeeCode,
                    employeeName: `${d.employee.firstName} ${d.employee.lastName}`,
                    departmentId: d.departmentId,
                    departmentName: d.department.name,
                    departmentAcronym: d.department.acronym,
                    Mess: 0, Stores: 0, EB: 0, Others: 0, total: 0,
                };
            }
            const amount = parseFloat(d.amount) || 0;
            employeeMap[key][d.deductionType] = amount;
            employeeMap[key].total += amount;
        });

        const reportData = Object.values(employeeMap);

        // Department-wise subtotals
        const deptTotals = {};
        reportData.forEach(row => {
            const dKey = row.departmentId;
            if (!deptTotals[dKey]) {
                deptTotals[dKey] = {
                    departmentId: row.departmentId,
                    departmentName: row.departmentName,
                    departmentAcronym: row.departmentAcronym,
                    Mess: 0, Stores: 0, EB: 0, Others: 0, total: 0,
                    staffCount: 0,
                };
            }
            deptTotals[dKey].Mess += row.Mess;
            deptTotals[dKey].Stores += row.Stores;
            deptTotals[dKey].EB += row.EB;
            deptTotals[dKey].Others += row.Others;
            deptTotals[dKey].total += row.total;
            deptTotals[dKey].staffCount += 1;
        });

        // Grand total
        const grandTotal = { Mess: 0, Stores: 0, EB: 0, Others: 0, total: 0, staffCount: reportData.length };
        Object.values(deptTotals).forEach(dt => {
            grandTotal.Mess += dt.Mess;
            grandTotal.Stores += dt.Stores;
            grandTotal.EB += dt.EB;
            grandTotal.Others += dt.Others;
            grandTotal.total += dt.total;
        });

        res.status(200).json({
            reportData,
            deptTotals: Object.values(deptTotals),
            deptSubTotals: Object.values(deptTotals),
            grandTotal,
            filters: { companyId, month, year, departmentIds, deductionTypes },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
