import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/apiCaller';



const emptyForm = {
    categoryName: '',
    categoryCode: '',
    description: '',
    status: 'Active',
};

const CategoryManagement = () => {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState(emptyForm);

    const [viewCategory, setViewCategory] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Fetch companies on mount
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const data = await apiRequest('/companies');
                const list = Array.isArray(data) ? data : [];
                setCompanies(list);
                if (list.length > 0) setSelectedCompanyId(list[0].id);
            } catch (err) {
                setError('Failed to fetch companies.');
                console.error(err);
            }
        };
        fetchCompanies();
    }, []);

    // Fetch categories when company changes
    const fetchCategories = async (companyId) => {
        if (!companyId) return;
        setLoading(true);
        try {
            const data = await apiRequest(`/categories?companyId=${companyId}`);
            setCategories(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err) {
            setError('Failed to fetch categories.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCompanyId) fetchCategories(selectedCompanyId);
    }, [selectedCompanyId]);

    const filteredCategories = categories.filter(c =>
        c.categoryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.categoryCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedCompany = companies.find(
        c => c.id === selectedCompanyId || c.id === Number(selectedCompanyId)
    );

    const openAddModal = () => {
        setEditingCategory(null);
        setFormData(emptyForm);
        setIsModalOpen(true);
    };

    const openEditModal = (category) => {
        setEditingCategory(category);
        setFormData({
            categoryName: category.categoryName || '',
            categoryCode: category.categoryCode || '',
            description: category.description || '',
            status: category.status || 'Active',
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    const openViewModal = (category) => {
        setViewCategory(category);
        setIsViewModalOpen(true);
    };

    const closeViewModal = () => {
        setIsViewModalOpen(false);
        setViewCategory(null);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const payload = { ...formData, companyId: selectedCompanyId };
        try {
            if (editingCategory) {
                await apiRequest(`/categories/${editingCategory.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
            } else {
                await apiRequest('/categories', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            }
            await fetchCategories(selectedCompanyId);
            closeModal();
        } catch (err) {
            setError(editingCategory ? 'Failed to update category.' : 'Failed to create category.');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this category?')) return;
        try {
            await apiRequest(`/categories/${id}`, { method: 'DELETE' });
            setCategories(categories.filter(c => c.id !== id));
        } catch (err) {
            setError('Failed to delete category.');
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-3 mb-2">
                    <span className="text-3xl">📂</span> Category Management
                </h1>
                <p className="text-slate-600">Manage employee categories across your organization</p>
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

            {/* Company Selector */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Select Company</label>
                        <select
                            value={selectedCompanyId}
                            onChange={(e) => {
                                setSelectedCompanyId(e.target.value);
                                setSearchTerm('');
                                setCategories([]);
                            }}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">-- Select a Company --</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

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
                                placeholder="Search by category name or code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <button
                        onClick={openAddModal}
                        disabled={!selectedCompanyId}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add Category
                    </button>
                </div>
            </div>

            {/* Categories Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {!selectedCompanyId ? (
                    <div className="px-6 py-12 text-center text-slate-500">
                        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="text-lg font-medium">Select a company to view categories</p>
                    </div>
                ) : loading ? (
                    <div className="flex justify-center items-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                                    <th className="px-6 py-4 text-left text-sm font-semibold">#</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Category Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Category Code</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Description</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCategories.length > 0 ? (
                                    filteredCategories.map((category, index) => (
                                        <tr key={category.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                            <td className="px-6 py-4 text-sm text-slate-600">{index + 1}</td>
                                            <td className="px-6 py-4 text-sm text-slate-900 font-medium">{category.categoryName}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-mono text-xs">
                                                    {category.categoryCode}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                                                {category.description || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    category.status === 'Active'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {category.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => openViewModal(category)}
                                                        className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors" title="View">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                    <button onClick={() => openEditModal(category)}
                                                        className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors" title="Edit">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                    </button>
                                                    <button onClick={() => handleDelete(category.id)}
                                                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors" title="Delete">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
                                                <p className="text-lg font-medium">No categories found</p>
                                                <p className="text-sm mt-1">Click 'Add Category' to get started</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <button onClick={closeModal} aria-label="Close"
                            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-red-500 hover:text-red-700 text-2xl font-bold transition-all z-10">×</button>

                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 rounded-t-xl">
                            <h2 className="text-xl font-bold">
                                {editingCategory ? '✏️ Edit Category' : '➕ Add New Category'}
                            </h2>
                        </div>

                        <form onSubmit={handleFormSubmit} className="p-6">
                            <div className="space-y-5">

                                {/* Company (disabled) */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                                    <input type="text" value={selectedCompany?.name || ''} disabled
                                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 cursor-not-allowed" />
                                </div>

                                {/* Category Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Category Name <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" value={formData.categoryName}
                                        onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                                        placeholder="e.g., Supervisor, Operator, Technician"
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div>

                                {/* Category Code */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Category Code <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" value={formData.categoryCode}
                                        onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value.toUpperCase() })}
                                        placeholder="e.g., SUP, OPR, TECH"
                                        required maxLength={10}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase" />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                                    <textarea value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Optional description..."
                                        rows={3}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-3">Status</label>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="status" value="Active"
                                                checked={formData.status === 'Active'}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                            <span className="text-sm text-slate-700 font-medium">Active</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="status" value="Inactive"
                                                checked={formData.status === 'Inactive'}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                            <span className="text-sm text-slate-700 font-medium">Inactive</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button type="button" onClick={closeModal}
                                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit"
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95">
                                    {editingCategory ? 'Update Category' : 'Save Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {isViewModalOpen && viewCategory && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <button onClick={closeViewModal} aria-label="Close"
                            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-red-500 hover:text-red-700 text-2xl font-bold transition-all">×</button>

                        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-5 rounded-t-xl">
                            <h2 className="text-xl font-bold">View Category</h2>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Company</p>
                                    <p className="text-sm font-semibold text-slate-800">{selectedCompany?.name || '—'}</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Category Code</p>
                                    <p className="text-sm font-mono font-bold text-slate-800">{viewCategory.categoryCode}</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Category Name</p>
                                    <p className="text-sm font-semibold text-slate-800">{viewCategory.categoryName}</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        viewCategory.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {viewCategory.status}
                                    </span>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Created At</p>
                                    <p className="text-sm text-slate-600">
                                        {viewCategory.createdAt
                                            ? new Date(viewCategory.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
                                <p className="text-sm text-slate-600">{viewCategory.description || '—'}</p>
                            </div>
                        </div>

                        <div className="flex gap-3 px-6 pb-6">
                            <button onClick={closeViewModal}
                                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                                Close
                            </button>
                            <button onClick={() => { closeViewModal(); openEditModal(viewCategory); }}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95">
                                Edit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryManagement;
