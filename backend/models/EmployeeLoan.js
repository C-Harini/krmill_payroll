// models/EmployeeLoan.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const EmployeeLoan = sequelize.define('EmployeeLoan', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'companies',
        key: 'id'
      }
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
 loanType: {
  type: DataTypes.STRING,
  allowNull: false,
  defaultValue: 'Advance'
},
    loanAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Total loan amount sanctioned'
    },
    interestRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Interest rate percentage (if applicable)'
    },
    sanctionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date when loan was sanctioned'
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date from which deduction starts'
    },
    numberOfInstallments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Total number of installments'
    },
    installmentAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Amount to be deducted per month'
    },
    paidInstallments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of installments paid so far'
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total amount paid so far'
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Current status of the loan'
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'employees',
        key: 'id'
      },
      comment: 'Employee ID who approved the loan'
    },
    approvedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date when loan was approved'
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional remarks or notes'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for taking the loan'
    }
  }, {
    tableName: 'employee_loans',
    timestamps: true,
    indexes: [
      {
        fields: ['employeeId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['sanctionDate']
      }
    ]
  });

  EmployeeLoan.associate = (models) => {
    EmployeeLoan.belongsTo(models.Employee, {
      foreignKey: 'employeeId',
      as: 'employee'
    });

    EmployeeLoan.belongsTo(models.Employee, {
      foreignKey: 'approvedBy',
      as: 'approver'
    });
  };

  return EmployeeLoan;
};
