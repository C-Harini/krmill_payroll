import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/apiCaller';


const DesignationManagement = () => {
    // --- State Management ---
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [designations, setDesignations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDesignation, setEditingDesignation] = useState(null);
    const [formData, setFormData] = useState({ name: '', acronym: '', status: 'Active' });

    // --- Effects ---
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

        const fetchDesignations = async () => {
            setLoading(true);
            try {
                const data = await apiRequest(`/designations?companyId=${selectedCompanyId}`);
                setDesignations(data);
                setError(null);
            } catch (err) {
                setError('Failed to fetch designations.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDesignations();
    }, [selectedCompanyId]);

    // --- Event Handlers ---
    const handleCompanyChange = (e) => {
        setSelectedCompanyId(e.target.value);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const openAddModal = () => {
        setEditingDesignation(null);
        setFormData({ name: '', acronym: '', status: 'Active' });
        setIsModalOpen(true);
    };

    const openEditModal = (designation) => {
        setEditingDesignation(designation);
        setFormData({ 
            name: designation.name, 
            acronym: designation.acronym, 
            status: designation.status 
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingDesignation(null);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const payload = { ...formData, companyId: selectedCompanyId };

        try {
            if (editingDesignation) {
                await apiRequest(`/designations/${editingDesignation.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
            } else {
                await apiRequest('/designations', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            }
            const data = await apiRequest(`/designations?companyId=${selectedCompanyId}`);
            setDesignations(data);
            closeModal();
        } catch (err) {
            setError(editingDesignation ? 'Failed to update designation.' : 'Failed to create designation.');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this designation?')) return;

        try {
            await apiRequest(`/designations/${id}`, { method: 'DELETE' });
            setDesignations(designations.filter(desig => desig.id !== id));
        } catch (err) {
            setError('Failed to delete designation.');
            console.error(err);
        }
    };

    // --- Derived Data ---
    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    const filteredDesignations = designations.filter(desig =>
        desig.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        desig.acronym.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- Render ---
    if (loading && companies.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-3">
                    <span className="text-4xl">🎯</span>
                    Designation Management
                </h1>
                <p className="text-slate-600 mt-2">Create and manage job designations for your organization</p>
            </div>

            {/* Company Selector */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <label htmlFor="company-select" className="block text-sm font-semibold text-slate-700 mb-3">Select Company:</label>
                <select 
                    id="company-select" 
                    value={selectedCompanyId} 
                    onChange={handleCompanyChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-800"
                >
                    {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                </select>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <p className="font-semibold text-red-800">{error}</p>
                    </div>
                </div>
            )}

            {/* Search and Add Button */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Search by designation name or acronym..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-3 text-slate-400">🔍</span>
                </div>
                <button 
                    onClick={openAddModal} 
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
                >
                    + Add Designation
                </button>
            </div>

            {/* Designations Table */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                                <th className="px-6 py-3 text-left text-sm font-semibold">ID</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Designation Name</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Acronym</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                                <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                            <span className="text-slate-600">Loading designations...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredDesignations.length > 0 ? (
                                filteredDesignations.map((desig, index) => (
                                    <tr key={desig.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
                                        <td className="px-6 py-4 text-sm text-slate-800">{desig.id}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{desig.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-slate-100 text-slate-800 text-sm font-mono rounded-full">{desig.acronym}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                desig.status === 'Active' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {desig.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button 
                                                    onClick={() => openEditModal(desig)} 
                                                    title="Edit"
                                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                >
                                                    ✏️
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(desig.id)} 
                                                    title="Delete"
                                                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center">
                                        <div className="text-slate-500">
                                            <span className="text-4xl mb-2 block">📋</span>
                                            <p>No designations found.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                            <button
                                onClick={closeModal}
                                aria-label="Close"
                                className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full text-red-500 hover:text-red-700 text-3xl font-bold transition-all">×
                            </button>

                            <h2 className="text-xl font-bold">
                                {editingDesignation ? '✏️ Edit Designation' : '➕ Add New Designation'}
                            </h2>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                            {/* Company Field */}
                            <div>
                                <label htmlFor="company-name" className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                                <input 
                                    type="text" 
                                    id="company-name" 
                                    value={selectedCompany?.name || ''} 
                                    disabled 
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
                                />
                            </div>

                            {/* Designation Name Field */}
                            <div>
                                <label htmlFor="desig-name" className="block text-sm font-semibold text-slate-700 mb-2">Designation Name</label>
                                <input
                                    type="text"
                                    id="desig-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Acronym Field */}
                            <div>
                                <label htmlFor="desig-acronym" className="block text-sm font-semibold text-slate-700 mb-2">Acronym</label>
                                <input
                                    type="text"
                                    id="desig-acronym"
                                    value={formData.acronym}
                                    onChange={(e) => setFormData({ ...formData, acronym: e.target.value.toUpperCase() })}
                                    maxLength="10"
                                    required
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                />
                            </div>

                            {/* Status Radio */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">Status</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="status" 
                                            value="Active" 
                                            checked={formData.status === 'Active'} 
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-4 h-4 text-blue-600 cursor-pointer"
                                        />
                                        <span className="text-slate-700">Active</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="status" 
                                            value="Inactive" 
                                            checked={formData.status === 'Inactive'} 
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-4 h-4 text-blue-600 cursor-pointer"
                                        />
                                        <span className="text-slate-700">Inactive</span>
                                    </label>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex gap-3 pt-4 border-t border-slate-200">
                                <button 
                                    type="button" 
                                    onClick={closeModal} 
                                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
                                >
                                    {editingDesignation ? 'Update Designation' : 'Save Designation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DesignationManagement;