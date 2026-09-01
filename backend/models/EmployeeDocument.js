const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const EmployeeDocument = sequelize.define('EmployeeDocument', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        // ── FOREIGN KEYS ─────────────────────────────────────────
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'employees',
                key: 'id',
            },
            onDelete: 'CASCADE',
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

        departmentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'departments',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },

        // ── AADHAAR ──────────────────────────────────────────────
        aadhaarNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        aadhaarDocument: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Filename of Aadhaar document',
        },

        // ── PAN ──────────────────────────────────────────────────
        panNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        panDocument: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Filename of PAN document',
        },

        // ── PASSPORT ─────────────────────────────────────────────
        passportNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        passportDocument: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Filename of Passport document',
        },

        // ── VOTER ID ─────────────────────────────────────────────
        voterIdNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        voterIdDocument: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Filename of Voter ID document',
        },

        // ── DRIVING LICENSE ──────────────────────────────────────
        drivingLicenseNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        drivingLicenseDocument: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Filename of Driving License document',
        },

    }, {
        tableName: 'employee_documents',
        timestamps: true,
    });

    EmployeeDocument.associate = function (models) {
        EmployeeDocument.belongsTo(models.Employee, {
            foreignKey: 'employeeId',
            as: 'employee',
        });
        EmployeeDocument.belongsTo(models.Company, {
            foreignKey: 'companyId',
            as: 'company',
        });
        EmployeeDocument.belongsTo(models.Department, {
            foreignKey: 'departmentId',
            as: 'department',
        });
    };

    if (process.env.NODE_ENV === 'development') {
        EmployeeDocument.sync({ alter: true }).then(() => {
            console.log('EmployeeDocument table synced successfully');
        }).catch(err => {
            console.error('Error syncing EmployeeDocument table:', err);
        });
    }

    return EmployeeDocument;
};