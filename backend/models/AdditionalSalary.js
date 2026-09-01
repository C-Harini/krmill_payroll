const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AdditionalSalary = sequelize.define(
    "AdditionalSalary",
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

      salaryMonth: {
        type: DataTypes.STRING, // "2026-01"
        allowNull: false,
      },

      salaryComponentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      ticketNo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },

      status: {
        type: DataTypes.ENUM("Active", "Inactive"),
        allowNull: false,
        defaultValue: "Active",
      },
    },
    {
      tableName: "additional_salaries",
      timestamps: true,
    }
  );

  return AdditionalSalary;
};
