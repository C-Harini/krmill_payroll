module.exports = (sequelize, DataTypes) => {
  const PackagingIncentive = sequelize.define(
    "PackagingIncentive",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      departmentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      shiftTypeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      entryDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      bagsPacked: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      ratePerBag: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1.0,
      },
      minBagsThreshold: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 45,
      },
      incentiveAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      month: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      remarks: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      tableName: "packaging_incentives",
      timestamps: true,
      indexes: [
        {
          name: "uq_pkg_company_emp_date_shift",
          unique: true,
          fields: ["companyId", "employeeId", "entryDate", "shiftTypeId"],
        },
      ],
    }
  );

  PackagingIncentive.associate = (models) => {
    PackagingIncentive.belongsTo(models.Company, {
      foreignKey: "companyId",
      as: "company",
    });
    PackagingIncentive.belongsTo(models.Department, {
      foreignKey: "departmentId",
      as: "department",
    });
    PackagingIncentive.belongsTo(models.Employee, {
      foreignKey: "employeeId",
      as: "employee",
    });
    PackagingIncentive.belongsTo(models.ShiftType, {
      foreignKey: "shiftTypeId",
      as: "shiftType",
    });
  };

  return PackagingIncentive;
};
