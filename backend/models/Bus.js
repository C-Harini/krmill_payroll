const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const Bus = sequelize.define('Bus', {
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
        tableName: 'buses',
        timestamps: true,
    });

    // Force sync to update table structure (only in development)
    if (process.env.NODE_ENV === 'development') {
        Bus.sync({ alter: true }).then(() => {
            console.log('Bus table synced successfully');
        }).catch(err => {
            console.error('Error syncing Bus table:', err);
        });
    }

    return Bus;
};