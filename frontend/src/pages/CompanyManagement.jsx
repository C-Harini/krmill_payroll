import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/apiCaller';

const CompanyManagement = () => {
    const [companies, setCompanies] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [formData, setFormData] = useState({
        name: '', logo: '', registrationNumber: '', phone: '', email: '', website: '',
        tin: '', pan: '', gst: '', bankName: '', bankAccountNumber: '', bankIfscCode: '',
        financialYearStart: '', financialYearEnd: '', status: 'Active'
    });

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const data = await apiRequest('/companies');
                setCompanies(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const openAddModal = () => {
        setEditingCompany(null);
        setFormData({
            name: '', logo: '', registrationNumber: '', phone: '', email: '', website: '',
            tin: '', pan: '', gst: '', bankName: '', bankAccountNumber: '', bankIfscCode: '',
            financialYearStart: '', financialYearEnd: '', status: 'Active'
        });
        setIsModalOpen(true);
    };

    const openEditModal = (company) => {
        setEditingCompany(company);
        setFormData({ ...company });
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCompany) {
                await apiRequest(`/companies/${editingCompany.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData),
                });
            } else {
                await apiRequest('/companies', {
                    method: 'POST',
                    body: JSON.stringify(formData),
                });
            }
            const data = await apiRequest('/companies');
            setCompanies(data);
            closeModal();
        } catch (err) {
            window.alert(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this company? This will also delete all its associated data.')) return;
        try {
            await apiRequest(`/companies/${id}`, { method: 'DELETE' });
            setCompanies(companies.filter(comp => comp.id !== id));
        } catch (err) {
            window.alert(err.message);
        }
    };

    const filteredCompanies = companies.filter(comp =>
        comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-slate-800 mb-2">🏢 Company Management</h1>
                <p className="text-slate-600">Manage and organize all companies in your system</p>
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

            {/* Search and Add Bar */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <svg className="absolute left-3 top-3 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input 
                                type="text" 
                                placeholder="Search companies by name or email..." 
                                value={searchTerm} 
                                onChange={handleSearchChange}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <button 
                        onClick={openAddModal}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                        </svg>
                        Add Company
                    </button>
                </div>
            </div>

            {/* Companies Table */}
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
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Company Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCompanies.length > 0 ? (
                                    filteredCompanies.map((comp, index) => (
                                        <tr key={comp.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                            <td className="px-6 py-4 text-sm text-slate-900 font-medium">{comp.id}</td>
                                            <td className="px-6 py-4 text-sm text-slate-900 font-medium">{comp.name}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{comp.email || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    comp.status === 'Active' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {comp.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => openEditModal(comp)}
                                                        className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(comp.id)}
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
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                                                </svg>
                                                <p className="text-lg font-medium">No companies found</p>
                                                <p className="text-sm mt-1">Add a new company to get started</p>
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
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 rounded-t-xl sticky top-0 z-10">
                            <button
                                onClick={closeModal}
                                aria-label="Close"
                                className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full text-red-500 hover:text-red-700 text-3xl font-bold transition-all">×
                            </button>
                            <h2 className="text-2xl font-bold">
                                {editingCompany ? '✏️ Edit Company' : '➕ Add New Company'}
                            </h2>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleFormSubmit} className="p-6">
                            <div className="space-y-6">
                                {/* Basic Information Section */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">Basic Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Company Name *</label>
                                            <input 
                                                type="text" 
                                                value={formData.name} 
                                                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                                placeholder="Enter company name"
                                                required
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Logo URL</label>
                                            <input 
                                                type="text" 
                                                value={formData.logo} 
                                                onChange={e => setFormData({ ...formData, logo: e.target.value })}
                                                placeholder="https://example.com/logo.png"
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Registration No. *</label>
                                            <input 
                                                type="text" 
                                                value={formData.registrationNumber} 
                                                onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                                                placeholder="Enter registration number"
                                                required
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Website</label>
                                            <input 
                                                type="url" 
                                                value={formData.website} 
                                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                                                placeholder="https://example.com"
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Information Section */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">Contact Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Phone *</label>
                                            <input 
                                                type="tel" 
                                                value={formData.phone} 
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                pattern="[0-9]{10}"
                                                title="Please enter a 10-digit phone number"
                                                placeholder="9999999999"
                                                required
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Email *</label>
                                            <input 
                                                type="email" 
                                                value={formData.email} 
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="company@example.com"
                                                required
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Tax Information Section */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">Tax Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">TIN</label>
                                            <input 
                                                type="text" 
                                                value={formData.tin} 
                                                onChange={e => setFormData({ ...formData, tin: e.target.value })}
                                                placeholder="Tax Identification Number"
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">PAN</label>
                                            <input 
                                                type="text" 
                                                value={formData.pan} 
                                                onChange={e => setFormData({ ...formData, pan: e.target.value })}
                                                placeholder="Permanent Account Number"
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">GST</label>
                                            <input 
                                                type="text" 
                                                value={formData.gst} 
                                                onChange={e => setFormData({ ...formData, gst: e.target.value })}
                                                placeholder="GST Number"
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Bank Information Section */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">Bank Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Bank Name</label>
                                            <input 
                                                type="text" 
                                                value={formData.bankName} 
                                                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                                placeholder="Bank name"
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Account Number</label>
                                            <input 
                                                type="text" 
                                                value={formData.bankAccountNumber} 
                                                onChange={e => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                                                placeholder="Bank account number"
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">IFSC Code</label>
                                            <input 
                                                type="text" 
                                                value={formData.bankIfscCode} 
                                                onChange={e => setFormData({ ...formData, bankIfscCode: e.target.value })}
                                                placeholder="IFSC code"
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Year Section */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">Financial Year</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Financial Year Start</label>
                                            <input 
                                                type="date" 
                                                value={formData.financialYearStart} 
                                                onChange={e => setFormData({ ...formData, financialYearStart: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Financial Year End</label>
                                            <input 
                                                type="date" 
                                                value={formData.financialYearEnd} 
                                                onChange={e => setFormData({ ...formData, financialYearEnd: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Status Section */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">Status</h3>
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
                            <div className="flex gap-3 mt-8 pt-6 border-t border-slate-200">
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
                                    {editingCompany ? 'Update Company' : 'Save Company'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyManagement;