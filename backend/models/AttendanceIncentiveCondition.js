module.exports = (sequelize, DataTypes) => {
  const AttendanceIncentiveCondition = sequelize.define(
    "AttendanceIncentiveCondition",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      departmentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      shiftTypeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      gender: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "ALL", // ALL, MALE, FEMALE
      },
      gradeKey: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      gradeName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      shiftRuleKey: {
        type: DataTypes.STRING,
        allowNull: false, // SHIFT_I, SHIFT_II, SHIFT_III, SHIFT_I_II_AND_I_III, SHIFT_I_II_III_AND_II_III, etc.
      },
      shiftLabel: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      minDays: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 22,
      },
      lowTierDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 23,
      },
      lowTierRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      highTierDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 24,
      },
      highTierRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      minComboDays: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 12,
      },
      maleExpOverride: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      maleExpThreshold: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 3,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "Active",
      },
      remarks: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "attendance_incentive_conditions",
      timestamps: true,
    }
  );

  AttendanceIncentiveCondition.associate = (models) => {
    if (models.Company) {
      AttendanceIncentiveCondition.belongsTo(models.Company, {
        foreignKey: "companyId",
        as: "company",
      });
    }
    if (models.Department) {
      AttendanceIncentiveCondition.belongsTo(models.Department, {
        foreignKey: "departmentId",
        as: "department",
      });
    }
    if (models.Category) {
      AttendanceIncentiveCondition.belongsTo(models.Category, {
        foreignKey: "categoryId",
        as: "category",
      });
    }
  };

  return AttendanceIncentiveCondition;
};
