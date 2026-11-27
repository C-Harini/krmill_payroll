const { WorkloadMaster } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all workload masters (with search, sort)
// @route   GET /api/workload-master
exports.getAllWorkloads = async (req, res) => {
    try {
        const { search } = req.query;
        const where = {};

        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            const numericVal = Number(search.trim());
            const orConditions = [
                { workloadName: { [Op.like]: query } },
                { reportName: { [Op.like]: query } },
            ];

            if (!isNaN(numericVal)) {
                orConditions.push({ code: numericVal });
            }

            where[Op.or] = orConditions;
        }

        const workloads = await WorkloadMaster.findAll({
            where,
            order: [
                ['code', 'ASC'],
                ['id', 'ASC'],
            ],
        });

        res.status(200).json({
            success: true,
            count: workloads.length,
            data: workloads,
        });
    } catch (error) {
        console.error('Error fetching workload masters:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching workload master records',
            error: error.message,
        });
    }
};

// @desc    Get single workload master by ID
// @route   GET /api/workload-master/:id
exports.getWorkloadById = async (req, res) => {
    try {
        const { id } = req.params;
        const workload = await WorkloadMaster.findByPk(id);

        if (!workload) {
            return res.status(404).json({
                success: false,
                message: 'Workload master record not found',
            });
        }

        res.status(200).json({
            success: true,
            data: workload,
        });
    } catch (error) {
        console.error('Error fetching workload master by id:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching record',
            error: error.message,
        });
    }
};

// @desc    Create new workload master record
// @route   POST /api/workload-master
exports.createWorkload = async (req, res) => {
    try {
        const { code, workloadName, reportName, salary, side, status } = req.body;

        if (!workloadName || workloadName.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Workload name is required',
            });
        }

        // Validate code uniqueness if provided
        if (code !== undefined && code !== null && code !== '') {
            const existing = await WorkloadMaster.findOne({ where: { code } });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: `Code ${code} already exists`,
                });
            }
        }

        const newRecord = await WorkloadMaster.create({
            code: code !== undefined && code !== '' && code !== null ? Number(code) : null,
            workloadName: workloadName.trim(),
            reportName: reportName !== undefined && reportName !== null ? String(reportName).trim() : null,
            salary: salary !== undefined && salary !== null && salary !== '' ? Number(salary) : 0,
            side: side !== undefined && side !== null && side !== '' ? Number(side) : 0,
            status: status || 'Active',
        });

        res.status(201).json({
            success: true,
            message: 'Workload master record created successfully',
            data: newRecord,
        });
    } catch (error) {
        console.error('Error creating workload master record:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating record',
            error: error.message,
        });
    }
};

// @desc    Update workload master record
// @route   PUT /api/workload-master/:id
exports.updateWorkload = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, workloadName, reportName, salary, side, status } = req.body;

        const record = await WorkloadMaster.findByPk(id);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Workload master record not found',
            });
        }

        // If code changed, check uniqueness
        if (code !== undefined && code !== null && code !== '' && Number(code) !== record.code) {
            const existing = await WorkloadMaster.findOne({
                where: {
                    code: Number(code),
                    id: { [Op.ne]: id },
                },
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: `Code ${code} is already in use by another record`,
                });
            }
            record.code = Number(code);
        } else if (code === '' || code === null) {
            record.code = null;
        }

        if (workloadName !== undefined) record.workloadName = workloadName.trim();
        if (reportName !== undefined) record.reportName = reportName ? String(reportName).trim() : null;
        if (salary !== undefined) record.salary = Number(salary);
        if (side !== undefined) record.side = side !== '' && side !== null ? Number(side) : 0;
        if (status !== undefined) record.status = status;

        await record.save();

        res.status(200).json({
            success: true,
            message: 'Workload master record updated successfully',
            data: record,
        });
    } catch (error) {
        console.error('Error updating workload master record:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating record',
            error: error.message,
        });
    }
};

// @desc    Delete single workload master record
// @route   DELETE /api/workload-master/:id
exports.deleteWorkload = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await WorkloadMaster.findByPk(id);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Workload master record not found',
            });
        }

        await record.destroy();

        res.status(200).json({
            success: true,
            message: 'Workload master record deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting workload master record:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting record',
            error: error.message,
        });
    }
};

// @desc    Bulk delete workload master records
// @route   POST /api/workload-master/bulk-delete
exports.bulkDeleteWorkloads = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Array of ids is required for bulk deletion',
            });
        }

        const deletedCount = await WorkloadMaster.destroy({
            where: {
                id: { [Op.in]: ids },
            },
        });

        res.status(200).json({
            success: true,
            message: `Successfully deleted ${deletedCount} record(s)`,
            count: deletedCount,
        });
    } catch (error) {
        console.error('Error bulk deleting workload records:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during bulk delete',
            error: error.message,
        });
    }
};
