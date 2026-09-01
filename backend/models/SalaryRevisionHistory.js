const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const SalaryRevisionHistory = sequelize.define('SalaryRevisionHistory', {
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
        },
        oldSalaryMasterId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Previous salary structure (null for initial assignment)',
            references: {
                model: 'employee_salary_masters',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
        newSalaryMasterId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'New salary structure',
            references: {
                model: 'employee_salary_masters',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        revisionDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'Date when revision becomes effective',
        },
        revisionType: {
            type: DataTypes.ENUM('Initial', 'Annual_Hike', 'Promotion', 'Special_Increment', 'Correction', 'Transfer'),
            allowNull: false,
        },
        // Comparison Data
        oldBasicSalary: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            comment: 'Previous basic salary',
        },
        newBasicSalary: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            comment: 'New basic salary',
        },
        oldGrossSalary: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            comment: 'Previous gross salary',
        },
        newGrossSalary: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            comment: 'New gross salary',
        },
        oldCTC: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            comment: 'Previous annual CTC',
        },
        newCTC: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            comment: 'New annual CTC',
        },
        incrementAmount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            comment: 'Absolute increment amount',
        },
        incrementPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            comment: 'Percentage increase',
        },
        // Metadata
        reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Reason for revision',
        },
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
        processedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'User ID who processed this revision',
        },
    }, {
        tableName: 'salary_revision_history',
        timestamps: true,
        indexes: [
            {
                fields: ['employeeId', 'revisionDate']
            },
            {
                fields: ['revisionType']
            },
            {
                fields: ['companyId']
            }
        ]
    });

    return SalaryRevisionHistory;
};