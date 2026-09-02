// ============================================================
// controllers/attendanceLockController.js
// ============================================================

const { AttendanceLock, User } = require("../models");
const moment = require("moment");
const { Op } = require("sequelize");

/**
 * GET /api/attendance-lock/status
 * Query: companyId, date (YYYY-MM-DD)
 */
exports.getLockStatus = async (req, res) => {
    try {
        const { companyId, date } = req.query;

        if (!companyId || !date) {
            return res.status(400).json({
                success: false,
                message: "companyId and date are required",
            });
        }

        const formattedDate = moment(date).format("YYYY-MM-DD");

        const record = await AttendanceLock.findOne({
            where: {
                companyId: parseInt(companyId, 10),
                lockDate: formattedDate,
            },
        });

        const isLocked = record ? !!record.isLocked : false;

        return res.status(200).json({
            success: true,
            companyId: parseInt(companyId, 10),
            date: formattedDate,
            isLocked,
            lockDetails: record || null,
        });
    } catch (err) {
        console.error("[getLockStatus]", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to retrieve lock status",
        });
    }
};

/**
 * POST /api/attendance-lock/toggle
 * Body: { companyId, date, isLocked, remarks, userId }
 */
exports.toggleLock = async (req, res) => {
    try {
        const { companyId, date, isLocked, remarks, userId } = req.body;

        if (!companyId || !date) {
            return res.status(400).json({
                success: false,
                message: "companyId and date are required",
            });
        }

        const formattedDate = moment(date).format("YYYY-MM-DD");
        const activeUserId = userId || (req.user && req.user.id) || null;

        // Find existing lock record
        const existing = await AttendanceLock.findOne({
            where: {
                companyId: parseInt(companyId, 10),
                lockDate: formattedDate,
            },
        });

        // If explicit isLocked is provided, use it; otherwise toggle current state
        const newLockState = isLocked !== undefined ? Boolean(isLocked) : existing ? !existing.isLocked : true;

        const now = new Date();

        if (existing) {
            const updateData = {
                isLocked: newLockState,
                remarks: remarks !== undefined ? remarks : existing.remarks,
            };

            if (newLockState) {
                updateData.lockedBy = activeUserId;
                updateData.lockedAt = now;
            } else {
                updateData.unlockedBy = activeUserId;
                updateData.unlockedAt = now;
            }

            await existing.update(updateData);

            return res.status(200).json({
                success: true,
                message: newLockState
                    ? `Manual entries for ${formattedDate} are now LOCKED.`
                    : `Manual entries for ${formattedDate} are now UNLOCKED.`,
                isLocked: newLockState,
                data: existing,
            });
        } else {
            // Create new record
            const newRecord = await AttendanceLock.create({
                companyId: parseInt(companyId, 10),
                lockDate: formattedDate,
                isLocked: newLockState,
                lockedBy: newLockState ? activeUserId : null,
                lockedAt: newLockState ? now : null,
                unlockedBy: !newLockState ? activeUserId : null,
                unlockedAt: !newLockState ? now : null,
                remarks: remarks || null,
            });

            return res.status(200).json({
                success: true,
                message: newLockState
                    ? `Manual entries for ${formattedDate} are now LOCKED.`
                    : `Manual entries for ${formattedDate} are now UNLOCKED.`,
                isLocked: newLockState,
                data: newRecord,
            });
        }
    } catch (err) {
        console.error("[toggleLock]", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to toggle lock status",
        });
    }
};

/**
 * GET /api/attendance-lock/list
 * Query: companyId, startDate, endDate
 */
exports.getLockedDates = async (req, res) => {
    try {
        const { companyId, startDate, endDate } = req.query;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "companyId is required",
            });
        }

        const where = {
            companyId: parseInt(companyId, 10),
            isLocked: true,
        };

        if (startDate && endDate) {
            where.lockDate = {
                [Op.between]: [
                    moment(startDate).format("YYYY-MM-DD"),
                    moment(endDate).format("YYYY-MM-DD"),
                ],
            };
        }

        const records = await AttendanceLock.findAll({
            where,
            order: [["lockDate", "ASC"]],
        });

        return res.status(200).json({
            success: true,
            data: records,
        });
    } catch (err) {
        console.error("[getLockedDates]", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to retrieve locked dates",
        });
    }
};
