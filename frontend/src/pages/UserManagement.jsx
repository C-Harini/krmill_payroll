import React, { useState, useEffect } from 'react';

const apiRequest = async (url, options = {}) => {
    const token = localStorage.getItem('authToken');
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    console.log('API Base URL:', baseURL);
    console.log('Full URL:', `${baseURL}${url}`);
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    const response = await fetch(`${baseURL}${url}`, { ...defaultOptions, ...options });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || `API Error: ${response.statusText}`);
    }
    return response.json();
};

const UserManagement = ({ companyId }) => {
    // State Management
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filter states
    const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || '');
    const [filters, setFilters] = useState({
        departmentId: '',
        role: '',
        status: 'Active',
        searchTerm: ''
    });

    // Dialog states
    const [openDialog, setOpenDialog] = useState(false);
    const [dialogMode, setDialogMode] = useState('create');
    const [selectedUser, setSelectedUser] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        email: '',
        phoneNumber: '',
        firstName: '',
        lastName: '',
        password: '',
        role: 'Staff',
        status: 'Active',
        companyId: companyId || '',
        departmentId: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [generatedPhoneNumber, setGeneratedPhoneNumber] = useState('');

    // Fetch companies on component mount
    useEffect(() => {
        const fetchCompaniesData = async () => {
            try {
                const data = await apiRequest('/companies');
                setCompanies(data);
                if (!companyId && data.length > 0) {
                    setSelectedCompanyId(data[0].id);
                }
            } catch (err) {
                setError(err.message);
            }
        };
        fetchCompaniesData();
    }, [companyId]);

    // Fetch departments when company changes
    useEffect(() => {
        if (!selectedCompanyId) return;

        const fetchMasterData = async () => {
            try {
                const departmentsData = await apiRequest(`/departments?companyId=${selectedCompanyId}`);
                setDepartments(departmentsData?.data || []);
            } catch (err) {
                console.error('Error fetching master data:', err);
            }
        };
        fetchMasterData();
    }, [selectedCompanyId]);

    // Fetch users when filters change
    useEffect(() => {
        if (selectedCompanyId) {
            fetchUsers();
        }
    }, [selectedCompanyId, filters]);

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const queryParams = new URLSearchParams({
                companyId: selectedCompanyId,
            });

            if (filters.departmentId) queryParams.append('departmentId', filters.departmentId);
            if (filters.role) queryParams.append('role', filters.role);
            if (filters.status) queryParams.append('status', filters.status);

            const data = await apiRequest(`/users?${queryParams.toString()}`);
            setUsers(data);
        } catch (err) {
            setError(err.message || 'Failed to fetch users');
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePhoneNumber = async () => {
        if (!formData.companyId || !formData.role) {
            setError('Please select company and role first');
            return;
        }

        if ((formData.role === 'Department Admin' || formData.role === 'Staff') && !formData.departmentId) {
            setError('Please select department first');
            return;
        }

        try {
            const response = await apiRequest('/users/generate-number', {
                method: 'POST',
                body: JSON.stringify({
                    role: formData.role,
                    companyId: formData.companyId,
                    departmentId: formData.departmentId
                })
            });

            setGeneratedPhoneNumber(response.phoneNumber);
            setFormData({ ...formData, phoneNumber: response.phoneNumber });
            setSuccess('Phone number generated successfully');
        } catch (err) {
            setError(err.message || 'Failed to generate phone number');
        }
    };

    const handleOpenDialog = (mode, user = null) => {
        setDialogMode(mode);
        setSelectedUser(user);

        if (mode === 'edit' && user) {
            setFormData({
                email: user.email || '',
                phoneNumber: user.phoneNumber || '',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                password: '',
                role: user.role || 'Staff',
                status: user.status || 'Active',
                companyId: user.companyId || '',
                departmentId: user.departmentId || '',
            });
        } else {
            setFormData({
                email: '',
                phoneNumber: '',
                firstName: '',
                lastName: '',
                password: '',
                role: 'Staff',
                status: 'Active',
                companyId: selectedCompanyId || '',
                departmentId: '',
            });
            setGeneratedPhoneNumber('');
        }

        setOpenDialog(true);
        setError('');
        setSuccess('');
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedUser(null);
        setFormData({
            email: '',
            phoneNumber: '',
            firstName: '',
            lastName: '',
            password: '',
            role: 'Staff',
            status: 'Active',
            companyId: selectedCompanyId || '',
            departmentId: '',
        });
        setGeneratedPhoneNumber('');
        setError('');
        setSuccess('');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (dialogMode === 'create') {
                if (!formData.email || !formData.phoneNumber || !formData.password || !formData.companyId) {
                    setError('Email, phone number, password, and company are required');
                    setLoading(false);
                    return;
                }

                await apiRequest('/users', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                setSuccess('User created successfully');
            } else {
                const updateData = { ...formData };
                if (!updateData.password) {
                    delete updateData.password;
                }

                await apiRequest(`/users/${selectedUser.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });
                setSuccess('User updated successfully');
            }

            fetchUsers();
            setTimeout(() => {
                handleCloseDialog();
            }, 1500);
        } catch (err) {
            setError(err.message || 'Operation failed');
            console.error('Error saving user:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('Are you sure you want to deactivate this user?')) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            await apiRequest(`/users/${userId}`, {
                method: 'DELETE',
                body: JSON.stringify({ updatedBy: 1 })
            });
            setSuccess('User deactivated successfully');
            fetchUsers();
        } catch (err) {
            setError(err.message || 'Failed to deactivate user');
            console.error('Error deleting user:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (user) => {
        setLoading(true);
        setError('');

        try {
            await apiRequest(`/users/${user.id}/toggle-status`, {
                method: 'PATCH',
                body: JSON.stringify({ updatedBy: 1 })
            });
            setSuccess(`User ${user.status === 'Active' ? 'deactivated' : 'activated'} successfully`);
            fetchUsers();
        } catch (err) {
            setError(err.message || 'Failed to toggle status');
            console.error('Error toggling status:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleClearFilters = () => {
        setFilters({
            departmentId: '',
            role: '',
            status: 'Active',
            searchTerm: ''
        });
    };

    const getRoleColor = (role) => {
        const colors = {
            'Super Admin': 'bg-red-100 text-red-700 border border-red-300',
            'Admin': 'bg-amber-100 text-amber-700 border border-amber-300',
            'Department Admin': 'bg-cyan-100 text-cyan-700 border border-cyan-300',
            'Staff': 'bg-green-100 text-green-700 border border-green-300',
            'HR': 'bg-purple-100 text-purple-700 border border-purple-300',
        };
        return colors[role] || 'bg-gray-100 text-gray-700 border border-gray-300';
    };

    const filteredUsers = users.filter(user => {
        if (!filters.searchTerm) return true;
        const searchLower = filters.searchTerm.toLowerCase();
        return (
            user.email?.toLowerCase().includes(searchLower) ||
            user.phoneNumber?.toLowerCase().includes(searchLower) ||
            user.firstName?.toLowerCase().includes(searchLower) ||
            user.lastName?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">👥 User Management</h1>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleOpenDialog('create')}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition duration-200"
                    >
                        ➕ Add User
                    </button>
                    <button
                        onClick={fetchUsers}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition duration-200"
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
                    <div className="flex justify-between items-center">
                        <span>❌ {error}</span>
                        <button
                            onClick={() => setError('')}
                            className="text-red-700 hover:text-red-900 font-bold"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div className="p-4 mb-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded">
                    <div className="flex justify-between items-center">
                        <span>✅ {success}</span>
                        <button
                            onClick={() => setSuccess('')}
                            className="text-green-700 hover:text-green-900 font-bold"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Company Selector */}
            {!companyId && (
                <div className="mb-6 bg-white p-4 rounded-lg shadow">
                    <label htmlFor="company-select" className="block text-sm font-semibold text-gray-700 mb-2">
                        Select Company:
                    </label>
                    <select
                        id="company-select"
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                        className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Filters Panel */}
            <div className="mb-6 bg-white p-6 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Search:</label>
                        <input
                            type="text"
                            placeholder="Name, email, phone..."
                            value={filters.searchTerm}
                            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Department:</label>
                        <select
                            value={filters.departmentId}
                            onChange={(e) => handleFilterChange('departmentId', e.target.value)}
                            disabled={!selectedCompanyId}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="">All Departments</option>
                            {(Array.isArray(departments) ? departments : []).map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.departmentname}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Role:</label>
                        <select
                            value={filters.role}
                            onChange={(e) => handleFilterChange('role', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Roles</option>
                            <option value="Super Admin">Super Admin</option>
                            <option value="Admin">Admin</option>
                            <option value="Department Admin">Department Admin</option>
                            <option value="Staff">Staff</option>
                            <option value="HR">HR</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Status:</label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition duration-200"
                >
                    Clear Filters
                </button>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Phone</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Department</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Last Login</th>
                                <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user, index) => (
                                    <tr key={user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50 hover:bg-slate-100'}>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {user.firstName && user.lastName
                                                ? `${user.firstName} ${user.lastName}`
                                                : user.email}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{user.phoneNumber}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{user.department?.name || '-'}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={user.status === 'Active'
                                                ? 'px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300'
                                                : 'px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300'
                                            }>
                                                {user.status === 'Active' ? '✓' : '✕'} {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {user.lastLogin
                                                ? new Date(user.lastLogin).toLocaleString()
                                                : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleOpenDialog('edit', user)}
                                                className="px-2 py-1 mr-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-sm transition duration-200"
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(user)}
                                                className={user.status === 'Active'
                                                    ? 'px-2 py-1 mr-2 bg-amber-500 hover:bg-amber-600 text-white rounded text-sm transition duration-200'
                                                    : 'px-2 py-1 mr-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition duration-200'
                                                }
                                                title={user.status === 'Active' ? 'Deactivate' : 'Activate'}
                                            >
                                                {user.status === 'Active' ? '🚫' : '✅'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition duration-200"
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Dialog Modal */}
            {openDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 border-b border-blue-800">
                            <h2 className="text-xl font-bold">
                                {dialogMode === 'create' ? 'Create New User' : 'Edit User'}
                            </h2>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Phone Number with Generate Button */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            name="phoneNumber"
                                            value={formData.phoneNumber}
                                            onChange={handleInputChange}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={handleGeneratePhoneNumber}
                                            disabled={!formData.companyId || !formData.role}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </div>

                                {/* First Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Last Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Password */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Password {dialogMode === 'create' && '*'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder={dialogMode === 'edit' ? 'Leave empty to keep current' : ''}
                                            className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-800"
                                        >
                                            {showPassword ? '👁️' : '👁️‍🗨️'}
                                        </button>
                                    </div>
                                </div>

                                {/* Role */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Role *</label>
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Super Admin">Super Admin</option>
                                        <option value="Admin">Admin</option>
                                        <option value="Department Admin">Department Admin</option>
                                        <option value="Staff">Staff</option>
                                        <option value="HR">HR</option>
                                    </select>
                                </div>

                                {/* Company */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Company *</label>
                                    <select
                                        name="companyId"
                                        value={formData.companyId}
                                        onChange={handleInputChange}
                                        disabled={!!companyId}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">Select Company</option>
                                        {companies.map((company) => (
                                            <option key={company.id} value={company.id}>
                                                {company.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Department */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                                    <select
                                        name="departmentId"
                                        value={formData.departmentId}
                                        onChange={handleInputChange}
                                        disabled={!formData.companyId}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">None</option>
                                        {(Array.isArray(departments) ? departments : []).map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.departmentname}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={handleCloseDialog}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Saving...' : (dialogMode === 'create' ? 'Create User' : 'Update User')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;