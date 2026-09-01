module.exports = (sequelize, DataTypes) => {
  const HostelAttendanceIncentive = sequelize.define(
    "HostelAttendanceIncentive",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      departmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      fromDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      toDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("Active", "Inactive"),
        defaultValue: "Active",
      },
    },
    {
      tableName: "hostel_attendance_incentives",
      timestamps: true,
    }
  );

  return HostelAttendanceIncentive;
};
