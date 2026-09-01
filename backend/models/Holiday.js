const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const Holiday = sequelize.define('Holiday', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        date: { type: DataTypes.DATEONLY, allowNull: false },
        description: { type: DataTypes.STRING, allowNull: false },
        type: { type: DataTypes.ENUM('Holiday', 'Week Off'), allowNull: false, defaultValue: 'Holiday' },
        holidayListId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'holiday_lists', key: 'id' }, onDelete: 'CASCADE' },
    }, {
        tableName: 'holidays',
        timestamps: true,
        indexes: [{ unique: true, fields: ['date', 'holidayListId'] }] // A holiday date should be unique within a list
    });
    return Holiday;
};