const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const OTHours = sequelize.define(
    "OTHours",
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

      date: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      otHours: {
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

      otTypeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      fromTime: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      toTime: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      otType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "HOURS OT",
      },

      ticketNo: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      empName: {
        type: DataTypes.STRING(150),
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
      tableName: "ot_hours",
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
          fields: ["employeeId", "date"],
          unique: true,
        },
      ],
    }
  );

  return OTHours;
};