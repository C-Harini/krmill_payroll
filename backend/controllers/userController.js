const { User, Department, Company } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

// @desc    Create a new user
// @route   POST /api/users
// @access  Private
exports.createUser = async (req, res) => {
    try {
        const {
            email,
            phoneNumber,
            firstName,
            lastName,
            role,
            departmentId,
            companyId,
            password,
            createdBy
        } = req.body;

        // Validate required fields
        if (!email || !phoneNumber || !password || !companyId || !role) {
            return res.status(400).json({ 
                message: 'Email, phone number, password, company ID, and role are required' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { email },
                    { phoneNumber }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'User with this email or phone number already exists' 
            });
        }

        // Hash password securely
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user record
        const newUser = await User.create({
            email,
            phoneNumber,
            firstName,
            lastName,
            role,
            departmentId,
            companyId,
            password: hashedPassword,
            createdBy,
            status: 'Active'
        });

        // Return user without password
        const userResponse = newUser.toJSON();
        delete userResponse.password;

        res.status(201).json({
            message: 'User created successfully',
            user: userResponse
        });
    } catch (error) {
        console.error('Error creating user:', error);
        
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ 
                message: error.errors.map(err => err.message).join(', ') 
            });
        }
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ 
                message: 'User with this email or phone number already exists' 
            });
        }
        
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Get all users with filters
// @route   GET /api/users?companyId=1&departmentId=1&role=Staff
// @access  Private
exports.getAllUsers = async (req, res) => {
    try {
        const { companyId, departmentId, role, status } = req.query;

        const whereClause = {};
        
        if (companyId) whereClause.companyId = companyId;
        if (departmentId) whereClause.departmentId = departmentId;
        if (role) whereClause.role = role;
        if (status) whereClause.status = status;
        else whereClause.status = 'Active'; // Default to active users

        const users = await User.findAll({
            where: whereClause,
            attributes: { exclude: ['password'] }, // Don't send passwords
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'departmentname', ['departmentname', 'name']],
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id, {
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name'],
                    required: false
                }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Get user by phone number
// @route   GET /api/users/phone/:phoneNumber
// @access  Private
exports.getUserByPhoneNumber = async (req, res) => {
    try {
        const { phoneNumber } = req.params;

        const user = await User.findOne({
            where: { phoneNumber },
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name'],
                    required: false
                }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Get user by email
// @route   GET /api/users/email/:email
// @access  Private
exports.getUserByEmail = async (req, res) => {
    try {
        const { email } = req.params;

        const user = await User.findOne({
            where: { email },
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name'],
                    required: false
                }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        
        // Remove password from update data if present (use separate endpoint)
        delete updateData.password;

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check for duplicate email/phone if being updated
        if (updateData.email || updateData.phoneNumber) {
            const existingUser = await User.findOne({
                where: {
                    id: { [Op.ne]: id },
                    [Op.or]: [
                        updateData.email ? { email: updateData.email } : null,
                        updateData.phoneNumber ? { phoneNumber: updateData.phoneNumber } : null
                    ].filter(Boolean)
                }
            });

            if (existingUser) {
                return res.status(400).json({ 
                    message: 'Email or phone number already in use' 
                });
            }
        }

        await user.update(updateData);

        const updatedUser = await User.findByPk(id, {
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name'],
                    required: false
                }
            ]
        });

        res.status(200).json({
            message: 'User updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error updating user:', error);
        
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ 
                message: error.errors.map(err => err.message).join(', ') 
            });
        }
        
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Update user password
// @route   PATCH /api/users/:id/password
// @access  Private
exports.updatePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword, updatedBy } = req.body;

        if (!newPassword) {
            return res.status(400).json({ message: 'New password is required' });
        }

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password if provided
        if (currentPassword) {
            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await user.update({ 
            password: hashedPassword,
            updatedBy 
        });

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Delete user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { updatedBy } = req.body;

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.update({ 
            status: 'Inactive',
            updatedBy 
        });

        res.status(200).json({ 
            message: 'User marked as inactive successfully' 
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Generate next user phone number based on role and company
// @route   POST /api/users/generate-number
// @access  Private
exports.generateUserNumber = async (req, res) => {
    try {
        const { role, companyId, departmentId } = req.body;

        if (!role || !companyId) {
            return res.status(400).json({ 
                message: 'Role and company ID are required' 
            });
        }

        let prefix = "";
        let filter = { companyId };

        // Handle role-specific filters
        if (role === "Super Admin") {
            prefix = "SAD_";
            filter = { role: "Super Admin" };
        } 
        else if (role === "Admin") {
            prefix = `AD${companyId}_`;
            filter = { role: "Admin", companyId };
        }
        else if (role === "Department Admin") {
            if (!departmentId) {
                return res.status(400).json({ 
                    message: 'Department ID is required for Department Admin' 
                });
            }
            
            const dept = await Department.findByPk(departmentId);
            if (!dept) {
                return res.status(404).json({ message: 'Department not found' });
            }
            
            prefix = `${dept.departmentAckr || 'DEPT'}AD${companyId}_`;
            filter = { role: "Department Admin", companyId, departmentId };
        } 
        else if (role === "Staff") {
            if (!departmentId) {
                return res.status(400).json({ 
                    message: 'Department ID is required for Staff' 
                });
            }
            
            const dept = await Department.findByPk(departmentId);
            if (!dept) {
                return res.status(404).json({ message: 'Department not found' });
            }
            
            prefix = `${dept.departmentAckr || 'DEPT'}${companyId}_`;
            filter = { role: "Staff", companyId, departmentId };
        } 
        else {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Find the last user matching the filter
        const lastUser = await User.findOne({
            where: {
                ...filter,
                phoneNumber: { [Op.like]: `${prefix}%` }
            },
            order: [['createdAt', 'DESC']]
        });

        let nextNum = 1;

        if (lastUser) {
            const parts = lastUser.phoneNumber.split("_");
            const lastNum = parseInt(parts[1], 10);
            if (!isNaN(lastNum)) {
                nextNum = lastNum + 1;
            }
        }

        let newUserNumber = `${prefix}${nextNum}`;

        // Ensure uniqueness: increment until number not present
        let exists = await User.findOne({ 
            where: { phoneNumber: newUserNumber } 
        });
        
        while (exists) {
            nextNum++;
            newUserNumber = `${prefix}${nextNum}`;
            exists = await User.findOne({ 
                where: { phoneNumber: newUserNumber } 
            });
        }

        res.status(200).json({ 
            phoneNumber: newUserNumber,
            prefix,
            number: nextNum
        });
    } catch (error) {
        console.error('Error generating user number:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Get user's company information
// @route   GET /api/users/:id/company
// @access  Private
exports.getUserCompany = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id, {
            include: [
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name', 'code', 'email', 'phone']
                }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            companyId: user.companyId,
            company: user.company
        });
    } catch (error) {
        console.error('Error fetching user company:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Toggle user status
// @route   PATCH /api/users/:id/toggle-status
// @access  Private
exports.toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { updatedBy } = req.body;

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
        
        await user.update({ 
            status: newStatus,
            updatedBy 
        });

        res.status(200).json({ 
            message: `User status changed to ${newStatus}`,
            user: {
                id: user.id,
                email: user.email,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Update last login timestamp
// @route   PATCH /api/users/:id/last-login
// @access  Private
exports.updateLastLogin = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.update({ lastLogin: new Date() });

        res.status(200).json({ 
            message: 'Last login updated successfully' 
        });
    } catch (error) {
        console.error('Error updating last login:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

module.exports = exports;