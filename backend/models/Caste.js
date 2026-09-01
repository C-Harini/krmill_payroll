const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const Caste = sequelize.define('Caste', {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            companyId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'companies',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            // Static category chosen from: General, BC, OBC, MBC, SC, ST, OC
            communityCategory: {
                type: DataTypes.ENUM('General', 'BC', 'OBC', 'MBC', 'SC', 'ST', 'OC'),
                allowNull: false,
            },
            casteName: {
                type: DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: { msg: 'Caste name cannot be empty' },
                    len: { args: [1, 100], msg: 'Caste name must be between 1 and 100 characters' },
                },
            },
            casteCode: {
                type: DataTypes.STRING(20),
                allowNull: false,
                validate: {
                    notEmpty: { msg: 'Caste code cannot be empty' },
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
            modelName: 'Caste',
            tableName: 'castes',
            timestamps: true,
            indexes: [
                {
                    // casteCode must be unique within a company
                    unique: true,
                    fields: ['companyId', 'casteCode'],
                    name: 'unique_caste_code_per_company',
                },
                {
                    // casteName must be unique within a company + category
                    unique: true,
                    fields: ['companyId', 'communityCategory', 'casteName'],
                    name: 'unique_caste_name_per_company_category',
                },
            ],
        }
    );

    return Caste;
};