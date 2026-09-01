const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const LeavePeriod = sequelize.define('LeavePeriod', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        startDate: {
            type: DataTypes.DATEONLY, // Use DATEONLY for just the date part
            allowNull: false,
        },
        endDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
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
        tableName: 'leave_periods',
        timestamps: true,
        // Add a custom validation to ensure start date is before end date
        validate: {
            datesAreValid() {
                if (this.startDate >= this.endDate) {
                    throw new Error('End date must be after the start date.');
                }
            },
        },
    });

    return LeavePeriod;
};