const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const HolidayList = sequelize.define('HolidayList', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING, allowNull: false },
        startDate: { type: DataTypes.DATEONLY, allowNull: false },
        endDate: { type: DataTypes.DATEONLY, allowNull: false },
        weekOffs: { type: DataTypes.JSON, allowNull: false, defaultValue: { sunday: true, saturday: false, friday: false } },
        status: { type: DataTypes.ENUM('Active', 'Inactive'), allowNull: false, defaultValue: 'Active' },
        companyId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'companies', key: 'id' }, onDelete: 'CASCADE' },
    }, {
        tableName: 'holiday_lists',
        timestamps: true,
        validate: {
            datesAreValid() { if (this.startDate >= this.endDate) throw new Error('End date must be after the start date.'); }
        },
    });
    return HolidayList;
};