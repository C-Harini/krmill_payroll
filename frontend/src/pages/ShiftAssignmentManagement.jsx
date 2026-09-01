import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/apiCaller';


const ShiftAssignmentManagement = () => {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [assignments, setAssignments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [shiftTypes, setShiftTypes] = useState([]);
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        employeeId: '',
        shiftTypeId: '',
        status: 'Active'
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAssignments, setSelectedAssignments] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [formData, setFormData] = useState({
        employeeIds: [],
        shiftTypeId: '',
        assignmentType: 'single',
        assignmentDate: '',
        startDate: '',
        endDate: '',
        recurringPattern: 'daily',
        recurringDays: [],
        notes: '',
        overrideExisting: false
    });

    const daysOfWeek = [
        { value: 0, label: 'Sun' },
        { value: 1, label: 'Mon' },
        { value: 2, label: 'Tue' },
        { value: 3, label: 'Wed' },
        { value: 4, label: 'Thu' },
        { value: 5, label: 'Fri' },
        { value: 6, label: 'Sat' }
    ];

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const data = await apiRequest('/companies');
                setCompanies(data);
                if (data.length > 0) {
                    setSelectedCompanyId(data[0].id);
                    const now = new Date();
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    setFilters(prev => ({
                        ...prev,
                        startDate: firstDay.toISOString().split('T')[0],
                        endDate: lastDay.toISOString().split('T')[0]
                    }));
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    useEffect(() => {
        if (!selectedCompanyId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [employeesData, shiftTypesData] = await Promise.all([
                    apiRequest(`/employees?companyId=${selectedCompanyId}`),
                    apiRequest(`/shift-types?companyId=${selectedCompanyId}`)
                ]);
                setEmployees(employeesData.filter(e => e.status === 'Active'));
                setShiftTypes(shiftTypesData.filter(st => st.status === 'Active'));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedCompanyId]);

    useEffect(() => {
        if (!selectedCompanyId) return;
        fetchAssignments();
    }, [selectedCompanyId, filters]);

    const fetchAssignments = async () => {
        if (!selectedCompanyId) return;
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                companyId: selectedCompanyId,
                ...(filters.startDate && { startDate: filters.startDate }),
                ...(filters.endDate && { endDate: filters.endDate }),
                ...(filters.employeeId && { employeeId: filters.employeeId }),
                ...(filters.shiftTypeId && { shiftTypeId: filters.shiftTypeId }),
                ...(filters.status && { status: filters.status })
            });
            const data = await apiRequest(`/shift-assignments?${queryParams}`);
            setAssignments(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCompanyChange = (e) => {
        setSelectedCompanyId(e.target.value);
        setSelectedAssignments([]);
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const openAddModal = () => {
        setEditingAssignment(null);
        setFormData({
            employeeIds: [],
            shiftTypeId: '',
            assignmentType: 'single',
            assignmentDate: new Date().toISOString().split('T')[0],
            startDate: '',
            endDate: '',
            recurringPattern: 'daily',
            recurringDays: [1, 2, 3, 4, 5],
            notes: '',
            overrideExisting: false
        });
        setIsModalOpen(true);
    };

    const openEditModal = (assignment) => {
        setEditingAssignment(assignment);
        setFormData({
            employeeIds: [assignment.employeeId],
            shiftTypeId: assignment.shiftTypeId,
            assignmentType: assignment.isRecurring ? 'recurring' : 'single',
            assignmentDate: assignment.assignmentDate,
            startDate: assignment.startDate || '',
            endDate: assignment.endDate || '',
            recurringPattern: assignment.recurringPattern || 'daily',
            recurringDays: assignment.recurringDays || [],
            notes: assignment.notes || '',
            overrideExisting: false
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingAssignment(null);
        setEmployeeSearchTerm('');
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const payload = {
                companyId: selectedCompanyId,
                employeeIds: formData.employeeIds,
                shiftTypeId: parseInt(formData.shiftTypeId),
                overrideExisting: formData.overrideExisting,
                notes: formData.notes
            };

            if (formData.assignmentType === 'recurring') {
                payload.isRecurring = true;
                payload.startDate = formData.startDate;
                payload.endDate = formData.endDate;
                payload.recurringPattern = formData.recurringPattern;
                if (formData.recurringPattern === 'weekly') {
                    payload.recurringDays = formData.recurringDays;
                }
            } else {
                payload.isRecurring = false;
                payload.assignmentDate = formData.assignmentDate;
            }

            if (editingAssignment) {
                await apiRequest(`/shift-assignments/${editingAssignment.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        shiftTypeId: payload.shiftTypeId,
                        notes: payload.notes
                    })
                });
            } else {
                const result = await apiRequest('/shift-assignments', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                
                if (result.errors && result.errors.length > 0) {
                    const errorMsg = result.errors.map(e => 
                        `Employee ${e.employeeId} on ${e.date}: ${e.message}`
                    ).join('\n');
                    window.alert(`Some assignments failed:\n${errorMsg}`);
                }
            }

            await fetchAssignments();
            closeModal();
        } catch (err) {
            window.alert(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this assignment?')) return;
        try {
            await apiRequest(`/shift-assignments/${id}`, { method: 'DELETE' });
            await fetchAssignments();
        } catch (err) {
            window.alert(err.message);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedAssignments.length === 0) {
            window.alert('Please select assignments to delete');
            return;
        }
        if (!window.confirm(`Delete ${selectedAssignments.length} selected assignment(s)?`)) return;
        
        try {
            await apiRequest('/shift-assignments/bulk-delete', {
                method: 'POST',
                body: JSON.stringify({ assignmentIds: selectedAssignments })
            });
            setSelectedAssignments([]);
            await fetchAssignments();
        } catch (err) {
            window.alert(err.message);
        }
    };

    const toggleAssignmentSelection = (id) => {
        setSelectedAssignments(prev =>
            prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
        );
    };

    const toggleAllAssignments = () => {
        if (selectedAssignments.length === assignments.length) {
            setSelectedAssignments([]);
        } else {
            setSelectedAssignments(assignments.map(a => a.id));
        }
    };

    const getFilteredEmployees = () => {
        if (!employeeSearchTerm.trim()) return employees;
        
        const searchLower = employeeSearchTerm.toLowerCase();
        return employees.filter(emp => 
            formData.employeeIds.includes(emp.id) ||
            `${emp.employeeCode || ''} ${emp.firstName || ''} ${emp.biometricEnrollmentId || ''}`.toLowerCase().includes(searchLower)
        );
    };

    const handleEmployeeSelection = (e) => {
        const options = Array.from(e.target.selectedOptions, option => parseInt(option.value));
        setFormData(prev => ({ ...prev, employeeIds: options }));

        // Auto-fill the search box with selected employees' codes & names
        if (options.length > 0) {
            const selectedEmps = employees.filter(emp => options.includes(emp.id));
            const displayNames = selectedEmps.map(emp => {
                const enrollmentId = emp.biometricEnrollmentId || emp.employeeCode || '';
                const name = emp.firstName || '';
                return enrollmentId ? `${enrollmentId} - ${name}` : name;
            });
            setEmployeeSearchTerm(displayNames.join(', '));
        } else {
            setEmployeeSearchTerm('');
        }
    };

    const toggleRecurringDay = (day) => {
        setFormData(prev => ({
            ...prev,
            recurringDays: prev.recurringDays.includes(day)
                ? prev.recurringDays.filter(d => d !== day)
                : [...prev.recurringDays, day].sort()
        }));
    };

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    const formatTime = (time) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    };

    const selectedCompany = companies.find(c => c.id === selectedCompanyId);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-800">📅 Shift Assignment Management</h1>
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
                        {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </select>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
                        {error}
                    </div>
                )}

                {/* Filters Section */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Filters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Employee</label>
                            <select
                                value={filters.employeeId}
                                onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            >
                                <option value="">All Employees</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.employeeCode} - {emp.firstName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Shift Type</label>
                            <select
                                value={filters.shiftTypeId}
                                onChange={(e) => handleFilterChange('shiftTypeId', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            >
                                <option value="">All Shift Types</option>
                                {shiftTypes.map(st => (
                                    <option key={st.id} value={st.id}>{st.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            >
                                <option value="">All</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Actions Bar */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex gap-3">
                        <button
                            onClick={openAddModal}
                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                            + Add Assignment
                        </button>
                        {selectedAssignments.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors duration-200"
                            >
                                🗑️ Delete Selected ({selectedAssignments.length})
                            </button>
                        )}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
                        Total Assignments: <span className="font-bold text-gray-800">{assignments.length}</span>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold w-12">
                                        <input
                                            type="checkbox"
                                            checked={selectedAssignments.length === assignments.length && assignments.length > 0}
                                            onChange={toggleAllAssignments}
                                            className="w-4 h-4 rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Employee</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Shift Type</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Shift Time</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Recurring</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-8 text-center">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : assignments.length > 0 ? (
                                    assignments.map((assignment, index) => (
                                        <tr key={assignment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAssignments.includes(assignment.id)}
                                                    onChange={() => toggleAssignmentSelection(assignment.id)}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-800">{assignment.id}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-gray-800">{assignment.employee?.employeeCode}</div>
                                                <div className="text-sm text-gray-600">
                                                    {assignment.employee?.firstName} 
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{assignment.shiftType?.name || 'N/A'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{formatDate(assignment.assignmentDate)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {assignment.shiftType ? (
                                                    <>
                                                        {formatTime(assignment.shiftType.startTime)} - {formatTime(assignment.shiftType.endTime)}
                                                    </>
                                                ) : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {assignment.isRecurring ? (
                                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 border border-blue-300 rounded-full text-xs font-semibold">
                                                        {assignment.recurringPattern}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    assignment.status === 'Active'
                                                        ? 'bg-green-100 text-green-700 border border-green-300'
                                                        : assignment.status === 'Inactive'
                                                        ? 'bg-gray-100 text-gray-700 border border-gray-300'
                                                        : 'bg-red-100 text-red-700 border border-red-300'
                                                }`}>
                                                    {assignment.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <button
                                                        onClick={() => openEditModal(assignment)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(assignment.id)}
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
                                        <td colSpan="9" className="px-6 py-8 text-center text-gray-600">
                                            No shift assignments found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white">
                                    {editingAssignment ? 'Edit Shift Assignment' : 'Add Shift Assignment'}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-white hover:bg-blue-800 p-1 rounded-lg transition-colors duration-200"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleFormSubmit} className="p-6">
                                <div className="space-y-6">
                                    {/* Company */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Company</label>
                                        <input
                                            type="text"
                                            value={selectedCompany?.name || ''}
                                            disabled
                                            className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
                                        />
                                    </div>

                                    
                                    {/* Employee Selection */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Select Employee(s) <span className="text-red-600">*</span>
                                            <span className="text-xs text-gray-600 font-normal ml-2">
                                                {editingAssignment ? '(Single selection for edit)' : '(Hold Ctrl/Cmd for multiple)'}
                                            </span>
                                        </label>
                                        
                                        {/* Search Input */}
                                        <div className="mb-3">
                                            <input
                                                type="text"
                                                placeholder="🔍 Search by name or employee code..."
                                                value={employeeSearchTerm}
                                                onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        
                                        {/* Employee List - Increased width and padding */}
                                        <select
                                            multiple={!editingAssignment}
                                            size="8"
                                            value={formData.employeeIds}
                                            onChange={handleEmployeeSelection}
                                            required
                                            disabled={editingAssignment}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white h-auto min-h-48 text-base"
                                        >
                                            {getFilteredEmployees().length > 0 ? (
                                                getFilteredEmployees().map(emp => (
                                                    <option key={emp.id} value={emp.id}>
                                                        {emp.biometricEnrollmentId || ''} - {emp.firstName || ''} 
                                                    </option>
                                                ))
                                            ) : (
                                                <option disabled>No employees available</option>
                                            )}
                                        </select>
                                        
                                        {getFilteredEmployees().length === 0 && employeeSearchTerm && (
                                            <p className="text-sm text-red-500 mt-2">No employees found matching "{employeeSearchTerm}"</p>
                                        )}
                                        
                                        {formData.employeeIds.length > 0 && !editingAssignment && (
                                            <div className="text-sm text-blue-600 font-medium mt-2">
                                                {formData.employeeIds.length} employee(s) selected
                                            </div>
                                        )}
                                    </div>



                                    {/* Shift Type */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Shift Type <span className="text-red-600">*</span>
                                        </label>
                                        <select
                                            value={formData.shiftTypeId}
                                            onChange={(e) => setFormData({ ...formData, shiftTypeId: e.target.value })}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                        >
                                            <option value="">-- Select Shift Type --</option>
                                            {shiftTypes.map(st => (
                                                <option key={st.id} value={st.id}>
                                                    {st.name} ({formatTime(st.startTime)} - {formatTime(st.endTime)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Assignment Type */}
                                    {!editingAssignment && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">Assignment Type</label>
                                            <div className="space-y-2">
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="assignmentType"
                                                        value="single"
                                                        checked={formData.assignmentType === 'single'}
                                                        onChange={(e) => setFormData({ ...formData, assignmentType: e.target.value })}
                                                        className="w-4 h-4 text-blue-600 border-gray-300"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700">Single Date</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="assignmentType"
                                                        value="recurring"
                                                        checked={formData.assignmentType === 'recurring'}
                                                        onChange={(e) => setFormData({ ...formData, assignmentType: e.target.value })}
                                                        className="w-4 h-4 text-blue-600 border-gray-300"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700">Recurring</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Single Date */}
                                    {formData.assignmentType === 'single' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Assignment Date <span className="text-red-600">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.assignmentDate}
                                                onChange={(e) => setFormData({ ...formData, assignmentDate: e.target.value })}
                                                required
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    )}

                                    {/* Recurring Assignment */}
                                    {formData.assignmentType === 'recurring' && (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        Start Date <span className="text-red-600">*</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={formData.startDate}
                                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                                        required
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        End Date <span className="text-red-600">*</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={formData.endDate}
                                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                        required
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                    Recurring Pattern <span className="text-red-600">*</span>
                                                </label>
                                                <div className="space-y-2">
                                                    <label className="flex items-center cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="recurringPattern"
                                                            value="daily"
                                                            checked={formData.recurringPattern === 'daily'}
                                                            onChange={(e) => setFormData({ ...formData, recurringPattern: e.target.value })}
                                                            className="w-4 h-4 text-blue-600 border-gray-300"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">Daily</span>
                                                    </label>
                                                    <label className="flex items-center cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="recurringPattern"
                                                            value="weekly"
                                                            checked={formData.recurringPattern === 'weekly'}
                                                            onChange={(e) => setFormData({ ...formData, recurringPattern: e.target.value })}
                                                            className="w-4 h-4 text-blue-600 border-gray-300"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">Weekly</span>
                                                    </label>
                                                    <label className="flex items-center cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="recurringPattern"
                                                            value="monthly"
                                                            checked={formData.recurringPattern === 'monthly'}
                                                            onChange={(e) => setFormData({ ...formData, recurringPattern: e.target.value })}
                                                            className="w-4 h-4 text-blue-600 border-gray-300"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">Monthly</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Weekly Days */}
                                            {formData.recurringPattern === 'weekly' && (
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                        Select Days <span className="text-red-600">*</span>
                                                    </label>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {daysOfWeek.map(day => (
                                                            <button
                                                                key={day.value}
                                                                type="button"
                                                                onClick={() => toggleRecurringDay(day.value)}
                                                                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 border-2 ${
                                                                    formData.recurringDays.includes(day.value)
                                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                                                }`}
                                                            >
                                                                {day.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Notes */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            rows="3"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                        />
                                    </div>

                                    {/* Override Existing */}
                                    {!editingAssignment && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                            <label className="flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    id="overrideExisting"
                                                    checked={formData.overrideExisting}
                                                    onChange={(e) => setFormData({ ...formData, overrideExisting: e.target.checked })}
                                                    className="w-4 h-4 text-amber-600 border-amber-300 rounded"
                                                />
                                                <span className="ml-3">
                                                    <span className="text-sm font-semibold text-gray-800">Override existing assignments</span>
                                                    <span className="text-xs text-gray-600 block mt-1">Replace conflicting assignments</span>
                                                </span>
                                            </label>
                                        </div>
                                    )}
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
                                        {editingAssignment ? 'Update Assignment' : 'Create Assignment(s)'}
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

export default ShiftAssignmentManagement;