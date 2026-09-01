const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const Category = sequelize.define('Category', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        categoryName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        categoryCode: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
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
        // departmentId REMOVED — Department now holds categoryId (reversed relationship)
    }, {
        tableName: 'category',
        timestamps: true,
    });

    return Category;
};
