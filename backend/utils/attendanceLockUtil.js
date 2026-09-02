// ============================================================
// utils/attendanceLockUtil.js
// ============================================================

const { AttendanceLock } = require("../models");
const moment = require("moment");

/**
 * Checks whether manual attendance/OT entry is locked for the given company and date.
 *
 * @param {number|string} companyId
 * @param {string|Date} date
 * @returns {Promise<boolean>} True if locked, false otherwise
 */
const isDateLocked = async (companyId, date) => {
    if (!companyId || !date) return false;

    try {
        const formattedDate = moment(date).format("YYYY-MM-DD");
        const lockRecord = await AttendanceLock.findOne({
            where: {
                companyId: parseInt(companyId, 10),
                lockDate: formattedDate,
                isLocked: true,
            },
        });

        return !!lockRecord;
    } catch (err) {
        console.error("[isDateLocked Error]", err);
        // In case of error, default to false so system is not abruptly blocked unless intended
        return false;
    }
};

module.exports = {
    isDateLocked,
};
