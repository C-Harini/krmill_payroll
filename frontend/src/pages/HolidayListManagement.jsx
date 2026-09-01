import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../utils/apiCaller';



const HolidayListManagement = () => {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modals
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

    const [editingList, setEditingList] = useState(null);
    const [currentListId, setCurrentListId] = useState(null);
    const [holidays, setHolidays] = useState([]);
    const [editingHoliday, setEditingHoliday] = useState(null);

    // Form Data
    const [listFormData, setListFormData] = useState({ name: '', startDate: '', endDate: '', weekOffs: { sunday: true, saturday: false, friday: false }, status: 'Active' });
    const [holidayFormData, setHolidayFormData] = useState({ date: '', description: '' });
    const [showAddHolidayForm, setShowAddHolidayForm] = useState(false);

    // Import Progress
    const [importProgress, setImportProgress] = useState({ progress: 0, current: '', status: 'processing' });
    const fileInputRef = useRef(null);
    const pollingIntervalRef = useRef(null);

    // --- Effects ---
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
        const fetchLists = async () => {
            setLoading(true);
            try { 
                const data = await apiRequest(`/holiday-lists?companyId=${selectedCompanyId}`); 
                setLists(data); 
            }
            catch (err) { 
                setError(err.message); 
            } finally { 
                setLoading(false); 
            }
        };
        fetchLists();
    }, [selectedCompanyId]);
    
    // --- List Handlers ---
    const handleCompanyChange = (e) => setSelectedCompanyId(e.target.value);
    const openAddListModal = () => { 
        setEditingList(null); 
        setListFormData({ name: '', startDate: '', endDate: '', weekOffs: { sunday: true, saturday: false, friday: false }, status: 'Active' }); 
        setIsListModalOpen(true); 
    };
    const openEditListModal = (list) => { 
        setEditingList(list); 
        setListFormData({ ...list, weekOffs: list.weekOffs || { sunday: true, saturday: false, friday: false } }); 
        setIsListModalOpen(true); 
    };
    const closeListModal = () => setIsListModalOpen(false);
    const handleListFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingList) 
                await apiRequest(`/holiday-lists/${editingList.id}`, { method: 'PUT', body: JSON.stringify({ ...listFormData, companyId: selectedCompanyId }) });
            else 
                await apiRequest('/holiday-lists', { method: 'POST', body: JSON.stringify({ ...listFormData, companyId: selectedCompanyId }) });
            const data = await apiRequest(`/holiday-lists?companyId=${selectedCompanyId}`);
            setLists(data);
            closeListModal();
        } catch (err) { 
            window.alert(err.message); 
        }
    };
    const handleDeleteList = async (id) => { 
        if (!window.confirm('Are you sure? This will delete all holidays in this list.')) return; 
        try { 
            await apiRequest(`/holiday-lists/${id}`, { method: 'DELETE' }); 
            setLists(lists.filter(l => l.id !== id)); 
        } catch (err) { 
            window.alert(err.message); 
        } 
    };

    // --- Holiday Handlers ---
    const openHolidayModal = async (listId) => {
        setCurrentListId(listId);
        try { 
            const data = await apiRequest(`/holidays/list/${listId}`); 
            setHolidays(data); 
        }
        catch (err) { 
            window.alert(err.message); 
        }
        setEditingHoliday(null);
        setHolidayFormData({ date: '', description: '' });
        setShowAddHolidayForm(false);
        setIsHolidayModalOpen(true);
    };
    const closeHolidayModal = () => {
        setIsHolidayModalOpen(false);
        setShowAddHolidayForm(false);
    };
    const handleHolidayFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingHoliday) {
                await apiRequest(`/holidays/${editingHoliday.id}`, { method: 'PUT', body: JSON.stringify({ ...holidayFormData, holidayListId: currentListId }) });
            } else {
                await apiRequest('/holidays', { method: 'POST', body: JSON.stringify({ ...holidayFormData, holidayListId: currentListId }) });
            }
            const data = await apiRequest(`/holidays/list/${currentListId}`);
            setHolidays(data);
            setHolidayFormData({ date: '', description: '' });
            setEditingHoliday(null);
            setShowAddHolidayForm(false);
        } catch (err) { 
            window.alert(err.message); 
        }
    };
    const openEditHolidayModal = (holiday) => {
        setEditingHoliday(holiday);
        setHolidayFormData({ date: holiday.date, description: holiday.description });
        setShowAddHolidayForm(false);
    };
    const handleDeleteHoliday = async (id) => { 
        if (!window.confirm('Delete this holiday?')) return; 
        try { 
            await apiRequest(`/holidays/${id}`, { method: 'DELETE' }); 
            setHolidays(holidays.filter(h => h.id !== id)); 
        } catch (err) { 
            window.alert(err.message); 
        } 
    };

    // --- Import Handlers ---
    const openImportModal = () => { 
        setIsImportModalOpen(true); 
    };
    const handleFileUpload = async (e) => {
        e.preventDefault();
        const file = fileInputRef.current.files[0];
        if (!file) {
            window.alert('Please select a file to upload.');
            return;
        }
        
        const formData = new FormData();
        formData.append('holidaysFile', file);
        formData.append('holidayListId', currentListId);

        setIsImportModalOpen(false);
        setIsProgressModalOpen(true);

        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/import/holidays`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Upload failed');
            }

            const { jobId } = await response.json();
            startPolling(jobId);
        } catch (err) {
            console.error(err);
            window.alert(err.message);
            setIsProgressModalOpen(false);
        }
    };
    const startPolling = (jobId) => {
        pollingIntervalRef.current = setInterval(async () => {
            try {
                const status = await apiRequest(`/import/status/${jobId}`);
                setImportProgress(status);
                if (status.status === 'completed') {
                    clearInterval(pollingIntervalRef.current);
                    setTimeout(() => { 
                        setIsProgressModalOpen(false); 
                        window.alert('Import completed!'); 
                        openHolidayModal(currentListId); 
                    }, 1500);
                } else if (status.status === 'failed') {
                    clearInterval(pollingIntervalRef.current); 
                    setIsProgressModalOpen(false); 
                    window.alert(`Import failed: ${status.error}`);
                }
            } catch (err) { 
                console.error(err); 
                clearInterval(pollingIntervalRef.current); 
                setIsProgressModalOpen(false); 
            }
        }, 1000);
    };

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
                        <span>📅</span> Holiday List Management
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
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                            placeholder="Search Lists..." 
                            className="w-full px-4 py-2 pl-10 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                        />
                        <svg className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button 
                        onClick={openAddListModal} 
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    >
                        + Add List
                    </button>
                </div>

                {/* Table Container */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                    <th className="px-6 py-4 text-left text-sm font-semibold">ID</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold">List Name</th>
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
                                ) : lists.length > 0 ? (
                                    lists.map((list, index) => (
                                        <tr 
                                            key={list.id}
                                            className={`border-b border-slate-200 hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                                        >
                                            <td className="px-6 py-4 text-sm text-slate-700">{list.id}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{list.name}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700">{list.startDate}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700">{list.endDate}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                                    list.status === 'Active' 
                                                        ? 'bg-green-100 text-green-700 border border-green-300' 
                                                        : 'bg-red-100 text-red-700 border border-red-300'
                                                }`}>
                                                    {list.status === 'Active' ? '✓' : '✕'} {list.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => openHolidayModal(list.id)} 
                                                        title="Manage Holidays"
                                                        className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors duration-200"
                                                    >
                                                        📅
                                                    </button>
                                                    <button 
                                                        onClick={() => openEditListModal(list)} 
                                                        title="Edit List"
                                                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteList(list.id)} 
                                                        title="Delete List"
                                                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
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
                                            No holiday lists found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* List Modal */}
            {isListModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white sticky top-0 z-10">
                            <h2 className="text-2xl font-bold">
                                {editingList ? '✏️ Edit Holiday List' : '➕ Add New Holiday List'}
                            </h2>
                        </div>

                        {/* Modal Content */}
                        <form onSubmit={handleListFormSubmit} className="p-8">
                            {/* Company Field */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                                <input 
                                    type="text" 
                                    value={selectedCompany?.name || ''} 
                                    disabled
                                    className="w-full px-4 py-2 bg-slate-100 border-2 border-slate-300 rounded-lg text-slate-600 cursor-not-allowed"
                                />
                            </div>

                            {/* List Name Field */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    List Name <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    value={listFormData.name} 
                                    onChange={e => setListFormData({ ...listFormData, name: e.target.value })} 
                                    required
                                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                                    placeholder="e.g., 2024 Holiday Calendar"
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
                                        value={listFormData.startDate} 
                                        onChange={e => setListFormData({ ...listFormData, startDate: e.target.value })} 
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
                                        value={listFormData.endDate} 
                                        onChange={e => setListFormData({ ...listFormData, endDate: e.target.value })} 
                                        required
                                        className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                                    />
                                </div>
                            </div>

                            {/* Week Offs */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    Week Offs
                                </label>
                                <div className="flex gap-6">
                                    <label className="flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={listFormData.weekOffs.sunday} 
                                            onChange={e => setListFormData({...listFormData, weekOffs: {...listFormData.weekOffs, sunday: e.target.checked}})}
                                            className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                        /> 
                                        <span className="ml-2 text-slate-700 font-medium">Sunday</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={listFormData.weekOffs.saturday} 
                                            onChange={e => setListFormData({...listFormData, weekOffs: {...listFormData.weekOffs, saturday: e.target.checked}})}
                                            className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                        /> 
                                        <span className="ml-2 text-slate-700 font-medium">Saturday</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={listFormData.weekOffs.friday} 
                                            onChange={e => setListFormData({...listFormData, weekOffs: {...listFormData.weekOffs, friday: e.target.checked}})}
                                            className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                        /> 
                                        <span className="ml-2 text-slate-700 font-medium">Friday</span>
                                    </label>
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
                                            name="listStatus" 
                                            value="Active" 
                                            checked={listFormData.status === 'Active'} 
                                            onChange={e => setListFormData({ ...listFormData, status: e.target.value })}
                                            className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span className="ml-2 text-slate-700 font-medium">Active</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="listStatus" 
                                            value="Inactive" 
                                            checked={listFormData.status === 'Inactive'} 
                                            onChange={e => setListFormData({ ...listFormData, status: e.target.value })}
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
                                    onClick={closeListModal} 
                                    className="px-6 py-2 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    {editingList ? 'Update List' : 'Save List'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Holiday Modal */}
            {isHolidayModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-8 py-6 text-white sticky top-0 z-10">
                            <h2 className="text-2xl font-bold">📅 Manage Holidays</h2>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8">
                            {/* Action Bar */}
                            <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 mb-6">
                                <button 
                                    onClick={() => setShowAddHolidayForm(true)} 
                                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    + Add Holiday
                                </button>
                                <button 
                                    onClick={openImportModal} 
                                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    📤 Import Holidays
                                </button>
                            </div>

                            {/* Holidays Table */}
                            <div className="overflow-x-auto mb-6">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800">
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Day</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Description</th>
                                            <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {holidays.length > 0 ? (
                                            holidays.map((h, index) => (
                                                <tr 
                                                    key={h.id}
                                                    className={`border-b border-slate-200 hover:bg-amber-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                                                >
                                                    <td className="px-6 py-4 text-sm text-slate-700">{h.date}</td>
                                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                                        {new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-700">{h.description}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button 
                                                                onClick={() => openEditHolidayModal(h)} 
                                                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteHoliday(h.id)} 
                                                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                                                    No holidays found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Holiday Form */}
                            {(showAddHolidayForm || editingHoliday) && (
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">
                                        {editingHoliday ? '✏️ Edit Holiday' : '➕ Add New Holiday'}
                                    </h3>
                                    <form onSubmit={handleHolidayFormSubmit}>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                    Date <span className="text-red-500">*</span>
                                                </label>
                                                <input 
                                                    type="date" 
                                                    value={holidayFormData.date} 
                                                    onChange={e => setHolidayFormData({...holidayFormData, date: e.target.value})} 
                                                    required
                                                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                    Description <span className="text-red-500">*</span>
                                                </label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Holiday name" 
                                                    value={holidayFormData.description} 
                                                    onChange={e => setHolidayFormData({...holidayFormData, description: e.target.value})} 
                                                    required
                                                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    type="submit" 
                                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                                >
                                                    Save
                                                </button>
                                                {showAddHolidayForm && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setShowAddHolidayForm(false)} 
                                                        className="flex-1 px-4 py-2 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors duration-200"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Close Button */}
                            <div className="flex justify-end">
                                <button 
                                    onClick={closeHolidayModal} 
                                    className="px-6 py-2 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors duration-200"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6 text-white">
                            <h2 className="text-2xl font-bold">📤 Import Holidays</h2>
                        </div>

                        {/* Modal Content */}
                        <form onSubmit={handleFileUpload} className="p-8">
                            <p className="text-sm text-slate-600 mb-4">
                                Please upload an Excel or CSV file with two columns: <strong>Date</strong> and <strong>Description</strong>.
                                <br />The file should not have a header row.
                                <br />Example Date Format: YYYY-MM-DD (e.g., 2024-12-25)
                            </p>

                            {/* File Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Choose File (.xlsx, .xls, .csv) <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                                    required
                                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                                />
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-4">
                                <button 
                                    type="button" 
                                    onClick={() => setIsImportModalOpen(false)} 
                                    className="px-6 py-2 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    Upload
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Progress Modal */}
            {isProgressModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">⏳ Importing Holidays...</h2>
                        
                        {/* Progress Bar */}
                        <div className="mb-6">
                            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                                <div 
                                    className="bg-gradient-to-r from-blue-600 to-blue-700 h-full transition-all duration-300" 
                                    style={{ width: `${importProgress.progress}%` }}
                                ></div>
                            </div>
                            <p className="mt-3 text-center text-sm font-semibold text-blue-600">
                                {importProgress.progress}%
                            </p>
                        </div>

                        {/* Status Message */}
                        <p className="text-center text-slate-600 text-sm">
                            {importProgress.current || 'Processing...'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HolidayListManagement;