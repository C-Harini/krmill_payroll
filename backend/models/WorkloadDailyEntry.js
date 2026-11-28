const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const WorkloadDailyEntry = sequelize.define('WorkloadDailyEntry', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        entryDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'Date for workload recording (YYYY-MM-DD)',
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'employees',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        workloadMasterId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'workload_masters',
                key: 'id',
            },
            onUpdate: 'SET NULL',
            onDelete: 'SET NULL',
        },
        currentWorkload: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: null,
            comment: 'Current selected workload name',
        },
        currentSalary: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            comment: 'Salary corresponding to the current workload',
        },
        wasteEfficiency: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            comment: 'Waste / Efficiency parameter (defaults to 0)',
        },
        target: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: '-',
        },
    }, {
        tableName: 'workload_daily_entries',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['entryDate', 'employeeId'],
            },
            {
                fields: ['entryDate'],
            },
            {
                fields: ['employeeId'],
            },
        ],
    });

    WorkloadDailyEntry.associate = (models) => {
        WorkloadDailyEntry.belongsTo(models.Employee, {
            foreignKey: 'employeeId',
            as: 'employee',
        });
        WorkloadDailyEntry.belongsTo(models.WorkloadMaster, {
            foreignKey: 'workloadMasterId',
            as: 'workloadMaster',
        });
    };

    return WorkloadDailyEntry;
};
