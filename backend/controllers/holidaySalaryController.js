// =============================================================
// controllers/holidaySalaryController.js
// =============================================================
// Three endpoints:
//   GET  /api/holiday-salary/fetch   — attendance on a holiday date
//   POST /api/holiday-salary/pay/:id — mark one record Paid
//   POST /api/holiday-salary/pay-all — mark multiple records Paid
//   GET  /api/holiday-salary/report  — month-wise (from–to) report
// =============================================================

const { Op } = require("sequelize");
const db = require("../models");
const {
  HolidaySalary,
  Attendance,
  Employee,
  Department,
  EmploymentType,
  Holiday,
  HolidayList,
  EmployeeSalaryMaster,
  EmployeeSalaryComponent,
  Company,
} = db;

// ─────────────────────────────────────────────────────────────
// HELPER: resolve per-day BASIC amount for an employee
// Returns null if no salary master / BASIC component found
// ─────────────────────────────────────────────────────────────
async function getBasicAmount(employeeId) {
  const master = await EmployeeSalaryMaster.findOne({
    where: {
      employeeId,
      effectiveTo: null, // current active salary
    },
    order: [["effectiveFrom", "DESC"]],
  });
  if (!master) return null;

  const comp = await EmployeeSalaryComponent.findOne({
    where: {
      employeeSalaryMasterId: master.id,
      componentCode: "BASIC",
    },
  });
  return comp ? parseFloat(comp.calculatedAmount) : null;
}

// ─────────────────────────────────────────────────────────────
// GET /api/holiday-salary/fetch
// Query: companyId, date, holidayListId, employmentTypeId, departmentId (opt)
// ─────────────────────────────────────────────────────────────
exports.fetchHolidayAttendance = async (req, res) => {
  try {
    const { companyId, date, holidayListId, employmentTypeId, departmentId } =
      req.query;

    if (!companyId || !date || !holidayListId || !employmentTypeId) {
      return res.status(400).json({
        success: false,
        error: "companyId, date, holidayListId and employmentTypeId are required",
      });
    }

    // 1. Verify the date is actually a holiday in the selected list
    const holidays = await Holiday.findAll({
      where: {
        date,
        holidayListId,
        type: "Holiday",
      },
    });

    if (!holidays.length) {
      return res.json({
        success: true,
        isHoliday: false,
        holidays: [],
        rows: [],
        summary: null,
      });
    }

    // 2. Resolve employment type details
    const empType = await EmploymentType.findByPk(employmentTypeId);
    if (!empType) {
      return res.status(404).json({ success: false, error: "Employment type not found" });
    }
    const isWorker = empType.name.toLowerCase().includes("worker");

    // 3. Build employee WHERE clause
    const employeeWhere = {
      companyId,
      employmentTypeId,
      status: "Active",
    };
    if (departmentId) employeeWhere.departmentId = departmentId;

    // 4. Fetch all attendance records for that date + company + employment type
    const attendances = await Attendance.findAll({
      where: {
        companyId,
        attendanceDate: date,
        status: {
          [Op.in]: ["Present", "Present with Permission", "Half Day"],
        },
      },
      include: [
        {
          model: Employee,
          as: "employee",
          where: employeeWhere,
          attributes: [
            "id",
            "employeeCode",
            "firstName",
            "lastName",
            "departmentId",
            "employmentTypeId",
          ],
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["id", "departmentname"],
            },
            {
              model: EmploymentType,
              as: "employmentType",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      attributes: [
        "id",
        "employeeId",
        "attendanceDate",
        "shiftName",
        "status",
        "firstCheckIn",
        "lastCheckOut",
        "workingHours",
      ],
    });

    if (!attendances.length) {
      return res.json({
        success: true,
        isHoliday: true,
        holidays: holidays.map((h) => ({ id: h.id, name: h.description, date: h.date })),
        rows: [],
        summary: {
          totalPresent: 0,
          halfDay: 0,
          totalPay: 0,
          paid: 0,
          pending: 0,
          isWorker,
        },
      });
    }

    // 5. Build rows — one row per attendance × holiday (if multiple holidays same date)
    const rows = [];

    for (const att of attendances) {
      const emp = att.employee;
      const isHalfDay = att.status === "Half Day";

      for (const holiday of holidays) {
        // Check if a HolidaySalary record already exists
        const existing = await HolidaySalary.findOne({
          where: { employeeId: emp.id, holidayId: holiday.id },
        });

        let basicAmount = null;
        let holidayPay = null;

        if (isWorker) {
          basicAmount = await getBasicAmount(emp.id);
          if (basicAmount !== null) {
            holidayPay = isHalfDay
              ? parseFloat((basicAmount / 2).toFixed(2))
              : basicAmount;
          }
        }

        // If no existing record, create a Pending one automatically
        let record = existing;
        if (!record) {
          record = await HolidaySalary.create({
            companyId,
            employeeId: emp.id,
            departmentId: emp.departmentId,
            employmentTypeId: emp.employmentTypeId,
            holidayId: holiday.id,
            holidayDate: date,
            holidayName: holiday.description,
            attendanceId: att.id,
            shiftName: att.shiftName,
            attendanceStatus: att.status,
            basicAmount: isWorker ? basicAmount : null,
            holidayPay: isWorker ? holidayPay : null,
            isWorker,
            status: "Pending",
          });
        }

        rows.push({
          id: record.id,
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: emp.firstName,
          departmentId: emp.departmentId,
          departmentName: emp.department?.departmentname || "",
          employmentTypeName: emp.employmentType?.name || "",
          shiftName: att.shiftName,
          attendanceStatus: att.status,
          firstCheckIn: att.firstCheckIn,
          lastCheckOut: att.lastCheckOut,
          workingHours: att.workingHours,
          holidayId: holiday.id,
          holidayName: holiday.description,
          basicAmount,
          holidayPay,
          isWorker,
          status: record.status,
          paidAt: record.paidAt,
        });
      }
    }

    // 6. Summary (workers only for financial metrics)
    const workerRows = rows.filter((r) => r.isWorker);
    const summary = {
      totalPresent: rows.length,
      halfDay: rows.filter((r) => r.attendanceStatus === "Half Day").length,
      totalPay: workerRows.reduce((s, r) => s + (r.holidayPay || 0), 0),
      paid: workerRows.filter((r) => r.status === "Paid").length,
      pending: workerRows.filter((r) => r.status === "Pending").length,
      isWorker,
    };

    return res.json({
      success: true,
      isHoliday: true,
      holidays: holidays.map((h) => ({ id: h.id, name: h.description, date: h.date })),
      rows,
      summary,
    });
  } catch (err) {
    console.error("fetchHolidayAttendance error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/holiday-salary/pay/:id   — mark single record Paid
// ─────────────────────────────────────────────────────────────
exports.markPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await HolidaySalary.findByPk(id);
    if (!record) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }
    await record.update({ status: "Paid", paidAt: new Date() });
    return res.json({ success: true, record });
  } catch (err) {
    console.error("markPaid error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/holiday-salary/pay-all   — mark multiple Paid
// Body: { ids: [1,2,3] }
// ─────────────────────────────────────────────────────────────
exports.payAll = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, error: "ids array required" });
    }
    await HolidaySalary.update(
      { status: "Paid", paidAt: new Date() },
      { where: { id: { [Op.in]: ids }, status: "Pending" } }
    );
    return res.json({ success: true, updated: ids.length });
  } catch (err) {
    console.error("payAll error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/holiday-salary/report
// Query: companyId, from, to, departmentId (opt)
// Returns rows grouped by holiday date × employment type
// ─────────────────────────────────────────────────────────────
exports.getMonthReport = async (req, res) => {
  try {
    const { companyId, from, to, departmentId } = req.query;
    if (!companyId || !from || !to) {
      return res.status(400).json({
        success: false,
        error: "companyId, from and to are required",
      });
    }

    const where = {
      companyId,
      holidayDate: { [Op.between]: [from, to] },
    };
    if (departmentId) where.departmentId = departmentId;

    const records = await HolidaySalary.findAll({
      where,
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "employeeCode", "firstName", "lastName"],
          include: [
            {
              model: EmploymentType,
              as: "employmentType",
              attributes: ["id", "name"],
            },
            {
              model: Department,
              as: "department",
              attributes: ["id", "departmentname"],
            },
          ],
        },
      ],
      order: [
        ["holidayDate", "ASC"],
        ["holidayName", "ASC"],
      ],
    });

    // Group by holidayDate + holidayName + employmentType
    const groupMap = {};
    for (const r of records) {
      const empTypeName = r.employee?.employmentType?.name || "Unknown";
      const key = `${r.holidayDate}__${r.holidayName}__${empTypeName}`;
      if (!groupMap[key]) {
        groupMap[key] = {
          holidayDate: r.holidayDate,
          holidayName: r.holidayName,
          employmentTypeName: empTypeName,
          isWorker: r.isWorker,
          present: 0,
          halfDay: 0,
          totalPay: 0,
          paid: 0,
          paidAmount: 0,
          pending: 0,
          pendingAmount: 0,
        };
      }
      const g = groupMap[key];
      g.present++;
      if (r.attendanceStatus === "Half Day") g.halfDay++;
      if (r.isWorker) {
        const pay = parseFloat(r.holidayPay || 0);
        g.totalPay += pay;
        if (r.status === "Paid") {
          g.paid++;
          g.paidAmount += pay;
        } else {
          g.pending++;
          g.pendingAmount += pay;
        }
      }
    }

    const groups = Object.values(groupMap).map((g) => ({
      ...g,
      totalPay: parseFloat(g.totalPay.toFixed(2)),
      paidAmount: parseFloat(g.paidAmount.toFixed(2)),
      pendingAmount: parseFloat(g.pendingAmount.toFixed(2)),
      payStatus: !g.isWorker
        ? "attendance_only"
        : g.pending === 0
        ? "fully_paid"
        : g.paid === 0
        ? "unpaid"
        : "partial",
    }));

    // Summary totals (workers only)
    const workerGroups = groups.filter((g) => g.isWorker);
    const summary = {
      totalHolidays: [...new Set(groups.map((g) => g.holidayDate))].length,
      totalPaid: parseFloat(
        workerGroups.reduce((s, g) => s + g.paidAmount, 0).toFixed(2)
      ),
      totalPending: parseFloat(
        workerGroups.reduce((s, g) => s + g.pendingAmount, 0).toFixed(2)
      ),
      workersCovered: records.filter((r) => r.isWorker).length,
    };

    return res.json({ success: true, groups, summary });
  } catch (err) {
    console.error("getMonthReport error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
