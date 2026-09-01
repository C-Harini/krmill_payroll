import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/apiCaller';



const LeaveTypeManagement = () => {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [types, setTypes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [formData, setFormData] = useState({
        name: '', description: '', isPaid: false, isWithoutPay: false,
        isCarryForwardEnabled: false, countHolidaysAsLeave: false,
        maxConsecutiveLeaves: 0, status: 'Active'
    });

    useEffect(() => {
        const fetchCompanies = async () => {
            try { const data = await apiRequest('/companies'); setCompanies(data); if (data.length > 0) setSelectedCompanyId(data[0].id); }
            catch (err) { setError(err.message); } finally { setLoading(false); }
        };
        fetchCompanies();
    }, []);

    useEffect(() => {
        if (!selectedCompanyId) return;
        const fetchTypes = async () => {
            setLoading(true);
            try { const data = await apiRequest(`/leave-types?companyId=${selectedCompanyId}`); setTypes(data); }
            catch (err) { setError(err.message); } finally { setLoading(false); }
        };
        fetchTypes();
    }, [selectedCompanyId]);

    const handleCompanyChange = (e) => setSelectedCompanyId(e.target.value);
    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const openAddModal = () => {
        setEditingType(null);
        setFormData({ name: '', description: '', isPaid: false, isWithoutPay: false, isCarryForwardEnabled: false, countHolidaysAsLeave: false, maxConsecutiveLeaves: 0, status: 'Active' });
        setIsModalOpen(true);
    };

    const openEditModal = (type) => {
        setEditingType(type);
        setFormData({ ...type });
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, companyId: selectedCompanyId };
            if (payload.isPaid) payload.isWithoutPay = false;

            if (editingType) {
                await apiRequest(`/leave-types/${editingType.id}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                await apiRequest('/leave-types', { method: 'POST', body: JSON.stringify(payload) });
            }
            const data = await apiRequest(`/leave-types?companyId=${selectedCompanyId}`);
            setTypes(data);
            closeModal();
        } catch (err) {
            window.alert(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this leave type?')) return;
        try {
            await apiRequest(`/leave-types/${id}`, { method: 'DELETE' });
            setTypes(types.filter(t => t.id !== id));
        } catch (err) {
            window.alert(err.message);
        }
    };

    const filteredTypes = types.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const selectedCompany = companies.find(c => c.id === selectedCompanyId);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-800">Leave Type Management</h1>
                </div>

                {/* Company Selector */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <label htmlFor="company-select" className="block text-sm font-semibold text-gray-700 mb-2">Select Company:</label>
                    <select
                        id="company-select"
                        value={selectedCompanyId}
                        onChange={handleCompanyChange}
                        className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
                    </select>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
                        {error}
                    </div>
                )}

                {/* Actions Bar */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <input
                        type="text"
                        placeholder="Search Types..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                        onClick={openAddModal}
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
                    >
                        + Add Type
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">ID</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Type Name</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Paid</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Carry Fwd</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                                    <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredTypes.length > 0 ? (
                                    filteredTypes.map((t, index) => (
                                        <tr key={t.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="px-6 py-4 text-sm text-gray-700">{t.id}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-800">{t.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{t.isPaid ? 'Paid' : 'Unpaid'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{t.isCarryForwardEnabled ? '✓' : '✗'}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    t.status === 'Active'
                                                        ? 'bg-green-100 text-green-700 border border-green-300'
                                                        : 'bg-red-100 text-red-700 border border-red-300'
                                                }`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <button
                                                        onClick={() => openEditModal(t)}
                                                        title="Edit"
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(t.id)}
                                                        title="Delete"
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No leave types found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
                            <button
                                onClick={closeModal}
                                aria-label="Close"
                                className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full text-red-500 hover:text-red-700 text-3xl font-bold transition-all">×
                            </button>
                            <h2 className="text-2xl font-bold text-white">
                                {editingType ? 'Edit Leave Type' : 'Add New Leave Type'}
                            </h2>
                            
                        </div>

                        <form onSubmit={handleFormSubmit} className="p-6">
                            <div className="space-y-6">
                                {/* Company Field */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Company</label>
                                        <input
                                            type="text"
                                            value={selectedCompany?.name || ''}
                                            disabled
                                            className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        rows="3"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    ></textarea>
                                </div>

                                {/* Pay Type Section */}
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Pay Type</label>
                                    <div className="space-y-2">
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="radio"
                                                name="isPaid"
                                                checked={formData.isPaid === true}
                                                onChange={() => setFormData({ ...formData, isPaid: true, isWithoutPay: false })}
                                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Paid</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="radio"
                                                name="isPaid"
                                                checked={formData.isPaid === false}
                                                onChange={() => setFormData({ ...formData, isPaid: false })}
                                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Unpaid</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Checkboxes Section */}
                                <div className="space-y-3">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id="isWithoutPay"
                                            checked={formData.isWithoutPay}
                                            onChange={e => setFormData({ ...formData, isWithoutPay: e.target.checked })}
                                            disabled={formData.isPaid}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        <span className={`ml-2 text-sm ${formData.isPaid ? 'text-gray-400' : 'text-gray-700'}`}>
                                            Is Leave Without Pay
                                        </span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id="isCarryForward"
                                            checked={formData.isCarryForwardEnabled}
                                            onChange={e => setFormData({ ...formData, isCarryForwardEnabled: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Is Carry Forward Enabled</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id="countHolidays"
                                            checked={formData.countHolidaysAsLeave}
                                            onChange={e => setFormData({ ...formData, countHolidaysAsLeave: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Count Holidays as Leave</span>
                                    </label>
                                </div>

                                {/* Max Consecutive Leaves */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Max Consecutive Leaves</label>
                                    <input
                                        type="number"
                                        value={formData.maxConsecutiveLeaves}
                                        onChange={e => setFormData({ ...formData, maxConsecutiveLeaves: e.target.value })}
                                        min="0"
                                        className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Status Section */}
                                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Status</label>
                                    <div className="space-y-2">
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="radio"
                                                name="status"
                                                value="Active"
                                                checked={formData.status === 'Active'}
                                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Active</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="radio"
                                                name="status"
                                                value="Inactive"
                                                checked={formData.status === 'Inactive'}
                                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Inactive</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                                >
                                    {editingType ? 'Update Type' : 'Save Type'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveTypeManagement;