const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const EmployerGrade = sequelize.define('EmployerGrade', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        defaultSalaryStructure: {
            type: DataTypes.TEXT, // Using TEXT for potentially longer salary structure details
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
    }, {
        tableName: 'employer_grades',
        timestamps: true,
    });

    return EmployerGrade;
};