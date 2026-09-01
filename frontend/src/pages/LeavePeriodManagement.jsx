import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/apiCaller';


const LeavePeriodManagement = () => {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [periods, setPeriods] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState(null);
    const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '', status: 'Active' });

    useEffect(() => {
        const fetchCompanies = async () => {
            try { 
                const data = await apiRequest('/companies'); 
                setCompanies(data); 
                if (data.length > 0) setSelectedCompanyId(data[0].id); 
            }
            catch (err) { 
                setError(err.message); 
            } finally { 
                setLoading(false); 
            }
        };
        fetchCompanies();
    }, []);

    useEffect(() => {
        if (!selectedCompanyId) return;
        const fetchPeriods = async () => {
            setLoading(true);
            try { 
                const data = await apiRequest(`/leave-periods?companyId=${selectedCompanyId}`); 
                setPeriods(data); 
            }
            catch (err) { 
                setError(err.message); 
            } finally { 
                setLoading(false); 
            }
        };
        fetchPeriods();
    }, [selectedCompanyId]);

    const handleCompanyChange = (e) => setSelectedCompanyId(e.target.value);
    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const openAddModal = () => {
        setEditingPeriod(null);
        setFormData({ name: '', startDate: '', endDate: '', status: 'Active' });
        setIsModalOpen(true);
    };

    const openEditModal = (period) => {
        setEditingPeriod(period);
        setFormData({ ...period });
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const { status } = formData;
        const isActivating = status === 'Active' && (!editingPeriod || editingPeriod.status !== 'Active');
        const currentlyActive = periods.find(p => p.status === 'Active' && p.id !== editingPeriod?.id);

        if (isActivating && currentlyActive) {
            const confirmMessage = `Activating "${formData.name}" will deactivate the currently active period, "${currentlyActive.name}". Do you wish to continue?`;
            if (!window.confirm(confirmMessage)) {
                return;
            }
        }

        try {
            if (editingPeriod) {
                await apiRequest(`/leave-periods/${editingPeriod.id}`, { method: 'PUT', body: JSON.stringify({ ...formData, companyId: selectedCompanyId }) });
            } else {
                await apiRequest('/leave-periods', { method: 'POST', body: JSON.stringify({ ...formData, companyId: selectedCompanyId }) });
            }
            const data = await apiRequest(`/leave-periods?companyId=${selectedCompanyId}`);
            setPeriods(data);
            closeModal();
        } catch (err) {
            window.alert(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this leave period?')) return;
        try {
            await apiRequest(`/leave-periods/${id}`, { method: 'DELETE' });
            setPeriods(periods.filter(p => p.id !== id));
        } catch (err) {
            window.alert(err.message);
        }
    };

    const filteredPeriods = periods.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const selectedCompany = companies.find(c => c.id === selectedCompanyId);

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
                        <span>📆</span> Leave Period Management
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
                            placeholder="Search Periods..." 
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
                        + Add Period
                    </button>
                </div>

                {/* Table Container */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                    <th className="px-6 py-4 text-left text-sm font-semibold">ID</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Period Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Start Date</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">End Date</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center">
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                <span className="ml-3 text-slate-600">Loading...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredPeriods.length > 0 ? (
                                    filteredPeriods.map((p, index) => (
                                        <tr 
                                            key={p.id}
                                            className={`border-b border-slate-200 hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                                        >
                                            <td className="px-6 py-4 text-sm text-slate-700">{p.id}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{p.name}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700">{p.startDate}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700">{p.endDate}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                                    p.status === 'Active' 
                                                        ? 'bg-green-100 text-green-700 border border-green-300' 
                                                        : 'bg-red-100 text-red-700 border border-red-300'
                                                }`}>
                                                    {p.status === 'Active' ? '✓' : '✕'} {p.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => openEditModal(p)} 
                                                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(p.id)} 
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
                                        <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                            No leave periods found.
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
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white sticky top-0 z-10">
                            <button
                                onClick={closeModal}
                                aria-label="Close"
                                className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full text-red-500 hover:text-red-700 text-3xl font-bold transition-all">×
                            </button>
                            <h2 className="text-2xl font-bold">
                                {editingPeriod ? '✏️ Edit Leave Period' : '➕ Add New Leave Period'}
                            </h2>
                        </div>

                        {/* Modal Content */}
                        <form onSubmit={handleFormSubmit} className="p-8">
                            {/* Company Field */}
                            <div className="mb-6">
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

                            {/* Period Name Field */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Period Name <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    value={formData.name} 
                                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                    required
                                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                                    placeholder="e.g., FY 2024-2025"
                                />
                            </div>

                            {/* Date Fields */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Start Date <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="date" 
                                        value={formData.startDate} 
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })} 
                                        required
                                        className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        End Date <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="date" 
                                        value={formData.endDate} 
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })} 
                                        required
                                        className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                                    />
                                </div>
                            </div>

                            {/* Status Radio Group */}
                            <div className="mb-8">
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    Status
                                </label>
                                <div className="flex gap-6">
                                    <label className="flex items-center cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="status" 
                                            value="Active" 
                                            checked={formData.status === 'Active'} 
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
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
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span className="ml-2 text-slate-700 font-medium">Inactive</span>
                                    </label>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-4">
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
                                    {editingPeriod ? 'Update Period' : 'Save Period'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeavePeriodManagement;