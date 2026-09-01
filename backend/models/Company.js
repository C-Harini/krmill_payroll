const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Company = sequelize.define('Company', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        logo: { type: DataTypes.STRING, allowNull: true },
        registrationNumber: { type: DataTypes.STRING, allowNull: true, unique: true },
        addresses: { type: DataTypes.JSON, allowNull: true, defaultValue: {} },
        phone: { type: DataTypes.STRING, allowNull: true },
        email: { type: DataTypes.STRING, allowNull: true, validate: { isEmail: true } },
        website: { type: DataTypes.STRING, allowNull: true },
        tin: { type: DataTypes.STRING, allowNull: true },
        pan: { type: DataTypes.STRING, allowNull: true },
        gst: { type: DataTypes.STRING, allowNull: true },
        bankName: { type: DataTypes.STRING, allowNull: true },
        bankAccountNumber: { type: DataTypes.STRING, allowNull: true },
        bankIfscCode: { type: DataTypes.STRING, allowNull: true },
        financialYearStart: { type: DataTypes.DATEONLY, allowNull: true },
        financialYearEnd: { type: DataTypes.DATEONLY, allowNull: true },
        status: {
            type: DataTypes.ENUM('Active', 'Inactive'),
            allowNull: false,
            defaultValue: 'Active',
        },
    }, {
        tableName: 'companies',
        timestamps: true,
    });

    return Company;
};