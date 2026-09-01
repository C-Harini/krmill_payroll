const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SalaryComponent = sequelize.define('SalaryComponent', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM('Earning', 'Deduction'),
            allowNull: false,
        },
        calculationType: {
            type: DataTypes.ENUM('Fixed', 'Percentage', 'Formula'),
            allowNull: false,
            defaultValue: 'Fixed',
        },
        percentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Used when calculationType is Percentage',
        },
        formula: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Mathematical expression when calculationType is Formula. E.g., "basic * 0.12" or "(basic + da) * 0.10"',
        },
        affectsGrossSalary: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Whether this component is part of gross salary calculation',
        },
        affectsNetSalary: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        isTaxable: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        isStatutory: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Statutory components like PF, ESI, Professional Tax',
        },
        displayOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Order in which to display in payslip',
        },
        status: {
            type: DataTypes.ENUM('Active', 'Inactive'),
            allowNull: false,
            defaultValue: 'Active',
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
    }, {
        tableName: 'salary_components',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['code', 'companyId']
            }
        ]
    });

    return SalaryComponent;
};