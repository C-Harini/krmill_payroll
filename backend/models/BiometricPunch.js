const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const BiometricPunch = sequelize.define('BiometricPunch', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'employees',
                key: 'id',
            },
        },
        biometricDeviceId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'biometric_devices',
                key: 'id',
            },
        },
        biometricEnrollmentId: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Enrollment ID from biometric device'
        },
        punchTime: {
            type: DataTypes.DATE,
            allowNull: false,
            comment: 'Complete timestamp of punch'
        },
        punchDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'Date part for easy querying'
        },
        punchType: {
            type: DataTypes.ENUM('IN', 'OUT'),
            allowNull: false,
            comment: 'Calculated punch type'
        },
        shiftTypeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'shift_types',
                key: 'id',
            },
            comment: 'Employee shift at the time of punch'
        },
        isLate: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'IN punch after grace time'
        },
        isEarlyOut: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'OUT punch before shift end minus grace'
        },
        isManual: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Manually added by admin'
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
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
        status: {
            type: DataTypes.ENUM('Valid', 'Invalid', 'Duplicate'),
            defaultValue: 'Valid',
            comment: 'Status of the punch record'
        },
    }, {
        tableName: 'biometric_punches',
        timestamps: true,
        indexes: [
            {
                name: 'idx_employee_date',
                fields: ['employeeId', 'punchDate']
            },
            {
                name: 'idx_device_time',
                fields: ['biometricDeviceId', 'punchTime']
            },
            {
                name: 'idx_company_date',
                fields: ['companyId', 'punchDate']
            },
            {
                name: 'idx_enrollment_device',
                fields: ['biometricEnrollmentId', 'biometricDeviceId']
            }
        ]
    });

    // Force sync to update table structure (only in development)
    if (process.env.NODE_ENV === 'development') {
        BiometricPunch.sync({ alter: true }).then(() => {
            console.log('BiometricPunch table synced successfully');
        }).catch(err => {
            console.error('Error syncing BiometricPunch table:', err);
        });
    }

    return BiometricPunch;
};
