const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const LunchAttendance = sequelize.define(
    "LunchAttendance",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "employees",
          key: "id",
        },
      },
      departmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "departments",
          key: "id",
        },
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "companies",
          key: "id",
        },
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      lunchOutTime: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      lunchInTime: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      shiftId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "shift_types",
          key: "id",
        },
      },
      status: {
        type: DataTypes.ENUM("Normal", "Late IN", "No Punch"),
        allowNull: false,
        defaultValue: "Normal",
      },
    },
    {
      tableName: "lunch_attendances",
      timestamps: true,
    }
  );

  return LunchAttendance;
};
