import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/apiCaller';



const ReligionManagement = () => {
    // ── Company selection ─────────────────────────────────────────
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState('');
    const [loadingCompanies, setLoadingCompanies] = useState(true);

    // ── Religion data ─────────────────────────────────────────────
    const [religions, setReligions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ── Add/Edit Modal ────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReligion, setEditingReligion] = useState(null);
    const [formData, setFormData] = useState({
        religionName: '',
        religionCode: '',
        description: '',
        status: 'Active',
    });

    // ── View Modal ────────────────────────────────────────────────
    const [viewReligion, setViewReligion] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // ── Fetch Companies ───────────────────────────────────────────
    const fetchCompanies = async () => {
        setLoadingCompanies(true);
        try {
            const data = await apiRequest('/companies');
            setCompanies(Array.isArray(data) ? data : data.companies || []);
        } catch (err) {
            setError('Failed to fetch companies.');
            console.error(err);
        } finally {
            setLoadingCompanies(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    // ── Fetch Religions ───────────────────────────────────────────
    const fetchReligions = async (companyId) => {
        if (!companyId) return;
        setLoading(true);
        try {
            const data = await apiRequest(`/religions?companyId=${companyId}`);
            setReligions(Array.isArray(data) ? data : data.religions || []);
            setError(null);
        } catch (err) {
            setError('Failed to fetch religions.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCompany) {
            fetchReligions(selectedCompany);
        } else {
            setReligions([]);
        }
    }, [selectedCompany]);

    // ── Search filter ─────────────────────────────────────────────
    const filteredReligions = religions.filter(r =>
        r.religionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.religionCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ── Modal Handlers ────────────────────────────────────────────
    const openAddModal = () => {
        if (!selectedCompany) {
            alert('Please select a company first.');
            return;
        }
        setEditingReligion(null);
        setFormData({ religionName: '', religionCode: '', description: '', status: 'Active' });
        setIsModalOpen(true);
    };

    const openEditModal = (religion) => {
        setEditingReligion(religion);
        setFormData({
            religionName: religion.religionName || '',
            religionCode: religion.religionCode || '',
            description: religion.description || '',
            status: religion.status || 'Active',
        });
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingReligion(null); };
    const openViewModal = (religion) => { setViewReligion(religion); setIsViewModalOpen(true); };
    const closeViewModal = () => { setIsViewModalOpen(false); setViewReligion(null); };

    // ── Submit ────────────────────────────────────────────────────
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, companyId: selectedCompany };
            if (editingReligion) {
                await apiRequest(`/religions/${editingReligion.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
            } else {
                await apiRequest('/religions', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            }
            await fetchReligions(selectedCompany);
            closeModal();
        } catch (err) {
            setError(editingReligion ? 'Failed to update religion.' : 'Failed to create religion.');
            console.error(err);
        }
    };

    // ── Delete ────────────────────────────────────────────────────
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this religion?')) return;
        try {
            await apiRequest(`/religions/${id}`, { method: 'DELETE' });
            setReligions(religions.filter(r => r.id !== id));
        } catch (err) {
            setError('Failed to delete religion.');
            console.error(err);
        }
    };

    // ─────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-3 mb-2">
                    <span className="text-3xl">🕌</span> Religion Management
                </h1>
                <p className="text-slate-600">Manage religions for each company</p>
            </div>

            {/* Company Selector */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select Company <span className="text-red-500">*</span>
                </label>
                {loadingCompanies ? (
                    <div className="flex items-center gap-2 text-slate-500">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                        <span className="text-sm">Loading companies...</span>
                    </div>
                ) : (
                    <select
                        value={selectedCompany}
                        onChange={(e) => {
                            setSelectedCompany(e.target.value);
                            setSearchTerm('');
                            setError(null);
                        }}
                        className="w-full md:w-80 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
                    >
                        <option value="">-- Select Company --</option>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                                {company.name || company.companyName}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {selectedCompany ? (
                <>
                    {/* Search + Add */}
                    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Search by religion name, code or description..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
                            </div>
                            <button
                                onClick={openAddModal}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg active:scale-95 flex items-center gap-2 justify-center whitespace-nowrap"
                            >
                                <span className="text-xl">+</span> Add Religion
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-3">
                            <span className="text-2xl">⚠️</span>
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-md overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">ID</th>
                                            <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Religion Name</th>
                                            <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Code</th>
                                            <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Description</th>
                                            <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {filteredReligions.length > 0 ? (
                                            filteredReligions.map((religion, index) => (
                                                <tr
                                                    key={religion.id}
                                                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}
                                                >
                                                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{religion.id}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-800 font-semibold">{religion.religionName}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-700 font-mono font-bold">{religion.religionCode}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{religion.description || '—'}</td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${religion.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            {religion.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex gap-2 justify-center">
                                                            <button onClick={() => openViewModal(religion)} className="px-4 py-2 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition-all shadow active:scale-95">View</button>
                                                            <button onClick={() => openEditModal(religion)} className="px-4 py-2 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-all shadow active:scale-95">Edit</button>
                                                            <button onClick={() => handleDelete(religion.id)} className="px-4 py-2 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-all shadow active:scale-95">Delete</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-12 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <span className="text-6xl">📭</span>
                                                        <p className="text-lg font-semibold text-slate-600">No religions found</p>
                                                        <p className="text-sm text-slate-500">
                                                            {searchTerm ? 'Try adjusting your search' : 'Get started by adding a new religion'}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <span className="text-6xl block mb-4">🏢</span>
                    <p className="text-xl font-semibold text-slate-700 mb-2">Please select a company</p>
                    <p className="text-slate-500">Choose a company from the dropdown above to manage religions</p>
                </div>
            )}

            {/* ── Add/Edit Modal ──────────────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full text-red-500 hover:text-red-700 text-3xl font-bold transition-all"
                        >
                            ×
                        </button>

                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 rounded-t-xl">
                            <h2 className="text-xl font-bold">
                                {editingReligion ? 'Edit Religion' : 'Add New Religion'}
                            </h2>
                        </div>

                        <form onSubmit={handleFormSubmit} className="p-6">
                            <div className="space-y-5">

                                {/* Religion Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Religion Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.religionName}
                                        onChange={(e) => setFormData({ ...formData, religionName: e.target.value })}
                                        placeholder="e.g., Hindu, Muslim, Christian"
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Religion Code */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Religion Code <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.religionCode}
                                        onChange={(e) => setFormData({ ...formData, religionCode: e.target.value.toUpperCase() })}
                                        placeholder="e.g., HND, MSL, CHR"
                                        required
                                        maxLength={20}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Optional description..."
                                        rows={3}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-3">Status</label>
                                    <div className="flex gap-6">
                                        {['Active', 'Inactive'].map((s) => (
                                            <label key={s} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    value={s}
                                                    checked={formData.status === s}
                                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-slate-700 font-medium">{s}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

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
                                    {editingReligion ? 'Update Religion' : 'Save Religion'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── View Modal ──────────────────────────────────────────────── */}
            {isViewModalOpen && viewReligion && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <button
                            onClick={closeViewModal}
                            className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full text-red-500 hover:text-red-700 text-3xl font-bold transition-all"
                        >
                            ×
                        </button>

                        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-5 rounded-t-xl">
                            <h2 className="text-xl font-bold">View Religion</h2>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Religion Name</p>
                                    <p className="text-sm font-semibold text-slate-800">{viewReligion.religionName}</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Religion Code</p>
                                    <p className="text-sm font-mono font-bold text-slate-800">{viewReligion.religionCode}</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${viewReligion.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {viewReligion.status}
                                    </span>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Company ID</p>
                                    <p className="text-sm font-semibold text-slate-800">{viewReligion.companyId}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
                                <p className="text-sm text-slate-600">{viewReligion.description || '—'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Created At</p>
                                    <p className="text-sm text-slate-600">
                                        {viewReligion.createdAt
                                            ? new Date(viewReligion.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : '—'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Last Updated</p>
                                    <p className="text-sm text-slate-600">
                                        {viewReligion.updatedAt
                                            ? new Date(viewReligion.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                onClick={closeViewModal}
                                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => { closeViewModal(); openEditModal(viewReligion); }}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95"
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReligionManagement;