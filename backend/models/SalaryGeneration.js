const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const SalaryGeneration = sequelize.define(
    "SalaryGeneration",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "employees", key: "id" },
        onDelete: "CASCADE",
      },
      employeeSalaryMasterId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "employee_salary_masters", key: "id" },
        onDelete: "RESTRICT",
        comment: "Salary structure used at time of generation",
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "companies", key: "id" },
        onDelete: "CASCADE",
      },
      salaryMonth: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 12 },
        comment: "Month (1-12)",
      },
      salaryYear: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Year (e.g. 2025)",
      },
      payPeriodStart: { type: DataTypes.DATEONLY, allowNull: false },
      payPeriodEnd: { type: DataTypes.DATEONLY, allowNull: false },

      // ── Attendance snapshot ─────────────────────────────
      workingDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Calendar days minus Sundays",
      },
      totalDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Total calendar days in the month",
      },
      presentDays: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Half-days counted as 0.5",
      },
      absentDays: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      paidLeaveDays: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      unpaidLeaveDays: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      holidayDays: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      weekOffDays: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Sundays in the month",
      },
      nhFhDays: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "National / Festival holiday working days",
      },
      overtimeHours: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
      },
      lateCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      earlyExitCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      // ── Earnings ────────────────────────────────────────
      basicSalary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Basic component earned (prorated)",
      },
      grossSalary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Total earnings before deductions",
      },
      totalEarnings: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      attnIncentive: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Attendance incentive from attendance_incentives",
      },
      overtimePay: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      bonus: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },

      // ── Statutory deductions ────────────────────────────
      pfAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Employee PF contribution (12% of basic)",
      },
      esiAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Employee ESI contribution (0.75% of basic+spl)",
      },

      // ── Other deductions ────────────────────────────────
      absentDeduction: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      leaveDeduction: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Unpaid leave deduction",
      },
      loanDeduction: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Loan EMI deducted this month",
      },
      lateDeduction: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      totalDeductions: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },

      // ── Net ─────────────────────────────────────────────
      netSalary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "grossSalary - totalDeductions",
      },
      netRounded: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "netSalary rounded to nearest ₹10",
      },

      // ── Classification for reporting / filter queries ───
      // Derived from designation + employee fields; stored here for fast queries.
      empCategory: {
        type: DataTypes.ENUM("staff", "worker"),
        allowNull: true,
        comment:
          "staff | worker — resolved from Designation.name via payrollConfig",
      },
      empSalaryType: {
        type: DataTypes.ENUM("daily", "monthly"),
        allowNull: true,
        comment: "daily | monthly — from employee.workingType",
      },
      empPfType: {
        type: DataTypes.ENUM("pf", "npf"),
        allowNull: true,
        comment: "pf | npf — from employee.providentFundNumber",
      },

      remarks: { type: DataTypes.TEXT, allowNull: true },

      // ── Workflow ────────────────────────────────────────
      status: {
        type: DataTypes.ENUM(
          "Draft",
          "Generated",
          "Approved",
          "Paid",
          "Cancelled",
        ),
        allowNull: false,
        defaultValue: "Generated",
      },
      generatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      approvedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      approvedAt: { type: DataTypes.DATE, allowNull: true },
      paidBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      paidAt: { type: DataTypes.DATE, allowNull: true },
      paymentMethod: {
        type: DataTypes.ENUM("Bank Transfer", "Cash", "Cheque", "UPI", "Other"),
        allowNull: true,
      },
      paymentReference: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: "salary_generations",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["employeeId", "salaryMonth", "salaryYear"],
          name: "unique_employee_month_year",
        },
        {
          fields: ["companyId", "salaryMonth", "salaryYear"],
          name: "company_month_year_index",
        },
        { fields: ["status"], name: "salary_status_index" },
        { fields: ["empCategory"], name: "emp_category_index" },
        { fields: ["empSalaryType"], name: "emp_salary_type_index" },
        { fields: ["empPfType"], name: "emp_pf_type_index" },
      ],
      validate: {
        checkPeriodDates() {
          if (this.payPeriodStart && this.payPeriodEnd) {
            if (new Date(this.payPeriodStart) > new Date(this.payPeriodEnd))
              throw new Error("Pay period start must be before end date");
          }
        },
      },
    },
  );

 

  return SalaryGeneration;
};
