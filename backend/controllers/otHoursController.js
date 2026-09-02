// const { Op } = require("sequelize");
// const {
//   OTHours,
//   Company,
//   Department,
//   Employee,
// } = require("../models");

// // exports.getEmployees = async (req, res) => {
// //   try {
// //     const { companyId, departmentId } = req.query;

// //     const where = {};

// //     if (companyId) {
// //       where.companyId = parseInt(companyId);
// //     }

// //     // ADD THIS - Currently missing departmentId filter
// //     if (departmentId) {
// //       where.departmentId = parseInt(departmentId);
// //     }

// //     const employees = await Employee.findAll({
// //       where,
// //       attributes: ["id", "employeeCode", "firstName", "lastName"],
// //       order: [["firstName", "ASC"]]
// //     });

// //     return res.json({ employees });
// //   } catch (error) {
// //     console.error("Error fetching employees:", error);
// //     return res.status(500).json({ message: "Server error", error: error.message });
// //   }
// // };


// // ✅ GET All OT Hours
// exports.getOTHours = async (req, res) => {
//   try {
//     const records = await OTHours.findAll({
//       include: [
//         { model: Company, as: "company" },
//         { model: Department, as: "department" },
//         { model: Employee, as: "employee" },
//       ],
//       order: [["date", "DESC"]],
//     });

//     return res.json({ records });
//   } catch (error) {
//     console.error("Error fetching OT hours:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

// // // ✅ GET OT Hours by Filter (Company, Department, Date Range)
// // exports.getOTHoursByFilter = async (req, res) => {
// //   try {
// //     const { companyId, departmentId, date, startDate, endDate } = req.query;

// //     const where = {};
// //     if (companyId) where.companyId = companyId;
// //     if (departmentId) where.departmentId = departmentId;

// //     // Handle date range filtering (startDate & endDate)
// //     if (startDate && endDate) {
// //       const start = new Date(startDate);
// //       const end = new Date(endDate);
// //       end.setDate(end.getDate() + 1); // Include the end date
// //       where.date = {
// //         [Op.between]: [start, end],
// //       };
// //     }
// //     // Handle single date filtering (backward compatibility)
// //     else if (date) {
// //       const startDateObj = new Date(date);
// //       const endDateObj = new Date(date);
// //       endDateObj.setDate(endDateObj.getDate() + 1);
// //       where.date = {
// //         [Op.between]: [startDateObj, endDateObj],
// //       };
// //     }

// //     const records = await OTHours.findAll({
// //       where,
// //       include: [
// //         { model: Company, as: "company", attributes: ["id", "companyName", "name"] },
// //         { model: Department, as: "department", attributes: ["id", "departmentName", "name"] },
// //         { 
// //           model: Employee, 
// //           as: "employee", 
// //           attributes: ["id", "employeeCode", "firstName", "lastName", "designationId"],
// //           include: [
// //             { 
// //               model: require("../models").Designation, 
// //               as: "designation", 
// //               attributes: ["id", "name", "designationName"],
// //               required: false 
// //             },
// //             {
// //               model: require("../models").EmployeeSalaryMaster,
// //               as: "salaryMaster",
// //               attributes: ["id", "basicSalary", "effectiveFrom", "effectiveTo", "status"],
// //               required: false
// //             }
// //           ]
// //         },
// //       ],
// //       order: [["date", "ASC"], ["employeeId", "ASC"]]
// //     });

// //     return res.json({ records });
// //   } catch (error) {
// //     console.error("Error fetching OT hours:", error);
// //     return res.status(500).json({ message: "Server error", error: error.message });
// //   }
// // };

// // ✅ GET OT Hours by Filter (Company, Department, Date Range)
// exports.getOTHoursByFilter = async (req, res) => {
//   try {
//     const { companyId, departmentId, date, startDate, endDate } = req.query;

//     const where = {};

//     if (companyId) {
//       where.companyId = parseInt(companyId);
//     }

//     if (departmentId) {
//       where.departmentId = parseInt(departmentId);
//     }

//     // Handle date range filtering (startDate & endDate)
//     if (startDate && endDate) {
//       where.date = {
//         [Op.between]: [new Date(startDate), new Date(endDate)],
//       };
//     } else if (date) {
//       const startDate = new Date(date);
//       const endDate = new Date(date);
//       endDate.setDate(endDate.getDate() + 1);
//       where.date = {
//         [Op.gte]: startDate, 
//           [Op.lt]: endDate,
//       };
//     }

//     const records = await OTHours.findAll({
//       where,
//       include: [
//         { model: Company, as: "company", attributes: ["id", "name"] },
//         { model: Department, as: "department", attributes: ["id", "name"] },
//         { 
//           model: Employee, 
//           as: "employee", 
//           attributes: ["id", "employeeCode", "firstName", "lastName", "designationId"],
//           include: [
//             { 
//               model: require("../models").Designation, 
//               as: "designation", 
//               attributes: ["id", "name"],
//               required: false 
//             },
//             {
//               model: require("../models").EmployeeSalaryMaster,
//               as: "EmployeeSalaryMasters",
//               attributes: ["id", "basicSalary", "effectiveFrom", "effectiveTo", "status"],
//               required: false
//             }
//           ]
//         },
//       ],
//       order: [["date", "ASC"], ["employeeId", "ASC"]]
//     });

//     return res.json({ records });
//   } catch (error) {
//     console.error("Error fetching OT hours:", error);
//     return res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // ✅ CREATE or UPDATE OT Hours (Upsert - Bulk)
// exports.createOTHours = async (req, res) => {
//   try {
//     const { companyId, departmentId, date, entries } = req.body;

//     if (!companyId || !departmentId || !date || !entries || entries.length === 0) {
//       return res.status(400).json({
//         message: "Missing required fields: companyId, departmentId, date, entries",
//       });
//     }

//     // Validate entries
//     for (const entry of entries) {
//       if (!entry.employeeId || entry.otHours === undefined || entry.otHours === null) {
//         return res.status(400).json({
//           message: "Each entry must have employeeId and otHours",
//         });
//       }

//       if (entry.otHours < 0) {
//         return res.status(400).json({
//           message: "OT Hours cannot be negative",
//         });
//       }
//     }

//     // Upsert OT Hours (create or update)
//     const createdOrUpdatedRecords = await Promise.all(
//       entries.map((entry) =>
//         OTHours.upsert(
//           {
//             companyId,
//             departmentId,
//             employeeId: entry.employeeId,
//             date,
//             otHours: Number(entry.otHours),
//             remarks: entry.remarks || null,
//           },
//           {
//             where: {
//               employeeId: entry.employeeId,
//               date: date,
//             },
//           }
//         )
//       )
//     );

//     return res.status(201).json({
//       message: `OT hours saved successfully for ${entries.length} employee(s) ✅`,
//       records: createdOrUpdatedRecords,
//     });
//   } catch (error) {
//     console.error("Error saving OT hours:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

// // ✅ UPDATE OT Hours
// exports.updateOTHours = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { otHours, remarks } = req.body;

//     const record = await OTHours.findByPk(id);
//     if (!record) {
//       return res.status(404).json({ message: "OT Hours record not found" });
//     }

//     if (otHours !== undefined && otHours !== null) {
//       if (otHours < 0) {
//         return res.status(400).json({ message: "OT Hours cannot be negative" });
//       }
//       record.otHours = Number(otHours);
//     }

//     if (remarks !== undefined) {
//       record.remarks = remarks;
//     }

//     await record.save();

//     return res.json({
//       message: "OT Hours updated successfully ✅",
//       record,
//     });
//   } catch (error) {
//     console.error("Error updating OT hours:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

// // ✅ DELETE OT Hours
// exports.deleteOTHours = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const record = await OTHours.findByPk(id);
//     if (!record) {
//       return res.status(404).json({ message: "OT Hours record not found" });
//     }

//     await record.destroy();

//     return res.json({
//       message: "OT Hours deleted successfully ✅",
//     });
//   } catch (error) {
//     console.error("Error deleting OT hours:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

// // ✅ DELETE OT Hours by Employee & Date
// exports.deleteOTHoursByEmployeeAndDate = async (req, res) => {
//   try {
//     const { employeeId, date } = req.params;

//     const startDate = new Date(date);
//     const endDate = new Date(date);
//     endDate.setDate(endDate.getDate() + 1);

//     const result = await OTHours.destroy({
//       where: {
//         employeeId,
//         date: {
//           [require("sequelize").Op.between]: [startDate, endDate],
//         },
//       },
//     });

//     if (result === 0) {
//       return res.status(404).json({
//         message: "No OT Hours record found for this employee and date",
//       });
//     }

//     return res.json({
//       message: `${result} OT Hours record(s) deleted successfully ✅`,
//     });
//   } catch (error) {
//     console.error("Error deleting OT hours:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

// // ✅ GET OT Hours Stats (Total by Employee)
// exports.getOTHoursStats = async (req, res) => {
//   try {
//     const { companyId, departmentId, startDate, endDate } = req.query;

//     const where = {};
//     if (companyId) where.companyId = companyId;
//     if (departmentId) where.departmentId = departmentId;
//     if (startDate && endDate) {
//       const start = new Date(startDate);
//       const end = new Date(endDate);
//       end.setDate(end.getDate() + 1);
//       where.date = {
//         [require("sequelize").Op.between]: [start, end],
//       };
//     }

//     const stats = await OTHours.findAll({
//       attributes: [
//         "employeeId",
//         [require("sequelize").fn("SUM", require("sequelize").col("otHours")), "totalOTHours"],
//         [require("sequelize").fn("COUNT", require("sequelize").col("id")), "dayCount"],
//       ],
//       where,
//       include: [
//         { model: Employee, as: "employee", attributes: ["id", "firstName", "lastName", "employeeCode"] },
//       ],
//       group: ["employeeId"],
//       subQuery: false,
//       raw: false,
//     });

//     return res.json({ stats });
//   } catch (error) {
//     console.error("Error fetching OT hours stats:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

const { Op } = require("sequelize");
const {
  OTHours,
  Company,
  Department,
  Employee,
  EmployeeSalaryMaster,
  Designation,
  DepartmentAttendance,
} = require("../models");
const { isDateLocked } = require("../utils/attendanceLockUtil");
const moment = require("moment");

// ✅ Helper: Get active basicSalary from EmployeeSalaryMasters
const getActiveBasicSalary = (salaries) => {
  if (!Array.isArray(salaries) || salaries.length === 0) return 0;

  const activeSalaries = salaries
    .filter((s) => s.status === "Active")
    .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom));

  return parseFloat(activeSalaries[0]?.basicSalary || 0);
};

// ✅ Helper: Calculate OT Amount
// Formula: (basicSalary / 26 working days / 8 hours) × OT Hours
const calculateOTAmount = (basicSalary, otHours) => {
  if (!basicSalary || !otHours) return 0;
  const hourlyRate = basicSalary / 8;
  return Math.round(hourlyRate * otHours);
  // return parseFloat((hourlyRate * otHours).toFixed(2));
};

// ✅ GET All OT Hours
exports.getOTHours = async (req, res) => {
  try {
    const records = await OTHours.findAll({
      include: [
        { model: Company, as: "company" },
        { model: Department, as: "department" },
        { model: Employee, as: "employee" },
      ],
      order: [["date", "DESC"]],
    });

    return res.json({ records });
  } catch (error) {
    console.error("Error fetching OT hours:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET OT Hours by Filter (Company, Department, Date Range) with OT Amount
exports.getOTHoursByFilter = async (req, res) => {
  try {
    const { companyId, departmentId, date, startDate, endDate } = req.query;

    const where = {};

    if (companyId) where.companyId = parseInt(companyId);
    if (departmentId) where.departmentId = parseInt(departmentId);

    if (startDate && endDate) {
      where.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.date = {
        [Op.gte]: start,
        [Op.lt]: end,
      };
    }

    const records = await OTHours.findAll({
      where,
      include: [
        { model: Company, as: "company" },
        { model: Department, as: "department" },
        {
          model: Employee,
          as: "employee",
          include: [
            {
              model: Designation,
              as: "designation",
              required: false,
            },
            {
              model: EmployeeSalaryMaster,
              as: "EmployeeSalaryMasters",
              attributes: ["id", "basicSalary", "effectiveFrom", "effectiveTo", "status"],
              required: false,
            },
          ],
        },
      ],
      order: [
        ["date", "ASC"],
        ["employeeId", "ASC"],
      ],
    });

    // ── Attach OT Amount to each record ──────────────────────────
    const enrichedRecords = records.map((record) => {
      const plain = record.toJSON();

      const basicSalary = getActiveBasicSalary(
        plain.employee?.EmployeeSalaryMasters || []
      );

      const otAmount = calculateOTAmount(basicSalary, parseFloat(plain.otHours || 0));

      return {
        ...plain,
        basicSalary,
        otAmount,
        // hourlyRate for reference
        // hourlyRate: basicSalary > 0 ? Math.round(basicSalary / 8) : 0
        hourlyRate: basicSalary > 0 ? parseFloat((basicSalary / 8).toFixed(4)) : 0,
      };
    });

    return res.json({ records: enrichedRecords });
  } catch (error) {
    console.error("Error fetching OT hours:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ CREATE or UPDATE OT Hours (Upsert - Bulk)
exports.createOTHours = async (req, res) => {
  try {
    const { companyId, departmentId, date, entries } = req.body;

    if (!companyId || !departmentId || !date || !entries || entries.length === 0) {
      return res.status(400).json({
        message: "Missing required fields: companyId, departmentId, date, entries",
      });
    }

    if (await isDateLocked(companyId, date)) {
      return res.status(403).json({
        success: false,
        message: `OT hours entry is LOCKED for ${moment(date).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
        isLocked: true,
      });
    }

    // Validate entries
    for (const entry of entries) {
      if (!entry.employeeId || entry.otHours === undefined || entry.otHours === null) {
        return res.status(400).json({
          message: "Each entry must have employeeId and otHours",
        });
      }

      if (entry.otHours < 0) {
        return res.status(400).json({
          message: "OT Hours cannot be negative",
        });
      }
    }

    // Upsert OT Hours (create or update)
    const createdOrUpdatedRecords = await Promise.all(
      entries.map((entry) =>
        OTHours.upsert(
          {
            companyId,
            departmentId,
            employeeId: entry.employeeId,
            date,
            otHours: Number(entry.otHours),
            remarks: entry.remarks || null,
          },
          {
            where: {
              employeeId: entry.employeeId,
              date: date,
            },
          }
        )
      )
    );

    return res.status(201).json({
      message: `OT hours saved successfully for ${entries.length} employee(s) ✅`,
      records: createdOrUpdatedRecords,
    });
  } catch (error) {
    console.error("Error saving OT hours:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ UPDATE OT Hours
exports.updateOTHours = async (req, res) => {
  try {
    const { id } = req.params;
    const { otHours, remarks } = req.body;

    const record = await OTHours.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: "OT Hours record not found" });
    }

    if (await isDateLocked(record.companyId, record.date)) {
      return res.status(403).json({
        success: false,
        message: `OT hours entry is LOCKED for ${moment(record.date).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
        isLocked: true,
      });
    }

    if (otHours !== undefined && otHours !== null) {
      if (otHours < 0) {
        return res.status(400).json({ message: "OT Hours cannot be negative" });
      }
      record.otHours = Number(otHours);
    }

    if (remarks !== undefined) {
      record.remarks = remarks;
    }

    await record.save();

    return res.json({
      message: "OT Hours updated successfully ✅",
      record,
    });
  } catch (error) {
    console.error("Error updating OT hours:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ DELETE OT Hours
exports.deleteOTHours = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await OTHours.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: "OT Hours record not found" });
    }

    if (await isDateLocked(record.companyId, record.date)) {
      return res.status(403).json({
        success: false,
        message: `OT hours entry is LOCKED for ${moment(record.date).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
        isLocked: true,
      });
    }

    await record.destroy();

    return res.json({
      message: "OT Hours deleted successfully ✅",
    });
  } catch (error) {
    console.error("Error deleting OT hours:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ DELETE OT Hours by Employee & Date
exports.deleteOTHoursByEmployeeAndDate = async (req, res) => {
  try {
    const { employeeId, date } = req.params;

    const firstRec = await OTHours.findOne({ where: { employeeId } });
    if (firstRec && (await isDateLocked(firstRec.companyId, date))) {
      return res.status(403).json({
        success: false,
        message: `OT hours entry is LOCKED for ${moment(date).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
        isLocked: true,
      });
    }

    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const result = await OTHours.destroy({
      where: {
        employeeId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
    });

    if (result === 0) {
      return res.status(404).json({
        message: "No OT Hours record found for this employee and date",
      });
    }

    return res.json({
      message: `${result} OT Hours record(s) deleted successfully ✅`,
    });
  } catch (error) {
    console.error("Error deleting OT hours:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET OT Hours Stats (Total by Employee)
exports.getOTHoursStats = async (req, res) => {
  try {
    const { companyId, departmentId, startDate, endDate } = req.query;

    const where = {};
    if (companyId) where.companyId = companyId;
    if (departmentId) where.departmentId = departmentId;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.date = {
        [Op.between]: [start, end],
      };
    }

    const stats = await OTHours.findAll({
      attributes: [
        "employeeId",
        [require("sequelize").fn("SUM", require("sequelize").col("otHours")), "totalOTHours"],
        [require("sequelize").fn("COUNT", require("sequelize").col("id")), "dayCount"],
      ],
      where,
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "firstName", "lastName", "employeeCode"],
          include: [
            {
              model: EmployeeSalaryMaster,
              as: "EmployeeSalaryMasters",
              attributes: ["basicSalary", "effectiveFrom", "status"],
              required: false,
            },
          ],
        },
      ],
      group: ["employeeId"],
      subQuery: false,
      raw: false,
    });

    return res.json({ stats });
  } catch (error) {
    console.error("Error fetching OT hours stats:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================================================
// OVERTIME MULTIPLE ENTRY
// ============================================================
exports.getOTHoursMultipleEntry = async (req, res) => {
  const { companyId, departmentId, workedDeptId, date, shiftId } = req.query;

  if (!companyId || !departmentId || !date) {
    return res.status(400).json({
      success: false,
      message: "companyId, departmentId, and date are required",
    });
  }

  try {
    const moment = require("moment");
    const targetDate = moment(date).format("YYYY-MM-DD");
    const filterDeptId = workedDeptId || departmentId;

    // 1. Fetch manual attendance entries for this date/department to find who worked here
    const manualWhere = {
      companyId,
      attendanceDate: targetDate,
      [Op.or]: [
        { departmentId: filterDeptId },
        { workedDeptId: filterDeptId },
      ],
      status: { [Op.ne]: "Absent" },
    };

    const manualAttendances = await DepartmentAttendance.findAll({
      where: manualWhere,
      raw: true,
    });

    let employees = [];
    if (manualAttendances.length > 0) {
      const workedEmpIds = [...new Set(manualAttendances.map((ma) => ma.employeeId))];
      employees = await Employee.findAll({
        where: {
          id: { [Op.in]: workedEmpIds },
          status: "Active",
        },
        include: [
          {
            model: require("../models").Category,
            as: "category",
            attributes: ["categoryName", "categoryCode"],
            required: false,
          },
        ],
        order: [["employeeCode", "ASC"]],
      });
    } else {
      // Fallback: If no manual attendance records exist for this department/date,
      // load active employees belonging to the department so they are available for OT entry
      employees = await Employee.findAll({
        where: {
          companyId,
          departmentId: filterDeptId,
          status: "Active",
        },
        include: [
          {
            model: require("../models").Category,
            as: "category",
            attributes: ["categoryName", "categoryCode"],
            required: false,
          },
        ],
        order: [["employeeCode", "ASC"]],
      });
    }

    // 2. Fetch already saved OT records matching the query config (filtering by worked department)
    const whereClause = {
      companyId,
      date: {
        [Op.gte]: moment(targetDate).startOf("day").toDate(),
        [Op.lte]: moment(targetDate).endOf("day").toDate(),
      },
    };

    whereClause[Op.or] = [
      { workedDeptId: filterDeptId },
      { workedDeptId: null, departmentId: filterDeptId },
    ];

    if (shiftId) whereClause.shiftId = shiftId;

    const savedRecords = await OTHours.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: "employee",
          include: [
            {
              model: require("../models").Category,
              as: "category",
              attributes: ["categoryName", "categoryCode"],
              required: false,
            },
          ],
        },
        {
          model: require("../models").ShiftType,
          as: "shift",
          attributes: ["name"],
        },
      ],
      order: [["id", "ASC"]],
    });

    const savedEmpIdSet = new Set(savedRecords.map((r) => r.employeeId));

    // 3. Find employees who should NOT be shown in the unsaved checklist:
    // a) Employees who ALREADY have an OT entry saved on this date (in this shift or ANY other shift)
    const allSavedOTForDate = await OTHours.findAll({
      where: {
        companyId,
        date: {
          [Op.gte]: moment(targetDate).startOf("day").toDate(),
          [Op.lte]: moment(targetDate).endOf("day").toDate(),
        },
      },
      attributes: ["employeeId", "shiftId"],
      raw: true,
    });
    const employeesWithSavedOT = new Set(allSavedOTForDate.map((r) => r.employeeId));

    // b) Employees who are assigned to a DIFFERENT shift in DepartmentAttendance on this date
    let employeesAssignedToDiffShiftInAtt = new Set();
    if (shiftId) {
      const allAttForDate = await DepartmentAttendance.findAll({
        where: {
          companyId,
          attendanceDate: targetDate,
          shiftId: { [Op.ne]: shiftId },
        },
        attributes: ["employeeId", "shiftId"],
        raw: true,
      });
      employeesAssignedToDiffShiftInAtt = new Set(allAttForDate.map((r) => r.employeeId));
    }

    // Combine all exclusions for the unsaved checklist:
    // - Already has OT on this date
    // - Assigned to a different shift in Department Attendance on this date
    const excludeFromUnsaved = new Set([
      ...employeesWithSavedOT,
      ...employeesAssignedToDiffShiftInAtt,
    ]);

    // Format Unsaved Employees list
    const unsavedEmployees = employees
      .filter((emp) => !excludeFromUnsaved.has(emp.id))
      .map((emp) => {
        const code = emp.employeeCode || emp.ticketNo || (emp.dataValues ? emp.dataValues.employeeCode : "") || String(emp.id);
        const catName = emp.category
          ? emp.category.categoryCode || emp.category.categoryName || "O"
          : "O";

        return {
          employeeId: emp.id,
          ticketNo: code,
          employeeCode: code,
          empName: emp.firstName,
          category: catName,
        };
      });

    // 4. Format Enriched Saved Data list
    const savedData = savedRecords.map((r, index) => {
      const emp = r.employee;
      const code = r.ticketNo || (emp ? emp.employeeCode || emp.ticketNo : "") || String(r.employeeId);
      const catName = r.employee && r.employee.category
        ? r.employee.category.categoryCode || r.employee.category.categoryName
        : "O";
      return {
        id: r.id,
        slNo: index + 1,
        ticketNo: code,
        employeeCode: code,
        employeeName: emp ? emp.firstName : (r.empName ? r.empName.split(" ")[0] : ""),
        shiftName: r.shift ? r.shift.name : "B",
        category: catName,
        otHours: parseFloat(r.otHours || 0),
        fromTime: r.fromTime || "",
        toTime: r.toTime || "",
        otType: r.otType || "HOURS OT",
        employeeId: r.employeeId,
        workedDeptId: r.workedDeptId,
        shiftId: r.shiftId,
        date: r.date,
      };
    });

    // Helper: Alphabetical sort by employee name (A to Z)
    const sortByAlphabetical = (a, b) => {
      const nameA = String(a.employeeName || a.empName || "").trim().toUpperCase();
      const nameB = String(b.employeeName || b.empName || "").trim().toUpperCase();
      const nameCompare = nameA.localeCompare(nameB);
      if (nameCompare !== 0) return nameCompare;

      const codeA = String(a.ticketNo || a.employeeCode || a.employeeId || "").trim();
      const codeB = String(b.ticketNo || b.employeeCode || b.employeeId || "").trim();
      const numA = parseInt(codeA.replace(/[^0-9]/g, ""), 10);
      const numB = parseInt(codeB.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: "base" });
    };

    unsavedEmployees.sort(sortByAlphabetical);
    savedData.sort(sortByAlphabetical);
    savedData.forEach((rec, index) => {
      rec.slNo = index + 1;
    });

    return res.status(200).json({
      success: true,
      unsavedEmployees,
      employees: unsavedEmployees,
      savedRecords: savedData,
      data: savedData,
    });
  } catch (err) {
    console.error("[getOTHoursMultipleEntry]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveOTHoursMultipleEntry = async (req, res) => {
  const {
    companyId,
    departmentId,
    workedDeptId,
    date,
    shiftId,
    otTypeId,
    fromTime,
    toTime,
    otType = "HOURS OT",
    otHours: rawOtHours,
    employeeIds,
    userId,
  } = req.body;

  if (
    !companyId ||
    !departmentId ||
    !workedDeptId ||
    !date ||
    !shiftId ||
    !Array.isArray(employeeIds) ||
    employeeIds.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Missing required parameters or employeeIds list",
    });
  }

  if (await isDateLocked(companyId, date)) {
    return res.status(403).json({
      success: false,
      message: `Overtime entry is LOCKED for ${moment(date).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
      isLocked: true,
    });
  }

  const { sequelize, ShiftType } = require("../models");
  const transaction = await sequelize.transaction();

  try {
    const targetDate = moment(date).format("YYYY-MM-DD");
    const shiftObj = await ShiftType.findByPk(shiftId);

    // Calculate OT hours from fromTime & toTime if provided
    let calculatedOt = parseFloat(rawOtHours || 0);
    if (fromTime && toTime) {
      const startM = moment(fromTime, ["YYYY-MM-DD HH:mm", "YYYY-MM-DD h:mm A", "HH:mm", "h:mm A"]);
      const endM = moment(toTime, ["YYYY-MM-DD HH:mm", "YYYY-MM-DD h:mm A", "HH:mm", "h:mm A"]);
      if (startM.isValid() && endM.isValid()) {
        let diffHrs = endM.diff(startM, "hours", true);
        if (diffHrs < 0) diffHrs += 24; // overnight shift
        calculatedOt = Math.round(diffHrs * 100) / 100;
      }
    }

    // Apply FULL TIME OT capping rule: if FULL TIME OT and > 8 hours, cap at 8 hours!
    if (String(otType).toUpperCase().includes("FULL TIME") || String(otType).toUpperCase().includes("FULL OT")) {
      if (calculatedOt > 8 || calculatedOt === 0) {
        calculatedOt = 8;
      }
    }

    // Map otType to otTypeId: 2 if FULL TIME OT/FULL OT
    let computedOtTypeId = otTypeId || null;
    if (!computedOtTypeId && otType) {
      if (String(otType).toUpperCase().includes("FULL TIME") || String(otType).toUpperCase().includes("FULL OT")) {
        computedOtTypeId = 2;
      } else if (String(otType).toUpperCase().includes("HOURS")) {
        computedOtTypeId = 1;
      }
    }
    // If FULL OT (otTypeId = 2), check employee-specific weekly off constraint
    if (computedOtTypeId === 2) {
      const targetDay = moment(targetDate).format("dddd"); // e.g. "Sunday", "Monday", ...
      const employees = await Employee.findAll({
        where: { id: { [Op.in]: employeeIds } },
        attributes: ["id", "firstName", "lastName", "employeeCode", "weeklyOff"],
      });

      const invalidEmployees = employees.filter((emp) => {
        const empWeeklyOff = emp.weeklyOff || "Sunday"; // Default to Sunday if null
        return empWeeklyOff.toLowerCase() !== targetDay.toLowerCase();
      });

      if (invalidEmployees.length > 0) {
        const names = invalidEmployees
          .map((emp) => `${emp.firstName} (${emp.employeeCode})`)
          .join(", ");
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot assign FULL OT. The following employee(s) do not have their weekly off on ${targetDay}: ${names}`,
        });
      }
    }

    const empIdList = Array.isArray(employeeIds) ? employeeIds : [];

    // Validate that none of the selected employees already have an OT entry for a DIFFERENT shift on this date
    const alreadySavedDiffShift = await OTHours.findAll({
      where: {
        companyId,
        date: {
          [Op.gte]: moment(targetDate).startOf("day").toDate(),
          [Op.lte]: moment(targetDate).endOf("day").toDate(),
        },
        employeeId: { [Op.in]: empIdList },
        shiftId: { [Op.ne]: shiftId },
      },
      include: [
        { model: Employee, as: "employee", attributes: ["firstName", "employeeCode"] },
        { model: ShiftType, as: "shift", attributes: ["name"] },
      ],
      transaction,
    });

    if (alreadySavedDiffShift.length > 0) {
      await transaction.rollback();
      const conflictDetails = alreadySavedDiffShift
        .map((r) => {
          const name = r.employee ? r.employee.firstName : (r.empName || `ID ${r.employeeId}`);
          const code = r.ticketNo || (r.employee ? r.employee.employeeCode : "");
          const sName = r.shift ? r.shift.name : `Shift ${r.shiftId}`;
          return `${name}${code ? ` (${code})` : ""} in Shift ${sName}`;
        })
        .join(", ");

      return res.status(400).json({
        success: false,
        message: `The following employee(s) already have OT assigned to another shift on ${targetDate}: ${conflictDetails}. An employee cannot have OT assigned in multiple shifts on the same date. Please edit their existing OT entry instead.`,
      });
    }

    for (const empId of employeeIds) {
      const employee = await Employee.findByPk(empId, { transaction });
      const ticketNo = employee
        ? employee.employeeCode || employee.ticketNo || String(employee.id)
        : "";
      const empName = employee ? employee.firstName : "";

      const existing = await OTHours.findOne({
        where: {
          employeeId: empId,
          date: {
            [Op.gte]: moment(targetDate).startOf("day").toDate(),
            [Op.lte]: moment(targetDate).endOf("day").toDate(),
          },
        },
        transaction,
      });

      if (existing) {
        await existing.update(
          {
            companyId,
            departmentId,
            workedDeptId,
            shiftId,
            otTypeId: computedOtTypeId,
            otHours: calculatedOt,
            fromTime: fromTime || null,
            toTime: toTime || null,
            otType: otType || "HOURS OT",
            ticketNo,
            empName,
            updatedBy: userId || 1,
          },
          { transaction }
        );
      } else {
        await OTHours.create(
          {
            companyId,
            departmentId,
            employeeId: empId,
            date: moment(targetDate).toDate(),
            workedDeptId,
            shiftId,
            otTypeId: computedOtTypeId,
            otHours: calculatedOt,
            fromTime: fromTime || null,
            toTime: toTime || null,
            otType: otType || "HOURS OT",
            ticketNo,
            empName,
            createdBy: userId || 1,
            status: "Active",
          },
          { transaction }
        );
      }
    }

    await transaction.commit();
    return res.status(200).json({
      success: true,
      message: "Overtime records saved successfully",
    });
  } catch (err) {
    await transaction.rollback();
    console.error("[saveOTHoursMultipleEntry]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSingleOTEntry = async (req, res) => {
  const { workedDeptId, shiftId, fromTime, toTime, otType, otHours: inputHours, userId, date } = req.body;
  const { id } = req.params;
  try {
    const otRecord = await OTHours.findByPk(id);
    if (!otRecord) {
      return res.status(404).json({ success: false, message: "OT record not found" });
    }

    const targetDate = date || otRecord.date;
    if (await isDateLocked(otRecord.companyId, targetDate)) {
      return res.status(403).json({
        success: false,
        message: `Overtime entry is LOCKED for ${moment(targetDate).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
        isLocked: true,
      });
    }

    let calculatedOt = parseFloat(inputHours || otRecord.otHours || 0);
    if (fromTime && toTime) {
      const startM = moment(fromTime, ["YYYY-MM-DD HH:mm", "YYYY-MM-DD h:mm A", "HH:mm", "h:mm A"]);
      const endM = moment(toTime, ["YYYY-MM-DD HH:mm", "YYYY-MM-DD h:mm A", "HH:mm", "h:mm A"]);
      if (startM.isValid() && endM.isValid()) {
        let diffHrs = endM.diff(startM, "hours", true);
        if (diffHrs < 0) diffHrs += 24;
        calculatedOt = Math.round(diffHrs * 100) / 100;
      }
    }

    const typeStr = otType || otRecord.otType || "HOURS OT";
    if (String(typeStr).toUpperCase().includes("FULL TIME") || String(typeStr).toUpperCase().includes("FULL OT")) {
      if (calculatedOt > 8 || calculatedOt === 0) {
        calculatedOt = 8;
      }
    }

    if (shiftId) {
      const targetDate = date ? moment(date).format("YYYY-MM-DD") : moment(otRecord.date).format("YYYY-MM-DD");
      const existingDuplicate = await OTHours.findOne({
        where: {
          id: { [Op.ne]: otRecord.id },
          companyId: otRecord.companyId,
          employeeId: otRecord.employeeId,
          date: {
            [Op.gte]: moment(targetDate).startOf("day").toDate(),
            [Op.lte]: moment(targetDate).endOf("day").toDate(),
          },
        },
      });

      if (existingDuplicate) {
        return res.status(400).json({
          success: false,
          message: `Cannot change shift: this employee already has an OT entry on ${targetDate}.`,
        });
      }
    }

    const updateFields = {
      workedDeptId: workedDeptId || otRecord.workedDeptId,
      shiftId: shiftId || otRecord.shiftId,
      fromTime: fromTime || otRecord.fromTime,
      toTime: toTime || otRecord.toTime,
      otType: typeStr,
      otHours: calculatedOt,
      updatedBy: userId || 1,
    };

    if (date) {
      updateFields.date = moment(date).format("YYYY-MM-DD");
    }

    await otRecord.update(updateFields);

    return res.status(200).json({
      success: true,
      message: "Overtime record updated successfully",
      data: otRecord,
    });
  } catch (err) {
    console.error("[updateSingleOTEntry]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteOTHoursMultipleEntry = async (req, res) => {
  const { ids, companyId, date, employeeIds } = req.body;

  try {
    const targetDate = date ? moment(date).format("YYYY-MM-DD") : null;

    if (companyId && targetDate && (await isDateLocked(companyId, targetDate))) {
      return res.status(403).json({
        success: false,
        message: `Overtime entry is LOCKED for ${targetDate}. Please unlock the date in the Strength Report to make changes.`,
        isLocked: true,
      });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const firstRec = await OTHours.findByPk(ids[0]);
      if (firstRec && (await isDateLocked(firstRec.companyId, firstRec.date))) {
        return res.status(403).json({
          success: false,
          message: `Overtime entry is LOCKED for ${moment(firstRec.date).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
          isLocked: true,
        });
      }
    }

    if (Array.isArray(ids) && ids.length > 0) {
      await OTHours.destroy({
        where: { id: { [Op.in]: ids } },
      });
    } else if (companyId && targetDate && Array.isArray(employeeIds) && employeeIds.length > 0) {
      await OTHours.destroy({
        where: {
          companyId,
          date: {
            [Op.gte]: moment(targetDate).startOf("day").toDate(),
            [Op.lte]: moment(targetDate).endOf("day").toDate(),
          },
          employeeId: { [Op.in]: employeeIds },
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Provide array of 'ids' to delete",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Overtime records deleted successfully",
    });
  } catch (err) {
    console.error("[deleteOTHoursMultipleEntry]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};