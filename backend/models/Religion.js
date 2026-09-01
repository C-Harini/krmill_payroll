'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class Religion extends Model {
        static associate(models) {
            // No association needed — companyId is just a scoping field
        }
    }

    Religion.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            companyId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            religionName: {
                type: DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: { msg: 'Religion name cannot be empty' },
                    len: { args: [1, 100], msg: 'Religion name must be between 1 and 100 characters' },
                },
            },
            religionCode: {
                type: DataTypes.STRING(20),
                allowNull: false,
                validate: {
                    notEmpty: { msg: 'Religion code cannot be empty' },
                },
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
                defaultValue: null,
            },
            status: {
                type: DataTypes.ENUM('Active', 'Inactive'),
                allowNull: false,
                defaultValue: 'Active',
            },
        },
        {
            sequelize,
            modelName: 'Religion',
            tableName: 'religions',
            timestamps: true,
            indexes: [
                {
                    // religionCode must be unique within a company
                    unique: true,
                    fields: ['companyId', 'religionCode'],
                    name: 'unique_religion_code_per_company',
                },
                {
                    // religionName must be unique within a company
                    unique: true,
                    fields: ['companyId', 'religionName'],
                    name: 'unique_religion_name_per_company',
                },
            ],
        }
    );

    return Religion;
};