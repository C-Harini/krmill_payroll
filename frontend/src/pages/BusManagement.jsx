import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/apiCaller';



const BusManagement = () => {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [buses, setBuses] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBus, setEditingBus] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        status: 'Active'
    });

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const data = await apiRequest('/companies');
                setCompanies(data);
                if (data.length > 0) setSelectedCompanyId(data[0].id);
            } catch (err) { setError(err.message); } finally { setLoading(false); }
        };
        fetchCompanies();
    }, []);

    useEffect(() => {
        if (!selectedCompanyId) return;
        const fetchBuses = async () => {
            setLoading(true);
            try {
                const data = await apiRequest(`/buses?companyId=${selectedCompanyId}`);
                setBuses(data);
            } catch (err) { setError(err.message); } finally { setLoading(false); }
        };
        fetchBuses();
    }, [selectedCompanyId]);

    const handleCompanyChange = (e) => setSelectedCompanyId(e.target.value);
    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const openAddModal = () => {
        setEditingBus(null);
        setFormData({ name: '', location: '', status: 'Active' });
        setIsModalOpen(true);
    };

    const openEditModal = (bus) => {
        setEditingBus(bus);
        setFormData({ name: bus.name, location: bus.location, status: bus.status });
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, companyId: selectedCompanyId };

            if (editingBus) {
                await apiRequest(`/buses/${editingBus.id}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                await apiRequest('/buses', { method: 'POST', body: JSON.stringify(payload) });
            }
            const data = await apiRequest(`/buses?companyId=${selectedCompanyId}`);
            setBuses(data);
            closeModal();
        } catch (err) {
            window.alert(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this bus?')) return;
        try {
            await apiRequest(`/buses/${id}`, { method: 'DELETE' });
            setBuses(buses.filter(b => b.id !== id));
        } catch (err) {
            window.alert(err.message);
        }
    };

    const filteredBuses = buses.filter(b => 
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const selectedCompany = companies.find(c => c.id === selectedCompanyId);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-3 mb-2">
                    <span className="text-3xl">🚌</span> Bus Management
                </h1>
                <p className="text-slate-600">Manage and monitor all buses across your organization</p>
            </div>

            {/* Company Selector Card */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Select Company
                        </label>
                        <select 
                            value={selectedCompanyId} 
                            onChange={handleCompanyChange}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {companies.map(company => (
                                <option key={company.id} value={company.id}>{company.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800 flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {/* Actions Bar */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <svg className="absolute left-3 top-3 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input 
                                type="text" 
                                placeholder="Search buses by name or location..." 
                                value={searchTerm} 
                                onChange={handleSearchChange}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <button 
                        onClick={openAddModal}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg active:scale-95"
                    >
                        + Add Bus
                    </button>
                </div>
            </div>

            {/* Buses Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                                    <th className="px-6 py-4 text-left text-sm font-semibold">ID</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Bus Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Location</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBuses.length > 0 ? (
                                    filteredBuses.map((bus, index) => (
                                        <tr key={bus.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                            <td className="px-6 py-4 text-sm text-slate-900 font-medium">{bus.id}</td>
                                            <td className="px-6 py-4 text-sm text-slate-900">{bus.name}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{bus.location}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    bus.status === 'Active' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {bus.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => openEditModal(bus)}
                                                        className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(bus.id)}
                                                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center">
                                            <div className="text-slate-500">
                                                <svg className="w-12 h-12 mx-auto mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                                <p className="text-lg font-medium">No buses found</p>
                                                <p className="text-sm mt-1">Add a new bus to get started</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
                            <h2 className="text-xl font-bold text-white">
                                {editingBus ? 'Edit Bus' : 'Add New Bus'}
                            </h2>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleFormSubmit} className="p-6">
                            <div className="space-y-5">
                                {/* Company Field (Disabled) */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                                    <input 
                                        type="text" 
                                        value={selectedCompany?.name || ''} 
                                        disabled
                                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 cursor-not-allowed"
                                    />
                                </div>

                                {/* Bus Name Field */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Bus Name <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.name} 
                                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                        placeholder="e.g., Bus A1"
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Location Field */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Location <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.location} 
                                        onChange={e => setFormData({ ...formData, location: e.target.value })} 
                                        placeholder="e.g., Main Office"
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Status Radio */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-3">Status</label>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="status" 
                                                value="Active" 
                                                checked={formData.status === 'Active'} 
                                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-700 font-medium">Active</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="status" 
                                                value="Inactive" 
                                                checked={formData.status === 'Inactive'} 
                                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-700 font-medium">Inactive</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex gap-3 mt-8">
                                <button 
                                    type="button" 
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95"
                                >
                                    {editingBus ? 'Update Bus' : 'Save Bus'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BusManagement;