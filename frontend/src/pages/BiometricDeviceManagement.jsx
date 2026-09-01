import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/apiCaller';

const BiometricDeviceManagement = () => {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [devices, setDevices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        deviceIP: '',
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
        const fetchDevices = async () => {
            setLoading(true);
            try {
                const data = await apiRequest(`/biometric-devices?companyId=${selectedCompanyId}`);
                setDevices(data);
            } catch (err) { setError(err.message); } finally { setLoading(false); }
        };
        fetchDevices();
    }, [selectedCompanyId]);

    const handleCompanyChange = (e) => setSelectedCompanyId(e.target.value);
    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const openAddModal = () => {
        setEditingDevice(null);
        setFormData({ name: '', location: '', deviceIP: '', status: 'Active' });
        setIsModalOpen(true);
    };

    const openEditModal = (device) => {
        setEditingDevice(device);
        setFormData({ name: device.name, location: device.location, deviceIP: device.deviceIP || '', status: device.status });
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, companyId: selectedCompanyId };

            if (editingDevice) {
                await apiRequest(`/biometric-devices/${editingDevice.id}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                await apiRequest('/biometric-devices', { method: 'POST', body: JSON.stringify(payload) });
            }
            const data = await apiRequest(`/biometric-devices?companyId=${selectedCompanyId}`);
            setDevices(data);
            closeModal();
        } catch (err) {
            window.alert(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this biometric device?')) return;
        try {
            await apiRequest(`/biometric-devices/${id}`, { method: 'DELETE' });
            setDevices(devices.filter(d => d.id !== id));
        } catch (err) {
            window.alert(err.message);
        }
    };

    const filteredDevices = devices.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const selectedCompany = companies.find(c => c.id === selectedCompanyId);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-3 mb-2">
                    <span className="text-3xl">🔐</span> Biometric Device Management
                </h1>
                <p className="text-slate-600">Manage and monitor all biometric devices across your organization</p>
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
                                placeholder="Search devices by name or location..." 
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
                        + Add Device
                    </button>
                </div>
            </div>

            {/* Devices Table */}
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
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Device Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Location</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Device IP</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDevices.length > 0 ? (
                                    filteredDevices.map((device, index) => (
                                        <tr key={device.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                            <td className="px-6 py-4 text-sm text-slate-900 font-medium">{device.id}</td>
                                            <td className="px-6 py-4 text-sm text-slate-900">{device.name}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{device.location}</td>
                                            <td className="px-6 py-4 text-sm font-mono text-slate-700 bg-slate-100 rounded px-2 py-1 inline-block">{device.deviceIP || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    device.status === 'Active' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {device.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => openEditModal(device)}
                                                        className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(device.id)}
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
                                        <td colSpan="6" className="px-6 py-12 text-center">
                                            <div className="text-slate-500">
                                                <svg className="w-12 h-12 mx-auto mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                </svg>
                                                <p className="text-lg font-medium">No biometric devices found</p>
                                                <p className="text-sm mt-1">Add a new device to get started</p>
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
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
                            <button
                                onClick={closeModal}
                                aria-label="Close"
                                className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full text-red-500 hover:text-red-700 text-3xl font-bold transition-all">×
                            </button>
                            <h2 className="text-xl font-bold text-white">
                                {editingDevice ? 'Edit Biometric Device' : 'Add New Biometric Device'}
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

                                {/* Device Name Field */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Device Name <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.name} 
                                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                        placeholder="e.g., Entrance Scanner"
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
                                        placeholder="e.g., Main Entrance, Floor 2"
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Device IP Field */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Device IP Address</label>
                                    <input 
                                        type="text" 
                                        value={formData.deviceIP} 
                                        onChange={e => setFormData({ ...formData, deviceIP: e.target.value })} 
                                        placeholder="e.g., 192.168.1.100"
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
                                    {editingDevice ? 'Update Device' : 'Save Device'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BiometricDeviceManagement;