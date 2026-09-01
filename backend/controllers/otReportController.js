const { OTHours, Company, Department, Employee, EmployeeSalaryMaster } = require("../models");
const { Op, fn, col, literal } = require("sequelize");

// ✅ GET OT Report (Monthly, by Company + Departments)
exports.getOTReport = async (req, res) => {
  try {
    const { companyId, departmentIds, year, month } = req.query;

    // ── Validation ──────────────────────────────────────────────
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }
    if (!departmentIds) {
      return res.status(400).json({ message: "departmentIds is required (comma-separated)" });
    }
    if (!year || !month) {
      return res.status(400).json({ message: "year and month are required" });
    }

    const yearNum  = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: "Invalid year or month" });
    }

    // ── Date Range ───────────────────────────────────────────────
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate   = new Date(yearNum, monthNum, 1); // exclusive

    // ── Department IDs (comma-separated → array of ints) ────────
    const deptIdArray = departmentIds
      .split(",")
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    if (deptIdArray.length === 0) {
      return res.status(400).json({ message: "No valid departmentIds provided" });
    }

    // ── Fetch OT Records ─────────────────────────────────────────
    const otRecords = await OTHours.findAll({
      where: {
        companyId,
        departmentId: { [Op.in]: deptIdArray },
        date: { [Op.gte]: startDate, [Op.lt]: endDate },
      },
      include: [
        { model: Company,    as: "company",    attributes: ["id", "companyName"] },
        { model: Department, as: "department", attributes: ["id", "departmentname", ["departmentname", "departmentName"], ["departmentname", "name"]] },
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "employeeCode", "firstName", "lastName"],
          include: [
            {
              model: EmployeeSalaryMaster,
              as: "EmployeeSalaryMasters",
              where: { status: "Active" },
              required: false,
              attributes: ["id", "basicSalary", "effectiveFrom", "status"],
            },
          ],
        },
      ],
      order: [["date", "ASC"]],
    });

    // ── Group by Employee ────────────────────────────────────────
    const grouped = {};

    otRecords.forEach((record) => {
      const empId = record.employeeId;

      if (!grouped[empId]) {
        // Resolve active basicSalary
        let basicSalary = 0;
        const salaries = record.employee?.EmployeeSalaryMasters;

        if (Array.isArray(salaries) && salaries.length > 0) {
          const sorted = [...salaries]
            .filter((s) => s.status === "Active")
            .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom));

          basicSalary = parseFloat(sorted[0]?.basicSalary || 0);
        }

        // OT hourly rate = basicSalary / 26 working days / 8 hours
        const hourlyRate = basicSalary / 26 / 8;

        grouped[empId] = {
          employeeId:   empId,
          employeeCode: record.employee?.employeeCode || "N/A",
          employeeName: record.employee?.firstName || "",
          department:   record.department?.departmentName || record.department?.name || "N/A",
          departmentId: record.departmentId,
          basicSalary,
          hourlyRate,
          dailyOT:  {},   // { day: hours }
          totalOT:  0,
          otAmount: 0,
        };
      }

      // Store daily OT hours by day-of-month
      const day = new Date(record.date).getDate();
      grouped[empId].dailyOT[day] = parseFloat(record.otHours);
    });

    // ── Calculate Totals ─────────────────────────────────────────
    Object.values(grouped).forEach((emp) => {
      emp.totalOT  = Object.values(emp.dailyOT).reduce((sum, h) => sum + h, 0);
      emp.otAmount = parseFloat((emp.totalOT * emp.hourlyRate).toFixed(2));
      emp.totalOT  = parseFloat(emp.totalOT.toFixed(2));
    });

    // ── Sort by Employee Name ────────────────────────────────────
    const reportData = Object.values(grouped).sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName)
    );

    // ── Summary ──────────────────────────────────────────────────
    const summary = {
      totalEmployees:  reportData.length,
      totalOTHours:    parseFloat(reportData.reduce((s, e) => s + e.totalOT,  0).toFixed(2)),
      totalOTAmount:   parseFloat(reportData.reduce((s, e) => s + e.otAmount, 0).toFixed(2)),
      month:           monthNum,
      year:            yearNum,
      companyId:       parseInt(companyId),
      departmentIds:   deptIdArray,
    };

    return res.json({ summary, reportData });
  } catch (error) {
    console.error("Error generating OT report:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ GET OT Report Summary (Total OT per Employee for a date range)
exports.getOTReportSummary = async (req, res) => {
  try {
    const { companyId, departmentId, startDate, endDate } = req.query;

    if (!companyId || !startDate || !endDate) {
      return res.status(400).json({ message: "companyId, startDate, and endDate are required" });
    }

    const where = {
      companyId,
      date: {
        [Op.gte]: new Date(startDate),
        [Op.lt]:  new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)),
      },
    };

    if (departmentId) where.departmentId = departmentId;

    const stats = await OTHours.findAll({
      attributes: [
        "employeeId",
        [fn("SUM", col("otHours")), "totalOTHours"],
        [fn("COUNT", col("id")),    "dayCount"],
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
              where: { status: "Active" },
              required: false,
              attributes: ["basicSalary", "effectiveFrom"],
            },
          ],
        },
        { model: Department, as: "department", attributes: ["id", "departmentname", ["departmentname", "departmentName"], ["departmentname", "name"]] },
      ],
      group: ["employeeId"],
      subQuery: false,
      raw: false,
    });

    return res.json({ stats });
  } catch (error) {
    console.error("Error fetching OT report summary:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};