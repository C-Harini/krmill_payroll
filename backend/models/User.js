const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            comment: 'Primary key for User'
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: { msg: 'Must be a valid email address.' }
            },
            comment: 'User email address'
        },
        phoneNumber: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            comment: 'User phone number'
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Hashed password'
        },
        role: {
            type: DataTypes.ENUM('Staff', 'Admin', 'Department Admin', 'Super Admin', 'HR'),
            allowNull: false,
            defaultValue: 'Staff',
            comment: 'User role'
        },
        status: {
            type: DataTypes.ENUM('Active', 'Inactive'),
            allowNull: false,
            defaultValue: 'Active',
            comment: 'User status'
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'id',
            },
            onDelete: 'CASCADE',
            comment: 'Reference to company'
        },
        departmentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'departments',
                key: 'id',
            },
            onDelete: 'SET NULL',
            comment: 'Reference to department'
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'User first name'
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'User last name'
        },
        lastLogin: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Last login timestamp'
        },
        passwordResetToken: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Token for password reset'
        },
        passwordResetExpires: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Password reset token expiry'
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'employees',
                key: 'id',
            },
            onDelete: 'SET NULL',
            comment: 'Reference to employee'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'SET NULL',
            comment: 'User who created this record'
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'SET NULL',
            comment: 'User who last updated this record'
        },
    }, {
        tableName: 'users',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['email'],
                name: 'unique_user_email'
            },
            {
                unique: true,
                fields: ['phoneNumber'],
                name: 'unique_user_phone'
            },
            {
                fields: ['companyId'],
                name: 'user_company_index'
            },
            {
                fields: ['departmentId'],
                name: 'user_department_index'
            },
            {
                fields: ['role'],
                name: 'user_role_index'
            },
        ],
    });

    // Force sync to update table structure (only in development)
    if (process.env.NODE_ENV === 'development') {
        User.sync({ alter: true }).then(() => {
            console.log('User table synced successfully');
        }).catch(err => {
            console.error('Error syncing User table:', err);
        });
    }

    return User;
};