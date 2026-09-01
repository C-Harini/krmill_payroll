const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const LeaveRequestHistory = sequelize.define('LeaveRequestHistory', {
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

        // ACTION DETAILS
        action: {
            type: DataTypes.ENUM(
                'Created',
                'Submitted',
                'Approved',
                'Rejected',
                'Cancelled',
                'Modified',
                'Withdrawn',
                'Forwarded',
                'Deleted',
                'Restored'
            ),
            allowNull: false,
        },
        actionBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'employees',
                key: 'id',
            },
            onDelete: 'RESTRICT',
            comment: 'Employee who performed the action',
        },
        actionDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },

        // STATUS TRACKING
        oldStatus: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Previous status before this action',
        },
        newStatus: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'New status after this action',
        },

        // COMMENTS
        comments: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Comments or notes about the action',
        },

        // ADDITIONAL CONTEXT
        actionContext: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Additional context data (changes made, approver level, etc.)',
        },

        // IP & DEVICE INFO
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true,
            comment: 'IP address from which action was taken',
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Browser/device information',
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
        tableName: 'leave_request_history',
        timestamps: true,
        updatedAt: false, // History records should not be updated
        indexes: [
            { fields: ['leaveRequestId', 'actionDate'] },
            { fields: ['actionBy'] },
            { fields: ['action'] },
            { fields: ['actionDate'] },
        ],
    });

    // Static Method to log history
    LeaveRequestHistory.logAction = async function (data) {
        try {
            return await this.create({
                leaveRequestId: data.leaveRequestId,
                action: data.action,
                actionBy: data.actionBy,
                oldStatus: data.oldStatus || null,
                newStatus: data.newStatus || null,
                comments: data.comments || null,
                actionContext: data.actionContext || null,
                ipAddress: data.ipAddress || null,
                userAgent: data.userAgent || null,
                companyId: data.companyId,
            });
        } catch (error) {
            console.error('Error logging leave request history:', error);
            throw error;
        }
    };

    // Instance Methods
    LeaveRequestHistory.prototype.getActionDescription = function () {
        const actionDescriptions = {
            'Created': 'Leave request was created',
            'Submitted': 'Leave request was submitted for approval',
            'Approved': 'Leave request was approved',
            'Rejected': 'Leave request was rejected',
            'Cancelled': 'Leave request was cancelled',
            'Modified': 'Leave request was modified',
            'Withdrawn': 'Leave request was withdrawn',
            'Forwarded': 'Leave request was forwarded to next approver',
            'Deleted': 'Leave request was deleted',
            'Restored': 'Leave request was restored',
        };
        return actionDescriptions[this.action] || 'Unknown action';
    };

    // Force sync in development
    if (process.env.NODE_ENV === 'development') {
        LeaveRequestHistory.sync({ alter: true }).then(() => {
            console.log('LeaveRequestHistory table synced successfully');
        }).catch(err => {
            console.error('Error syncing LeaveRequestHistory table:', err);
        });
    }

    return LeaveRequestHistory;
};
