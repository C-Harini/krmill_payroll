const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const LeavePolicy = sequelize.define('LeavePolicy', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        leaveType: {
            type: DataTypes.ENUM('Sick Leave', 'Annual Leave', 'Maternity Leave', 'Paternity Leave', 'Casual Leave', 'Compensatory Off'),
            allowNull: false,
        },
        employmentTypeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'employment_types',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
        accrualFrequency: {
            type: DataTypes.ENUM('Monthly', 'Quarterly', 'Yearly', 'On Joining'),
            allowNull: false,
            defaultValue: 'Yearly',
        },
        accrualDays: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        maxCarryForward: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        allowEncashment: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        encashmentRules: {
            type: DataTypes.TEXT,
            allowNull: true,
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
        status: {
            type: DataTypes.ENUM('Active', 'Inactive'),
            allowNull: false,
            defaultValue: 'Active',
        },
    }, {
        tableName: 'leave_policies',
        timestamps: true,
    });

    return LeavePolicy;
};