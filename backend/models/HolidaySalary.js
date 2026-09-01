const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const HolidaySalary = sequelize.define(
    "HolidaySalary",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "companies", key: "id" },
        onDelete: "CASCADE",
      },
      employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "employees", key: "id" },
        onDelete: "CASCADE",
      },
      departmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      employmentTypeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      holidayId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "holidays", key: "id" },
        onDelete: "CASCADE",
      },
      holidayDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      holidayName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      attendanceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "attendances", key: "id" },
        onDelete: "SET NULL",
      },
      shiftName: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      attendanceStatus: {
        type: DataTypes.ENUM(
          "Present",
          "Present with Permission",
          "Half Day"
        ),
        allowNull: false,
      },
      // Workers only — from EmployeeSalaryComponent where componentCode='BASIC'
      basicAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Per-day BASIC from EmployeeSalaryComponent",
      },
      holidayPay: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "basicAmount for full day; basicAmount/2 for half day",
      },
      isWorker: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "true if employment type name contains Worker",
      },
      status: {
        type: DataTypes.ENUM("Pending", "Paid"),
        allowNull: false,
        defaultValue: "Pending",
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "holiday_salaries",
      timestamps: true,
      indexes: [
        { fields: ["companyId"] },
        { fields: ["employeeId"] },
        { fields: ["holidayDate"] },
        { fields: ["status"] },
        // Prevent duplicate entries per employee per holiday
        {
          unique: true,
          fields: ["employeeId", "holidayId"],
          name: "unique_employee_holiday",
        },
      ],
    }
  );

  return HolidaySalary;
};
