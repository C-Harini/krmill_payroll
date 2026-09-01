module.exports = (sequelize, DataTypes) => {
  const AttendanceIncentive = sequelize.define(
    "AttendanceIncentive",
    {
      companyId: { type: DataTypes.INTEGER, allowNull: false },
      departmentId: { type: DataTypes.INTEGER, allowNull: true },
      employeeId: { type: DataTypes.INTEGER, allowNull: false },
      shiftTypeId: { type: DataTypes.INTEGER, allowNull: true },
      days: { type: DataTypes.INTEGER, allowNull: true },
      entryDate: { type: DataTypes.DATEONLY, allowNull: true },
      slabDays: { type: DataTypes.INTEGER, allowNull: true },
      otDays: { type: DataTypes.INTEGER, allowNull: true },
      slot: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.STRING, defaultValue: "Active" },
      month: { type: DataTypes.INTEGER, allowNull: true },
      year: { type: DataTypes.INTEGER, allowNull: true },
      adjustedDays: { type: DataTypes.INTEGER, allowNull: true },
      incentive: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      ratePerDay: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      shiftKey: { type: DataTypes.STRING, allowNull: true },
      shiftLabel: { type: DataTypes.STRING, allowNull: true },
      tier: { type: DataTypes.STRING, allowNull: true },
      maleOverrideApplied: { type: DataTypes.BOOLEAN, defaultValue: false },
      savedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "attendance_incentives",
      // ← no indexes block here, index already exists in DB
    }
  );

  AttendanceIncentive.associate = (models) => {
    AttendanceIncentive.belongsTo(models.Company, { foreignKey: "companyId", as: "company" });
    AttendanceIncentive.belongsTo(models.Department, { foreignKey: "departmentId", as: "department" });
    AttendanceIncentive.belongsTo(models.Employee, { foreignKey: "employeeId", as: "employee" });
    AttendanceIncentive.belongsTo(models.ShiftType, { foreignKey: "shiftTypeId", as: "shiftType" });
  };

  return AttendanceIncentive;
};