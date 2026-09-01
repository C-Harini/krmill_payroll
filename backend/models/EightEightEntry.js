const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const EightEightEntry = sequelize.define(
    "EightEightEntry",
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
        allowNull: true,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      entryType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      hours: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      workedDeptId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      shiftId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("Active", "Inactive"),
        allowNull: false,
        defaultValue: "Active",
      },
    },
    {
      tableName: "eight_eight_entries",
      timestamps: true,
      indexes: [
        {
          fields: ["companyId"],
        },
        {
          fields: ["departmentId"],
        },
        {
          fields: ["employeeId"],
        },
        {
          fields: ["date"],
        },
        {
          fields: ["employeeId", "date", "entryType"],
          unique: true,
        },
      ],
    }
  );

  return EightEightEntry;
};
