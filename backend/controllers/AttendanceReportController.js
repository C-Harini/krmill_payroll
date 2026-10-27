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
//   categoryIds     (optional)  comma-separated ids
//   categoryId      (optional)  single category id
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
    categoryIds,
    categoryId,
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
    const catIdList       = parseIds(categoryIds || categoryId);
    const empIdList       = parseIds(employeeIds);
    const empTypeIdList   = parseIds(employmentTypeIds);
    const gradeIdList     = parseIds(gradeIds);

    if (catIdList)     employeeWhere.categoryId        = { [Op.in]: catIdList };
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
      status: { [Op.in]: ["Present", "Present with Permission", "Present/Leave (P/L)", "Half Day"] },
    };
    if (empIdList) where.employeeId = { [Op.in]: empIdList };
    if (deptIdList) {
      where[Op.or] = [
        { workedDeptId: { [Op.in]: deptIdList } },
        { workedDeptId: null, departmentId: { [Op.in]: deptIdList } },
      ];
    }

    if (req.query.employeeCodes) {
      const codes = String(req.query.employeeCodes).split(",").map((c) => c.trim()).filter(Boolean);
      if (codes.length) {
        employeeWhere[Op.or] = [
          { curEmployeeCode: { [Op.in]: codes } },
          { newEmployeeCode: { [Op.in]: codes } },
        ];
      }
    }

    const rows = await Attendance.findAll({
      where,
      include: [
        {
          model: db.Department,
          as: "workedDepartment",
          attributes: ["id", "departmentname", "acronym"],
        },
        {
          model: db.Department,
          as: "department",
          attributes: ["id", "departmentname", "acronym"],
        },
        {
          model: Employee,
          as: "employee",
          where: employeeWhere,
          attributes: [
            "id", "firstName", "lastName", "curEmployeeCode", "newEmployeeCode",
            "departmentId", "employmentTypeId", "gradeId", "categoryId",
          ],
          include: [
            {
              model: db.Department,
              as: "department",
              attributes: ["id", "departmentname", "acronym"],
            },
            {
              model: db.Category,
              as: "category",
              attributes: ["id", "categoryName", "categoryCode"],
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

    const formattedRows = rows.map((r) => {
      const plain = r.toJSON();
      if (plain.employee) {
        plain.employee.curEmployeeCode = plain.employee.curEmployeeCode || plain.employee.newEmployeeCode || "";
      }
      return plain;
    });

    return res.status(200).json({ success: true, data: formattedRows });
  } catch (err) {
    console.error("[getAttendanceReport]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
