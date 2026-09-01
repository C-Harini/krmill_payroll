const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const EmployeeSalaryComponent = sequelize.define('EmployeeSalaryComponent', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        employeeSalaryMasterId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'employee_salary_masters',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        componentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'salary_components',
                key: 'id',
            },
            onDelete: 'RESTRICT',
        },
        // Stored for history (in case component is modified/deleted later)
        componentName: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Component name stored for historical reference',
        },
        componentCode: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Component code stored for historical reference',
        },
        componentType: {
            type: DataTypes.ENUM('Earning', 'Deduction'),
            allowNull: false,
        },
        // Calculation Details
        valueType: {
            type: DataTypes.ENUM('Fixed', 'Percentage', 'Formula'),
            allowNull: false,
            comment: 'How this component is calculated',
        },
        fixedAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Used when valueType is Fixed',
        },
        percentageValue: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Used when valueType is Percentage (e.g., 40 for 40%)',
        },
        percentageBase: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Component code to calculate percentage on (e.g., BASIC, GROSS)',
        },
        formulaId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'formulas',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
        formulaExpression: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Stored formula expression for historical reference',
        },
        // Calculated/Final Amount (stored for this version)
        calculatedAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: 'Final monthly amount for this component',
        },
        annualAmount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            comment: 'Annual amount (calculatedAmount * 12)',
        },
        // Properties (copied from master for historical reference)
        isStatutory: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Whether this is a statutory component (PF, ESI, etc.)',
        },
        isTaxable: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Whether this component is taxable',
        },
        affectsGrossSalary: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Whether this affects gross salary calculation',
        },
        affectsNetSalary: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Whether this affects net salary calculation',
        },
        displayOrder: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Order for display in payslip',
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName: 'employee_salary_components',
        timestamps: true,
        indexes: [
            {
                fields: ['employeeSalaryMasterId']
            },
            {
                fields: ['componentId']
            },
            {
                fields: ['componentCode']
            }
        ],
        validate: {
            validateCalculationType() {
                if (this.valueType === 'Fixed' && !this.fixedAmount) {
                    throw new Error('fixedAmount is required when valueType is Fixed');
                }
                if (this.valueType === 'Percentage' && (!this.percentageValue || !this.percentageBase)) {
                    throw new Error('percentageValue and percentageBase are required when valueType is Percentage');
                }
                if (this.valueType === 'Formula' && !this.formulaExpression) {
        throw new Error('formulaExpression is required when valueType is Formula');
    }
            }
        }
    });

    return EmployeeSalaryComponent;
};