const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const LeaveRequest = sequelize.define('LeaveRequest', {
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
            onDelete: 'RESTRICT',
        },
        leaveAllocationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'leave_allocations',
                key: 'id',
            },
            onDelete: 'SET NULL',
            comment: 'Link to the allocation from which this leave is deducted',
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

        // DATE INFORMATION
        startDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            validate: {
                isDate: { msg: 'Start date must be a valid date.' }
            }
        },
        endDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            validate: {
                isDate: { msg: 'End date must be a valid date.' },
                isAfterStart(value) {
                    if (value < this.startDate) {
                        throw new Error('End date must be after or equal to start date.');
                    }
                }
            }
        },
        totalDays: {
            type: DataTypes.DECIMAL(4, 1),
            allowNull: false,
            defaultValue: 0.0,
            comment: 'Total leave days (can be 0.5 for half day)',
            validate: {
                min: { args: [0], msg: 'Total days cannot be negative.' }
            }
        },

        // LEAVE CATEGORY
        leaveCategory: {
            type: DataTypes.ENUM('Full Day', 'Half Day', 'Short Leave'),
            allowNull: false,
            defaultValue: 'Full Day',
        },
        halfDayType: {
            type: DataTypes.ENUM('First Half', 'Second Half'),
            allowNull: true,
            comment: 'Required if leaveCategory is Half Day',
        },

        // REASON & DOCUMENTS
        reason: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Reason for leave is required.' }
            }
        },
        hasDocuments: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        documentPaths: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: [],
            comment: 'Array of document file paths',
        },

        // CONTACT INFORMATION
        contactDuringLeave: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: 'Phone number to contact during leave',
        },
        addressDuringLeave: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        // STATUS & WORKFLOW
        status: {
            type: DataTypes.ENUM(
                'Draft',
                'Pending',
                'Approved',
                'Rejected',
                'Cancelled',
                'Withdrawn'
            ),
            allowNull: false,
            defaultValue: 'Draft',
        },

        // APPROVAL WORKFLOW
        currentApprovalLevel: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: '0 = not submitted, 1+ = approval levels',
        },
        maxApprovalLevel: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            comment: 'Total number of approval levels required',
        },

        // APPLICATION DETAILS
        appliedDate: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Date when leave was submitted (not draft)',
        },
        submittedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'employees',
                key: 'id',
            },
            comment: 'If applied by HR/Manager on behalf of employee',
        },

        // CANCELLATION
        cancelledAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        cancelledBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'employees',
                key: 'id',
            },
        },
        cancellationReason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        // FINAL APPROVAL/REJECTION
        finalApprovedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'employees',
                key: 'id',
            },
        },
        finalApprovedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        finalRejectedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'employees',
                key: 'id',
            },
        },
        finalRejectedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        rejectionReason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        // SYSTEM FLAGS
        isDeleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },

        // AUDIT
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Internal notes by HR/Admin',
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
        tableName: 'leave_requests',
        timestamps: true,
        paranoid: true, // Soft delete
        indexes: [
            { fields: ['employeeId', 'status'] },
            { fields: ['companyId', 'status'] },
            { fields: ['startDate', 'endDate'] },
            { fields: ['leaveTypeId'] },
        ],
        validate: {
            halfDayValidation() {
                if (this.leaveCategory === 'Half Day' && !this.halfDayType) {
                    throw new Error('Half day type is required for half day leave.');
                }
            },
            documentValidation() {
                if (this.hasDocuments && (!this.documentPaths || this.documentPaths.length === 0)) {
                    throw new Error('Document paths must be provided when hasDocuments is true.');
                }
            }
        },
        hooks: {
            beforeValidate: (request) => {
                // Calculate total days based on leave category
                if (request.leaveCategory === 'Half Day') {
                    request.totalDays = 0.5;
                } else if (request.leaveCategory === 'Short Leave') {
                    request.totalDays = 0.25;
                }

                // Set applied date when status changes from Draft to Pending
                if (request.changed('status') && request.status === 'Pending' && !request.appliedDate) {
                    request.appliedDate = new Date();
                }
            },
        },
    });

    // Instance Methods
    LeaveRequest.prototype.canBeCancelled = function () {
        return ['Pending', 'Approved'].includes(this.status);
    };

    LeaveRequest.prototype.canBeEdited = function () {
        return this.status === 'Draft';
    };

    LeaveRequest.prototype.isPendingApproval = function () {
        return this.status === 'Pending' && this.currentApprovalLevel < this.maxApprovalLevel;
    };

    LeaveRequest.prototype.isFullyApproved = function () {
        return this.status === 'Approved' && this.currentApprovalLevel === this.maxApprovalLevel;
    };

    // Force sync in development
    if (process.env.NODE_ENV === 'development') {
        LeaveRequest.sync({ alter: true }).then(() => {
            console.log('LeaveRequest table synced successfully');
        }).catch(err => {
            console.error('Error syncing LeaveRequest table:', err);
        });
    }
    LeaveRequest.associate = function (models) {
        LeaveRequest.belongsTo(models.Employee, {
            foreignKey: 'employeeId',
            as: 'employee' // Changed from 'Employee' to 'employee' to match the query
        });

        LeaveRequest.belongsTo(models.LeaveType, {
            foreignKey: 'leaveTypeId',
            as: 'leaveType' // Changed from 'LeaveType' to 'leaveType'
        });
    };
    return LeaveRequest;
};
