const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const Department = sequelize.define('Department', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        slno: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Serial / display order number',
        },
        departmentname: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        acronym: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        isTrain: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether this is a training department',
        },
        strengthRequired: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Number of employees required in this department',
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
        categoryId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'category',
                key: 'id',
            },
            onDelete: 'RESTRICT',
        },
    }, {
        tableName: 'departments',
        timestamps: true,
    });

    Department.associate = (models) => {
        Department.belongsTo(models.Company, {
            foreignKey: 'companyId',
            as: 'company',
        });
        Department.belongsTo(models.Category, {
            foreignKey: 'categoryId',
            as: 'category',
        });
    };

    return Department;
};
