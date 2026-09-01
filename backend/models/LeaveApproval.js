const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const LeaveApproval = sequelize.define('LeaveApproval', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        // REQUEST REFERENCE
        leaveRequestId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'leave_requests',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },

        // APPROVER INFORMATION
        approverId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'employees',
                key: 'id',
            },
            onDelete: 'RESTRICT',
            comment: 'Employee ID of the approver',
        },
        approverLevel: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Approval level: 1 = Manager, 2 = Dept Head, etc.',
            validate: {
                min: { args: [1], msg: 'Approver level must be at least 1.' }
            }
        },
        approverRole: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Role description: "Reporting Manager", "Department Head", etc.',
        },

        // STATUS
        status: {
            type: DataTypes.ENUM(
                'Pending',
                'Approved',
                'Rejected',
                'Forwarded',
                'Skipped'
            ),
            allowNull: false,
            defaultValue: 'Pending',
        },

        // APPROVER COMMENTS
        comments: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Comments provided by approver',
        },

        // ACTION DETAILS
        actionDate: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Date when action was taken',
        },

        // NOTIFICATION
        notificationSent: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        notificationSentAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        emailSent: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        emailSentAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },

        // SYSTEM
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
        tableName: 'leave_approvals',
        timestamps: true,
        indexes: [
            { fields: ['leaveRequestId', 'approverLevel'], unique: true },
            { fields: ['approverId', 'status'] },
            { fields: ['leaveRequestId'] },
        ],
        hooks: {
            beforeCreate: (approval) => {
                if (approval.status !== 'Pending') {
                    approval.actionDate = new Date();
                }
            },
            beforeUpdate: (approval) => {
                if (approval.changed('status') && approval.status !== 'Pending' && !approval.actionDate) {
                    approval.actionDate = new Date();
                }
            },
        },
    });

    // Instance Methods
    LeaveApproval.prototype.approve = async function (comments = null) {
        this.status = 'Approved';
        this.actionDate = new Date();
        if (comments) this.comments = comments;
        return await this.save();
    };

    LeaveApproval.prototype.reject = async function (comments) {
        this.status = 'Rejected';
        this.actionDate = new Date();
        this.comments = comments;
        return await this.save();
    };

    LeaveApproval.prototype.forward = async function (comments = null) {
        this.status = 'Forwarded';
        this.actionDate = new Date();
        if (comments) this.comments = comments;
        return await this.save();
    };

    LeaveApproval.prototype.isPending = function () {
        return this.status === 'Pending';
    };

    LeaveApproval.prototype.isActionTaken = function () {
        return ['Approved', 'Rejected', 'Forwarded'].includes(this.status);
    };

    // Force sync in development
    if (process.env.NODE_ENV === 'development') {
        LeaveApproval.sync({ alter: true }).then(() => {
            console.log('LeaveApproval table synced successfully');
        }).catch(err => {
            console.error('Error syncing LeaveApproval table:', err);
        });
    }

    return LeaveApproval;
};
