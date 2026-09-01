const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const SalaryGenerationDetail = sequelize.define(
    "SalaryGenerationDetail",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      salaryGenerationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "salary_generations", key: "id" },
        onDelete: "CASCADE",
      },

      // ── NULL allowed ─────────────────────────────────────
      // PF, ESI, Absent, Leave, Loan, Mess etc. rows have no
      // linked salary_component record — they use componentId: null.
      componentId: {
        type: DataTypes.INTEGER,
        allowNull: true, // changed from NOT NULL
        references: { model: "salary_components", key: "id" },
        onDelete: "SET NULL", // changed from RESTRICT
      },

      componentName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Snapshot of component name at time of generation",
      },
      componentType: {
        type: DataTypes.ENUM("Earning", "Deduction"),
        allowNull: false,
      },

      // Extended: covers engine-generated rows beyond simple Fixed/Percentage/Formula
      calculationType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Fixed",
        comment: [
          "Fixed       — fixed amount deduction (Mess, Store, Loan EMI …)",
          "Percentage  — statutory (PF 12%, ESI 0.75%)",
          "Formula     — formula-driven component",
          "Monthly     — prorated monthly component (staff / worker-monthly)",
          "PerDay      — daily-rated component (worker-daily)",
          "Incentive   — attendance incentive lump sum",
          "NHFHDouble  — NH/FH double wage",
        ].join("\n"),
      },

      baseAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Full-month amount or per-day rate before proration",
      },
      calculatedAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Final amount after all calculations",
      },
      isProrated: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      proratedAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Same as calculatedAmount when prorated",
      },
      formula: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Human-readable formula / rate description",
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "salary_generation_details",
      timestamps: true,
      indexes: [
        {
          fields: ["salaryGenerationId"],
          name: "salary_generation_detail_index",
        },
        {
          fields: ["componentId"],
          name: "component_detail_index",
        },
        {
          fields: ["componentType"],
          name: "component_type_index",
        },
      ],
    },
  );


  return SalaryGenerationDetail;
};
