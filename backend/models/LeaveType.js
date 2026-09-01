const { DataTypes } = require('sequelize');
const { defaultValueSchemable } = require('sequelize/lib/utils');

module.exports = (sequelize, DataTypes) => {
    const LeaveType = sequelize.define('LeaveType', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        isPaid: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isWithoutPay: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isCarryForwardEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        countHolidaysAsLeave: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        maxConsecutiveLeaves: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                isInt: { msg: 'Maximum consecutive leaves must be an integer.' },
                min: { args: [0], msg: 'Maximum consecutive leaves must be at least 1.' }
            }
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
        tableName: 'leave_types',
        timestamps: true,
        // Custom validation to ensure business rules
        validate: {
            paidLeaveCannotBeWithoutPay() {
                if (this.isPaid && this.isWithoutPay) {
                    throw new Error('A paid leave type cannot also be marked as "Leave Without Pay".');
                }
            },
        },
    });

    return LeaveType;
};