module.exports = (sequelize, DataTypes) => {
  const EmployeeShift = sequelize.define(
    "EmployeeShift",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // ── Who ─────────────────────────────
      employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      // ── Shift Details ───────────────────
      shiftName: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      scheduledStartTime: {
        type: DataTypes.STRING(5), // HH:mm
        allowNull: true,
      },
      scheduledEndTime: {
        type: DataTypes.STRING(5), // HH:mm
        allowNull: true,
      },

      // ── Month / Year ────────────────────
      month: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 12 },
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      // ── Attendance Counts ───────────────
      totalDays: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      presentDays: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      presentWithPermissionDays: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      absentDays: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      leaveDays: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      lateDays: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      earlyExitDays: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      // ── Hours ───────────────────────────
      totalWorkingHours: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
      totalOvertimeHours: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },

      // ── Permission Minutes ──────────────
      totalPermissionMinutes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      // ── Date Range ──────────────────────
      firstSeenDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      lastSeenDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      tableName: "employee_shifts",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["employeeId", "companyId", "shiftName", "month", "year"],
          name: "uq_emp_shift_month",
        },
        {
          fields: ["companyId", "month", "year"],
          name: "idx_company_period",
        },
        {
          fields: ["employeeId", "year"],
          name: "idx_emp_year",
        },
        {
          fields: ["shiftName", "month", "year"],
          name: "idx_shift_period",
        },
      ],
    },
  );

  EmployeeShift.associate = (models) => {
    EmployeeShift.belongsTo(models.Employee, {
      foreignKey: "employeeId",
      as: "employee",
    });
  };

  return EmployeeShift;
};
