const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const Deduction = sequelize.define('Deduction', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'employees', key: 'id' },
            onDelete: 'CASCADE',
        },
        departmentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'departments', key: 'id' },
            onDelete: 'CASCADE',
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'id' },
            onDelete: 'CASCADE',
        },
        month: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1, max: 12 },
        },
        year: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        deductionType: {
            type: DataTypes.ENUM('Mess', 'Stores', 'EB', 'Others', 'Advance'),
            allowNull: false,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        remarks: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    }, {
        tableName: 'deductions',
        timestamps: true,
        indexes: [{
            unique: true,
            fields: ['employeeId', 'month', 'year', 'deductionType'],
            name: 'unique_employee_deduction_per_month',
        }],
    });

    return Deduction;
};