const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const EmployeeSalaryMaster = sequelize.define('EmployeeSalaryMaster', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'employees',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        // Salary Period
        effectiveFrom: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'Date from which this salary structure is effective',
        },
        effectiveTo: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            comment: 'Date until which this salary structure is effective (NULL = current)',
        },
        // High-level Salary Info
        basicSalary: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            comment: 'Basic salary component',
        },
        grossSalary: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            comment: 'Total of all earnings',
        },
        totalDeductions: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
            comment: 'Total monthly deductions',
        },
        netSalary: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            comment: 'Take home = Gross - Deductions',
        },
        ctcAnnual: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            comment: 'Annual Cost to Company',
        },
        ctcMonthly: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            comment: 'Monthly CTC',
        },
        // Revision Info
        revisionType: {
            type: DataTypes.ENUM('Initial', 'Annual_Hike', 'Promotion', 'Special_Increment', 'Correction', 'Transfer'),
            allowNull: false,
            defaultValue: 'Initial',
            comment: 'Type of salary revision',
        },
        revisionPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Hike percentage (e.g., 10.50 for 10.5%)',
        },
        previousSalaryId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Reference to previous salary structure',
            references: {
                model: 'employee_salary_masters',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
        // Status
        status: {
            type: DataTypes.ENUM('Draft', 'Active', 'Superseded', 'Cancelled'),
            allowNull: false,
            defaultValue: 'Active',
            comment: 'Active = current salary, Superseded = replaced by new revision',
        },
        // Metadata
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        approvedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'User ID who approved this revision',
        },
        approvedDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'User ID who created this record',
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'User ID who last updated this record',
        },
    }, {
        tableName: 'employee_salary_masters',
        timestamps: true,
        indexes: [
            {
                fields: ['employeeId', 'effectiveFrom']
            },
            {
                fields: ['employeeId', 'status']
            },
            {
                fields: ['companyId', 'effectiveFrom']
            }
        ],
        validate: {
            effectiveDateRange() {
                if (this.effectiveTo && this.effectiveFrom > this.effectiveTo) {
                    throw new Error('effectiveFrom must be before effectiveTo');
                }
            }
        }
    });

    return EmployeeSalaryMaster;
};