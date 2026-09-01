const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const ShiftAssignment = sequelize.define('ShiftAssignment', {
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
            onDelete: 'CASCADE',
        },
        shiftTypeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'shift_types',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        assignmentDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'Date for which the shift is assigned',
        },
        startDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            comment: 'Start date for recurring assignments',
        },
        endDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            comment: 'End date for recurring assignments',
        },
        isRecurring: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether this is a recurring assignment',
        },
        recurringPattern: {
            type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'custom'),
            allowNull: true,
            comment: 'Pattern for recurring assignments',
        },
        recurringDays: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Days of week for weekly pattern: [0,1,2,3,4,5,6] where 0=Sunday',
        },
        status: {
            type: DataTypes.ENUM('Active', 'Inactive', 'Cancelled'),
            allowNull: false,
            defaultValue: 'Active',
        },
        notes: {
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
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
    }, {
        tableName: 'shift_assignments',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['employeeId', 'assignmentDate'],
                name: 'unique_employee_date_assignment'
            },
            {
                fields: ['companyId', 'assignmentDate'],
                name: 'company_date_index'
            },
            {
                fields: ['shiftTypeId'],
                name: 'shift_type_index'
            },
        ],
        validate: {
            validateDateRange() {
                if (this.startDate && this.endDate) {
                    if (new Date(this.startDate) > new Date(this.endDate)) {
                        throw new Error('Start date must be before or equal to end date.');
                    }
                }
            },
            validateRecurringData() {
                if (this.isRecurring) {
                    if (!this.startDate || !this.endDate) {
                        throw new Error('Recurring assignments must have start and end dates.');
                    }
                    if (!this.recurringPattern) {
                        throw new Error('Recurring assignments must have a pattern.');
                    }
                }
            },
        },
    });

    // Force sync to update table structure (only in development)
    // if (process.env.NODE_ENV === 'development') {
    //     ShiftAssignment.sync({ alter: true }).then(() => {
    //         console.log('ShiftAssignment table synced successfully');
    //     }).catch(err => {
    //         console.error('Error syncing ShiftAssignment table:', err);
    //     });
    // }

    return ShiftAssignment;
};