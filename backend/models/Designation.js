const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const Designation = sequelize.define('Designation', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        acronym: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('Active', 'Inactive'),
            allowNull: false,
            defaultValue: 'Active',                          
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 1, // Assuming 1 is the ID of the default admin user
        },
    
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 1, // Assuming 1 is the ID of the default admin user
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
        tableName: 'designations',
        timestamps: true,
    });

    // Force sync to create/update table structure (development only)
if (process.env.NODE_ENV === "development") {
    Designation.sync({ alter: true })
        .then(() => {
            console.log("Designation table synced successfully");
        })
        .catch((err) => {
            console.error("Error syncing Designation table:", err);
        });
}

    return Designation;
};