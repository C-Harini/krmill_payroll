const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const WorkloadEmployee = sequelize.define('WorkloadEmployee', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                model: 'employees',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        status: {
            type: DataTypes.ENUM('Active', 'Inactive'),
            allowNull: false,
            defaultValue: 'Active',
        },
    }, {
        tableName: 'workload_employees',
        timestamps: true,
    });

    WorkloadEmployee.associate = (models) => {
        WorkloadEmployee.belongsTo(models.Employee, {
            foreignKey: 'employeeId',
            as: 'employee',
        });
    };

    return WorkloadEmployee;
};
