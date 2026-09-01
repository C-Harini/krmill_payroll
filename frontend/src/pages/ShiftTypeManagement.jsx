import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/apiCaller';


const ShiftTypeManagement = () => {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [types, setTypes] = useState([]);
    const [holidayLists, setHolidayLists] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [formData, setFormData] = useState({
        name: '', startTime: '09:00', endTime: '18:00',
        beginCheckInBefore: 15, allowCheckOutAfter: 15,
        enableAutoAttendance: true, requireCheckIn: true, requireCheckOut: true,
        allowMultipleCheckIns: false, autoMarkAbsentIfNoCheckIn: false,
        workingHoursCalculation: 'first_to_last', halfDayHours: 4.00, absentHours: 6.00,
        enableLateEntry: true, lateGracePeriod: 15,
        enableEarlyExit: true, earlyExitPeriod: 15,
        holidayListId: null, markAutoAttendanceOnHolidays: false,
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
        const fetchData = async () => {
            setLoading(true);
            try {
                const [typesData, holidayListsData] = await Promise.all([
                    apiRequest(`/shift-types?companyId=${selectedCompanyId}`),
                    apiRequest(`/holiday-lists?companyId=${selectedCompanyId}`)
                ]);
                setTypes(typesData);
                setHolidayLists(holidayListsData);
            } catch (err) { setError(err.message); } finally { setLoading(false); }
        };
        fetchData();
    }, [selectedCompanyId]);

    const handleCompanyChange = (e) => setSelectedCompanyId(e.target.value);
    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const openAddModal = () => {
        setEditingType(null);
        setFormData({
            name: '', startTime: '09:00', endTime: '18:00',
            beginCheckInBefore: 15, allowCheckOutAfter: 15,
            enableAutoAttendance: true, requireCheckIn: true, requireCheckOut: true,
            allowMultipleCheckIns: false, autoMarkAbsentIfNoCheckIn: false,
            workingHoursCalculation: 'first_to_last', halfDayHours: 4.00, absentHours: 6.00,
            enableLateEntry: true, lateGracePeriod: 15,
            enableEarlyExit: true, earlyExitPeriod: 15,
            holidayListId: null, markAutoAttendanceOnHolidays: false,
            status: 'Active'
        });
        setIsModalOpen(true);
    };

    const openEditModal = (type) => {
        setEditingType(type);
        setFormData({
            name: type.name,
            startTime: type.startTime ? type.startTime.substring(0, 5) : '09:00',
            endTime: type.endTime ? type.endTime.substring(0, 5) : '18:00',
            beginCheckInBefore: type.beginCheckInBefore,
            allowCheckOutAfter: type.allowCheckOutAfter,
            enableAutoAttendance: type.enableAutoAttendance,
            requireCheckIn: type.requireCheckIn,
            requireCheckOut: type.requireCheckOut,
            allowMultipleCheckIns: type.allowMultipleCheckIns,
            autoMarkAbsentIfNoCheckIn: type.autoMarkAbsentIfNoCheckIn,
            workingHoursCalculation: type.workingHoursCalculation,
            halfDayHours: type.halfDayHours,
            absentHours: type.absentHours,
            enableLateEntry: type.enableLateEntry,
            lateGracePeriod: type.lateGracePeriod,
            enableEarlyExit: type.enableEarlyExit,
            earlyExitPeriod: type.earlyExitPeriod,
            holidayListId: type.holidayListId,
            markAutoAttendanceOnHolidays: type.markAutoAttendanceOnHolidays,
            status: type.status
        });
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, companyId: selectedCompanyId };
            
            if (editingType) {
                await apiRequest(`/shift-types/${editingType.id}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                await apiRequest('/shift-types', { method: 'POST', body: JSON.stringify(payload) });
            }
            const data = await apiRequest(`/shift-types?companyId=${selectedCompanyId}`);
            setTypes(data);
            closeModal();
        } catch (err) {
            window.alert(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this shift type?')) return;
        try {
            await apiRequest(`/shift-types/${id}`, { method: 'DELETE' });
            setTypes(types.filter(t => t.id !== id));
        } catch (err) {
            window.alert(err.message);
        }
    };

    const filteredTypes = types.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const selectedCompany = companies.find(c => c.id === selectedCompanyId);

    const formatTime = (time) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-800">🕐 Shift Type Management</h1>
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
                        placeholder="Search Shift Types..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                        onClick={openAddModal}
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
                    >
                        + Add Shift Type
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">ID</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Start Time</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">End Time</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                                    <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredTypes.length > 0 ? (
                                    filteredTypes.map((t, index) => (
                                        <tr key={t.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-800">{t.id}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{t.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{formatTime(t.startTime)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{formatTime(t.endTime)}</td>
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
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(t.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
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
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-600">No shift types found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white">
                                    {editingType ? 'Edit Shift Type' : 'Add New Shift Type'}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-white hover:bg-blue-800 p-1 rounded-lg transition-colors duration-200"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleFormSubmit} className="p-6">
                                <div className="space-y-8">
                                    {/* BASIC INFORMATION */}
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 pb-4 border-b-2 border-gray-200 mb-4">BASIC INFORMATION</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Shift Name <span className="text-red-600">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                                <select
                                                    value={formData.status}
                                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                                >
                                                    <option value="Active">Active</option>
                                                    <option value="Inactive">Inactive</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* TIME CONFIGURATION */}
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 pb-4 border-b-2 border-gray-200 mb-4">TIME CONFIGURATION</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Start Time <span className="text-red-600">*</span>
                                                </label>
                                                <input
                                                    type="time"
                                                    value={formData.startTime}
                                                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    End Time <span className="text-red-600">*</span>
                                                </label>
                                                <input
                                                    type="time"
                                                    value={formData.endTime}
                                                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Begin Check-in Before (min)</label>
                                                <input
                                                    type="number"
                                                    value={formData.beginCheckInBefore}
                                                    onChange={e => setFormData({ ...formData, beginCheckInBefore: parseInt(e.target.value) })}
                                                    min="0"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Allow Check-out After (min)</label>
                                                <input
                                                    type="number"
                                                    value={formData.allowCheckOutAfter}
                                                    onChange={e => setFormData({ ...formData, allowCheckOutAfter: parseInt(e.target.value) })}
                                                    min="0"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ATTENDANCE RULES */}
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 pb-4 border-b-2 border-gray-200 mb-4">ATTENDANCE RULES</h3>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.enableAutoAttendance}
                                                        onChange={e => setFormData({ ...formData, enableAutoAttendance: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700">Enable Auto Attendance</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.requireCheckIn}
                                                        onChange={e => setFormData({ ...formData, requireCheckIn: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700">Require Check-in</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.requireCheckOut}
                                                        onChange={e => setFormData({ ...formData, requireCheckOut: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700">Require Check-out</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.allowMultipleCheckIns}
                                                        onChange={e => setFormData({ ...formData, allowMultipleCheckIns: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700">Allow Multiple Check-ins</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.autoMarkAbsentIfNoCheckIn}
                                                        onChange={e => setFormData({ ...formData, autoMarkAbsentIfNoCheckIn: e.target.checked })}
                                                        disabled={!formData.requireCheckIn}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                    <span className={`ml-2 text-sm ${formData.requireCheckIn ? 'text-gray-700' : 'text-gray-400'}`}>
                                                        Auto-mark Absent if No Check-in
                                                    </span>
                                                </label>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-3">Working Hours Calculation</label>
                                                <div className="space-y-2">
                                                    <label className="flex items-center cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="workingHours"
                                                            value="first_to_last"
                                                            checked={formData.workingHoursCalculation === 'first_to_last'}
                                                            onChange={e => setFormData({ ...formData, workingHoursCalculation: e.target.value })}
                                                            className="w-4 h-4 text-blue-600 border-gray-300"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">First Check-in to Last Check-out</span>
                                                    </label>
                                                    <label className="flex items-center cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="workingHours"
                                                            value="fixed_hours"
                                                            checked={formData.workingHoursCalculation === 'fixed_hours'}
                                                            onChange={e => setFormData({ ...formData, workingHoursCalculation: e.target.value })}
                                                            className="w-4 h-4 text-blue-600 border-gray-300"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">Fixed Hours</span>
                                                    </label>
                                                    <label className="flex items-center cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="workingHours"
                                                            value="with_breaks"
                                                            checked={formData.workingHoursCalculation === 'with_breaks'}
                                                            onChange={e => setFormData({ ...formData, workingHoursCalculation: e.target.value })}
                                                            className="w-4 h-4 text-blue-600 border-gray-300"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">Check-in to Check-out (with breaks)</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* THRESHOLDS */}
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 pb-4 border-b-2 border-gray-200 mb-4">THRESHOLDS</h3>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Working Hours for Half Day</label>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        value={formData.halfDayHours}
                                                        onChange={e => setFormData({ ...formData, halfDayHours: parseFloat(e.target.value) })}
                                                        min="0"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Working Hours for Absent</label>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        value={formData.absentHours}
                                                        onChange={e => setFormData({ ...formData, absentHours: parseFloat(e.target.value) })}
                                                        min="0"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="flex items-center cursor-pointer mb-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.enableLateEntry}
                                                            onChange={e => setFormData({ ...formData, enableLateEntry: e.target.checked })}
                                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        />
                                                        <span className="ml-2 text-sm font-semibold text-gray-700">Enable Late Entry</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={formData.lateGracePeriod}
                                                        onChange={e => setFormData({ ...formData, lateGracePeriod: parseInt(e.target.value) })}
                                                        min="0"
                                                        disabled={!formData.enableLateEntry}
                                                        placeholder="Late Grace Period (minutes)"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="flex items-center cursor-pointer mb-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.enableEarlyExit}
                                                            onChange={e => setFormData({ ...formData, enableEarlyExit: e.target.checked })}
                                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        />
                                                        <span className="ml-2 text-sm font-semibold text-gray-700">Enable Early Exit</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={formData.earlyExitPeriod}
                                                        onChange={e => setFormData({ ...formData, earlyExitPeriod: parseInt(e.target.value) })}
                                                        min="0"
                                                        disabled={!formData.enableEarlyExit}
                                                        placeholder="Early Exit Period (minutes)"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* HOLIDAY CONFIGURATION */}
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 pb-4 border-b-2 border-gray-200 mb-4">HOLIDAY CONFIGURATION</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Holiday List</label>
                                                <select
                                                    value={formData.holidayListId || ''}
                                                    onChange={e => setFormData({ ...formData, holidayListId: e.target.value ? parseInt(e.target.value) : null })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                                >
                                                    <option value="">-- Select Holiday List --</option>
                                                    {holidayLists.map(hl => <option key={hl.id} value={hl.id}>{hl.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex items-end">
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.markAutoAttendanceOnHolidays}
                                                        onChange={e => setFormData({ ...formData, markAutoAttendanceOnHolidays: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700">Mark Auto Attendance on Holidays</span>
                                                </label>
                                            </div>
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
                                        {editingType ? 'Update Shift Type' : 'Save Shift Type'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShiftTypeManagement;