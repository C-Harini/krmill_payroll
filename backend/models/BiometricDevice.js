const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const BiometricDevice = sequelize.define('BiometricDevice', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        location: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        deviceIP: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('Active', 'Inactive'),
            allowNull: false,
            defaultValue: 'Active',
        },
        isAutoSyncEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,  // Auto-sync enabled by default
            comment: 'Enable/disable automatic sync for this device every 5 minutes',
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
        tableName: 'biometric_devices',
        timestamps: true,
    });

    // Force sync to update table structure (only in development)
    if (process.env.NODE_ENV === 'development') {
        BiometricDevice.sync({ alter: true }).then(() => {
            console.log('BiometricDevice table synced successfully');
        }).catch(err => {
            console.error('Error syncing BiometricDevice table:', err);
        });
    }

    return BiometricDevice;
};