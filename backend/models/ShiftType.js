const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const ShiftType = sequelize.define('ShiftType', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        startTime: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        endTime: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        beginCheckInBefore: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 15,
            comment: 'Minutes before shift start to allow check-in',
            validate: {
                isInt: { msg: 'Begin check-in before must be an integer.' },
                min: { args: [0], msg: 'Begin check-in before must be at least 0 minutes.' }
            }
        },
        allowCheckOutAfter: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 15,
            comment: 'Minutes after shift end to allow check-out',
            validate: {
                isInt: { msg: 'Allow check-out after must be an integer.' },
                min: { args: [0], msg: 'Allow check-out after must be at least 0 minutes.' }
            }
        },
        enableAutoAttendance: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        requireCheckIn: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        requireCheckOut: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        allowMultipleCheckIns: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        autoMarkAbsentIfNoCheckIn: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        workingHoursCalculation: {
            type: DataTypes.ENUM('first_to_last', 'fixed_hours', 'with_breaks'),
            allowNull: false,
            defaultValue: 'first_to_last',
            comment: 'Method to calculate working hours',
        },
        halfDayHours: {
            type: DataTypes.DECIMAL(4, 2),
            allowNull: false,
            defaultValue: 4.00,
            comment: 'Working hours threshold for half day',
            validate: {
                isDecimal: { msg: 'Half day hours must be a decimal number.' },
                min: { args: [0], msg: 'Half day hours must be greater than 0.' }
            }
        },
        absentHours: {
            type: DataTypes.DECIMAL(4, 2),
            allowNull: false,
            defaultValue: 6.00,
            comment: 'Working hours threshold to mark absent',
            validate: {
                isDecimal: { msg: 'Absent hours must be a decimal number.' },
                min: { args: [0], msg: 'Absent hours must be greater than 0.' }
            }
        },
        enableLateEntry: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        lateGracePeriod: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 15,
            comment: 'Grace period in minutes for late entry',
            validate: {
                isInt: { msg: 'Late grace period must be an integer.' },
                min: { args: [0], msg: 'Late grace period must be at least 0 minutes.' }
            }
        },
        enableEarlyExit: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        earlyExitPeriod: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 15,
            comment: 'Period in minutes for early exit allowance',
            validate: {
                isInt: { msg: 'Early exit period must be an integer.' },
                min: { args: [0], msg: 'Early exit period must be at least 0 minutes.' }
            }
        },
        holidayListId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'holiday_lists',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
        markAutoAttendanceOnHolidays: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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
        tableName: 'shift_types',
        timestamps: true,
        // Custom validation to ensure business rules
        validate: {
            validateTimeRange() {
                if (this.startTime && this.endTime) {
                    // Convert time strings to comparable format
                    const start = this.startTime;
                    const end = this.endTime;

                    // Allow overnight shifts (e.g., 11:00 PM to 08:00 AM)
                    // This is valid, so we don't need to throw error
                }
            },
            validateHalfDayThreshold() {
                if (this.halfDayHours >= this.absentHours) {
                    throw new Error('Half day hours must be less than absent hours threshold.');
                }
            },
            validateCheckInRequirements() {
                if (this.autoMarkAbsentIfNoCheckIn && !this.requireCheckIn) {
                    throw new Error('Cannot auto-mark absent if check-in is not required.');
                }
            },
        },
    });

    // Force sync to update table structure (only in development)
    // Remove or comment out in production
    // if (process.env.NODE_ENV === 'development') {
    //     ShiftType.sync({ alter: true }).then(() => {
    //         console.log('ShiftType table synced successfully');
    //     }).catch(err => {
    //         console.error('Error syncing ShiftType table:', err);
    //     });
    // }

    return ShiftType;
};