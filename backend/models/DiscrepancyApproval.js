module.exports = (sequelize, DataTypes) => {
  const DiscrepancyApproval = sequelize.define(
    "DiscrepancyApproval",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "employees", key: "id" },
      },
      attendanceDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      originalStatus: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      approvedStatus: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      documentPath: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      approvedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      approvedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "discrepancy_approvals",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["employeeId", "attendanceDate"],
          name: "unique_employee_discrepancy_date",
        },
        { fields: ["approvedBy"] },
        { fields: ["attendanceDate"] },
      ],
    }
  );

  DiscrepancyApproval.associate = (models) => {
    DiscrepancyApproval.belongsTo(models.Employee, {
      foreignKey: "employeeId",
      as: "employee",
    });
    DiscrepancyApproval.belongsTo(models.User, {
      foreignKey: "approvedBy",
      as: "approvedByUser",
    });
  };

  return DiscrepancyApproval;
};
