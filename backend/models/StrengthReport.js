// models/StrengthReport.js

module.exports = (sequelize, DataTypes) => {
  const StrengthReport = sequelize.define("StrengthReport", {
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "companies",
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

    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "category",
        key: "id",
      },
    },

    // Common Days
    days: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // SHIFT 1
    s1_full: DataTypes.INTEGER,
    s1_training: DataTypes.INTEGER,
    s1_conv: DataTypes.INTEGER,
    s1_ot_hrs: DataTypes.FLOAT,
    s1_ot_con: DataTypes.INTEGER,
    s1_total: DataTypes.FLOAT,

    // SHIFT 2
    s2_full: DataTypes.INTEGER,
    s2_training: DataTypes.INTEGER,
    s2_conv: DataTypes.INTEGER,
    s2_ot_hrs: DataTypes.FLOAT,
    s2_ot_con: DataTypes.INTEGER,
    s2_total: DataTypes.FLOAT,

    // SHIFT 3
    s3_full: DataTypes.INTEGER,
    s3_training: DataTypes.INTEGER,
    s3_conv: DataTypes.INTEGER,
    s3_ot_hrs: DataTypes.FLOAT,
    s3_ot_con: DataTypes.INTEGER,
    s3_total: DataTypes.FLOAT,

    overall_conv: DataTypes.FLOAT,
    overall_strength: DataTypes.FLOAT,
  });

  return StrengthReport;
};