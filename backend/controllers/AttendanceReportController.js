// ============================================================
// controllers/attendanceReportController.js
// ============================================================
const { Op } = require("sequelize");
const moment = require("moment");
const db = require("../models");
const { Attendance, Employee } = db;

// ── Helper: parse comma-separated id list → array of ints ────
const parseIds = (val) => {
  if (!val) return null;
  const ids = String(val).split(",").map((v) => parseInt(v.trim())).filter(Boolean);
  return ids.length ? ids : null;
};

// ============================================================
// GET /api/attendance-report
// Query params:
//   companyId       (required)
//   startDate       (required)  YYYY-MM-DD
//   endDate         (required)  YYYY-MM-DD
//   departmentIds   (optional)  comma-separated ids
//   employeeIds     (optional)  comma-separated ids
//   employmentTypeIds (optional) comma-separated ids
//   gradeIds        (optional)  comma-separated ids
// ============================================================
exports.getAttendanceReport = async (req, res) => {
  const {
    companyId,
    startDate,
    endDate,
    departmentIds,
    employeeIds,
    employmentTypeIds,
    gradeIds,
  } = req.query;

  if (!companyId || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "companyId, startDate and endDate are required",
    });
  }

  try {
    // ── Employee filter ──────────────────────────────────────
    const employeeWhere = { companyId };

    const deptIdList      = parseIds(departmentIds);
    const empIdList       = parseIds(employeeIds);
    const empTypeIdList   = parseIds(employmentTypeIds);
    const gradeIdList     = parseIds(gradeIds);

    if (deptIdList)    employeeWhere.departmentId      = { [Op.in]: deptIdList };
    if (empTypeIdList) employeeWhere.employmentTypeId  = { [Op.in]: empTypeIdList };
    if (gradeIdList)   employeeWhere.gradeId           = { [Op.in]: gradeIdList };

    // ── Attendance filter ────────────────────────────────────
    const where = {
      companyId,
      attendanceDate: {
        [Op.between]: [
          moment(startDate).format("YYYY-MM-DD"),
          moment(endDate).format("YYYY-MM-DD"),
        ],
      },
      status: { [Op.in]: ["Present", "Present with Permission", "Half Day"] },
    };
    if (empIdList) where.employeeId = { [Op.in]: empIdList };

    const rows = await Attendance.findAll({
      where,
      include: [
        {
          model: Employee,
          as: "employee",
          where: employeeWhere,
          attributes: [
            "id", "firstName", "lastName", "employeeCode",
            "departmentId", "employmentTypeId", "gradeId",
          ],
          include: [
            {
              model: db.Department,
              as: "department",
              attributes: ["id", "departmentname"],
            },
            {
              model: db.EmploymentType,
              as: "employmentType",
              attributes: ["id", "name"],
            },
            {
              model: db.EmployerGrade,
              as: "grade",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [
        ["attendanceDate", "ASC"],
        ["shiftName", "ASC"],
        [{ model: Employee, as: "employee" }, "firstName", "ASC"],
      ],
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("[getAttendanceReport]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
