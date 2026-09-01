const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const LeaveAllocation = sequelize.define('LeaveAllocation', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        
        // BASIC INFORMATION
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'employees',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        leaveTypeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'leave_types',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        leavePeriodId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'leave_periods',
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
        
        // ALLOCATION DETAILS
        allocatedLeaves: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            validate: {
                min: { args: [0], msg: 'Allocated leaves cannot be negative.' }
            }
        },
        carryForwardFromPrevious: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            comment: 'Carry forward balance from previous period',
        },
        usedLeaves: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            comment: 'Leaves used/taken in this period',
        },
        
        // CARRY FORWARD SETTINGS
        maxCarryForwardLimit: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Maximum days that can be carried forward',
        },
        carryForwardExpiryDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            comment: 'Date by which carry forward must be used',
        },
        
        // PRO-RATING
        isProRated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Is this allocation pro-rated for mid-year joiner',
        },
        proRatedDays: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Pro-rated allocation for partial period',
        },
        
        // MONTHLY ACCRUAL
        enableMonthlyAccrual: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        monthlyAccrualRate: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Leaves to be accrued per month',
        },
        accrualCondition: {
            type: DataTypes.ENUM('first_year', 'all_employees', 'grade_based'),
            allowNull: true,
            comment: 'Condition for monthly accrual',
        },
        totalAccruedTillDate: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            comment: 'Total accrued till current date',
        },
        
        // NEGATIVE BALANCE
        allowNegativeBalance: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        maxNegativeLimit: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Maximum negative balance allowed',
        },
        
        // STATUS & DATES
        status: {
            type: DataTypes.ENUM('Active', 'Expired', 'Cancelled'),
            allowNull: false,
            defaultValue: 'Active',
        },
        allocatedDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        effectiveFrom: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        effectiveTo: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        
        // NOTIFICATIONS
        notifyEmployee: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        notifyManager: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        
        // AUDIT
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName: 'leave_allocations',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['employeeId', 'leaveTypeId', 'leavePeriodId'],
                name: 'unique_allocation_per_employee_type_period'
            }
        ],
        validate: {
            validateNegativeBalance() {
                if (this.allowNegativeBalance && !this.maxNegativeLimit) {
                    throw new Error('Maximum negative limit must be specified when negative balance is allowed.');
                }
            },
            validateAccrual() {
                if (this.enableMonthlyAccrual && !this.monthlyAccrualRate) {
                    throw new Error('Monthly accrual rate must be specified when accrual is enabled.');
                }
            }
        }
    });

    // Virtual fields
    LeaveAllocation.prototype.getTotalAvailable = function() {
        return parseFloat(this.allocatedLeaves) + 
               parseFloat(this.carryForwardFromPrevious) + 
               parseFloat(this.totalAccruedTillDate);
    };

    LeaveAllocation.prototype.getRemainingBalance = function() {
        return this.getTotalAvailable() - parseFloat(this.usedLeaves);
    };

    LeaveAllocation.prototype.getCarryForwardForNextPeriod = function() {
        const remaining = this.getRemainingBalance();
        if (remaining <= 0) return 0;
        
        if (this.maxCarryForwardLimit) {
            return Math.min(remaining, parseFloat(this.maxCarryForwardLimit));
        }
        
        return remaining;
    };

    // Force sync to update table structure (only in development)
    if (process.env.NODE_ENV === 'development') {
        LeaveAllocation.sync({ alter: true }).then(() => {
            console.log('LeaveAllocation table synced successfully');
        }).catch(err => {
            console.error('Error syncing LeaveAllocation table:', err);
        });
    }

    return LeaveAllocation;
};