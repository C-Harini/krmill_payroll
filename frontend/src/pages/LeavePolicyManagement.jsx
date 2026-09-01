import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/apiCaller';



const LeavePolicyManagement = () => {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [employmentTypes, setEmploymentTypes] = useState([]);
    const [leavePolicies, setLeavePolicies] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        leaveType: 'Annual Leave',
        employmentTypeId: null,
        accrualFrequency: 'Yearly',
        accrualDays: 0,
        maxCarryForward: 0,
        allowEncashment: false,
        encashmentRules: '',
        status: 'Active'
    });

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const data = await apiRequest('/companies');
                setCompanies(data);
                if (data.length > 0) {
                    setSelectedCompanyId(data[0].id);
                }
            } catch (err) {
                setError('Failed to fetch companies.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    useEffect(() => {
        if (!selectedCompanyId) return;

        const fetchEmploymentTypes = async () => {
            try {
                const data = await apiRequest(`/employment-types?companyId=${selectedCompanyId}`);
                setEmploymentTypes(data);
            } catch (err) {
                console.error('Failed to fetch employment types:', err);
            }
        };

        const fetchLeavePolicies = async () => {
            setLoading(true);
            try {
                const data = await apiRequest(`/leave-policies?companyId=${selectedCompanyId}`);
                setLeavePolicies(data);
                setError(null);
            } catch (err) {
                setError('Failed to fetch leave policies.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchEmploymentTypes();
        fetchLeavePolicies();
    }, [selectedCompanyId]);

    const handleCompanyChange = (e) => setSelectedCompanyId(e.target.value);
    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const openAddModal = () => {
        setEditingPolicy(null);
        setFormData({
            name: '',
            leaveType: 'Annual Leave',
            // employmentTypeId: '',
            employmentTypeId:  null,
            accrualFrequency: 'Yearly',
            accrualDays: 0,
            maxCarryForward: 0,
            allowEncashment: false,
            encashmentRules: '',
            status: 'Active'
        });
        setIsModalOpen(true);
    };

    const openEditModal = (policy) => {
        setEditingPolicy(policy);
        setFormData({
            name: policy.name,
            leaveType: policy.leaveType,
            // employmentTypeId: policy.employmentTypeId || '',
            employmentTypeId: policy.employmentTypeId ?? null,
            accrualFrequency: policy.accrualFrequency,
            accrualDays: policy.accrualDays,
            maxCarryForward: policy.maxCarryForward,
            allowEncashment: policy.allowEncashment,
            encashmentRules: policy.encashmentRules || '',
            status: policy.status
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingPolicy(null);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const payload = { ...formData, companyId: selectedCompanyId };

        try {
            if (editingPolicy) {
                await apiRequest(`/leave-policies/${editingPolicy.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
            } else {
                await apiRequest('/leave-policies', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            }
            const data = await apiRequest(`/leave-policies?companyId=${selectedCompanyId}`);
            setLeavePolicies(data);
            closeModal();
        } catch (err) {
            setError(editingPolicy ? 'Failed to update leave policy.' : 'Failed to create leave policy.');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this leave policy?')) return;
        try {
            await apiRequest(`/leave-policies/${id}`, { method: 'DELETE' });
            setLeavePolicies(leavePolicies.filter(policy => policy.id !== id));
        } catch (err) {
            setError('Failed to delete leave policy.');
            console.error(err);
        }
    };

    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    const filteredPolicies = leavePolicies.filter(policy =>
        policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.leaveType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && companies.length === 0) return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-2">
                        <span>📋</span> Leave Policy Management
                    </h1>
                </div>

                {/* Company Selector */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                    <label htmlFor="company-select" className="block text-sm font-semibold text-slate-700 mb-2">
                        Select Company:
                    </label>
                    <select
                        id="company-select"
                        value={selectedCompanyId}
                        onChange={handleCompanyChange}
                        className="w-full md:w-80 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                    >
                        {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </select>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg shadow-sm">
                        {error}
                    </div>
                )}

                {/* Search and Action Bar */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Search Policies..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full px-4 py-2 pl-10 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                        />
                        <svg className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    >
                        + Add Leave Policy
                    </button>
                </div>

                {/* Table Container */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                    <th className="px-6 py-4 text-left text-sm font-semibold">ID</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Policy Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Leave Type</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Employment Type</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Accrual</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-8 text-center">
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                <span className="ml-3 text-slate-600">Loading leave policies...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredPolicies.length > 0 ? (
                                    filteredPolicies.map((policy, index) => (
                                        <tr
                                            key={policy.id}
                                            className={`border-b border-slate-200 hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                                        >
                                            <td className="px-6 py-4 text-sm text-slate-700">{policy.id}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{policy.name}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                                    {policy.leaveType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700">
                                                {policy.EmploymentType ? policy.EmploymentType.name : <span className="text-slate-400">All Types</span>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{policy.accrualDays} days</span>
                                                    <span className="text-xs text-slate-500">({policy.accrualFrequency})</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${policy.status === 'Active'
                                                        ? 'bg-green-100 text-green-700 border border-green-300'
                                                        : 'bg-red-100 text-red-700 border border-red-300'
                                                    }`}>
                                                    {policy.status === 'Active' ? '✓' : '✕'} {policy.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(policy)}
                                                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(policy.id)}
                                                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                                                        title="Delete"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                                            No leave policies found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white sticky top-0 z-10">
                            <button
                                onClick={closeModal}
                                aria-label="Close"
                                className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full text-red-500 hover:text-red-700 text-3xl font-bold transition-all">×
                            </button>

                            <h2 className="text-2xl font-bold">
                                {editingPolicy ? '✏️ Edit Leave Policy' : '➕ Add New Leave Policy'}
                            </h2>
                        </div>

                        {/* Modal Content */}
                        <form onSubmit={handleFormSubmit} className="p-8 space-y-6">
                            {/* Basic Information Section */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-blue-200">
                                    📝 Basic Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Company
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedCompany?.name || ''}
                                            disabled
                                            className="w-full px-4 py-2 bg-slate-100 border-2 border-slate-300 rounded-lg text-slate-600 cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Policy Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                                            placeholder="e.g., Standard Annual Leave Policy"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Leave Type <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.leaveType}
                                            onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                                            className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700 bg-white"
                                        >
                                            <option value="Sick Leave">Sick Leave</option>
                                            <option value="Annual Leave">Annual Leave</option>
                                            <option value="Maternity Leave">Maternity Leave</option>
                                            <option value="Paternity Leave">Paternity Leave</option>
                                            <option value="Casual Leave">Casual Leave</option>
                                            <option value="Compensatory Off">Compensatory Off</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Employment Type
                                        </label>
                                        <select
                                            value={formData.employmentTypeId}
                                            onChange={(e) =>
  setFormData({
    ...formData,
    employmentTypeId: e.target.value === '' ? null : Number(e.target.value)
  })
}

                                            className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700 bg-white"
                                        >
                                            <option value="">All Types</option>
                                            {employmentTypes.map(type => (
                                                <option key={type.id} value={type.id}>{type.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Accrual & Carry Forward Section */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-blue-200">
                                    📊 Accrual & Carry Forward Rules
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Accrual Frequency <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.accrualFrequency}
                                            onChange={(e) => setFormData({ ...formData, accrualFrequency: e.target.value })}
                                            className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700 bg-white"
                                        >
                                            <option value="Monthly">Monthly</option>
                                            <option value="Quarterly">Quarterly</option>
                                            <option value="Yearly">Yearly</option>
                                            <option value="On Joining">On Joining</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Accrual Days <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.accrualDays}
                                            onChange={(e) => setFormData({ ...formData, accrualDays: parseInt(e.target.value) || 0 })}
                                            min="0"
                                            className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Max Carry Forward Days
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.maxCarryForward}
                                            onChange={(e) => setFormData({ ...formData, maxCarryForward: parseInt(e.target.value) || 0 })}
                                            min="0"
                                            className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Encashment Rules Section */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-blue-200">
                                    💰 Encashment Rules
                                </h3>
                                <div className="mb-4">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.allowEncashment}
                                            onChange={(e) => setFormData({ ...formData, allowEncashment: e.target.checked })}
                                            className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer rounded"
                                        />
                                        <span className="ml-2 text-slate-700 font-medium">Allow Encashment</span>
                                    </label>
                                </div>
                                {formData.allowEncashment && (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Encashment Rules
                                        </label>
                                        <textarea
                                            value={formData.encashmentRules}
                                            onChange={(e) => setFormData({ ...formData, encashmentRules: e.target.value })}
                                            rows="3"
                                            placeholder="Specify rules for leave encashment..."
                                            className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700 resize-none"
                                        ></textarea>
                                    </div>
                                )}
                            </div>

                            {/* Status Section */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-blue-200">
                                    ✓ Status
                                </h3>
                                <div className="flex gap-6">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            value="Active"
                                            checked={formData.status === 'Active'}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span className="ml-2 text-slate-700 font-medium">Active</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            value="Inactive"
                                            checked={formData.status === 'Inactive'}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span className="ml-2 text-slate-700 font-medium">Inactive</span>
                                    </label>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-4 pt-6 border-t-2 border-slate-200">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-2 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    {editingPolicy ? 'Update Policy' : 'Save Policy'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeavePolicyManagement;