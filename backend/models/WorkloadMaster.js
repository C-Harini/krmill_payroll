const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const WorkloadMaster = sequelize.define('WorkloadMaster', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        code: {
            type: DataTypes.INTEGER,
            allowNull: true,
            unique: true,
            comment: 'Workload numerical code',
        },
        workloadName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Workload name cannot be empty' },
            },
            comment: 'Workload description name',
        },
        reportName: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: null,
            comment: 'Short report name',
        },
        salary: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            validate: {
                min: { args: [0], msg: 'Salary must be greater than or equal to 0' },
            },
            comment: 'Standard daily / assigned salary rate',
        },
        side: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Machine sides or percentage parameter',
        },
        status: {
            type: DataTypes.ENUM('Active', 'Inactive'),
            allowNull: false,
            defaultValue: 'Active',
        },
    }, {
        tableName: 'workload_masters',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['code'],
            },
            {
                fields: ['workloadName'],
            },
        ],
    });

    return WorkloadMaster;
};
