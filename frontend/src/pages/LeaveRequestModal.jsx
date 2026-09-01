import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../utils/apiCaller';



const LeaveRequestModal = ({ employeeId, companyId, onClose, onSubmit, editData = null }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);



    // Form Data
    const [formData, setFormData] = useState({
        leaveTypeId: '',
        leaveCategory: 'Full Day',
        halfDayType: '',
        startDate: '',
        endDate: '',
        reason: '',
        contactDuringLeave: '',
        addressDuringLeave: '',
        submitImmediately: false
    });

    // Options
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [leaveAllocations, setLeaveAllocations] = useState([]);
    const [selectedAllocation, setSelectedAllocation] = useState(null);
    const [calculatedDays, setCalculatedDays] = useState(0);

    // Company & Employee select
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || '');
    const [employees, setEmployees] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeId || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Set form data from editData when editing a draft
    useEffect(() => {
        if (editData) {
            setFormData({
                leaveTypeId: editData.leaveTypeId || '',
                leaveCategory: editData.leaveCategory || 'Full Day',
                halfDayType: editData.halfDayType || '',
                startDate: editData.startDate || '',
                endDate: editData.endDate || '',
                reason: editData.reason || '',
                contactDuringLeave: editData.contactDuringLeave || '',
                addressDuringLeave: editData.addressDuringLeave || '',
                submitImmediately: false
            });
            if (editData.companyId) setSelectedCompanyId(editData.companyId);
            if (editData.employeeId) setSelectedEmployeeId(editData.employeeId);
        }
    }, [editData]);

    const selectedEmployee = employees.find(emp => emp.id === parseInt(selectedEmployeeId));
    const filteredEmployees = employees.filter(emp => {
        const searchStr = `${emp.employeeCode} ${emp.firstName}`.toLowerCase();
        return searchStr.includes(searchQuery.toLowerCase());
    });

    // Fetch leave types and allocations
    useEffect(() => {
        if (!selectedCompanyId || !selectedEmployeeId) return;
        fetchLeaveData();
    }, [selectedCompanyId, selectedEmployeeId]);


    // Calculate days when dates change
    useEffect(() => {
        if (formData.startDate && formData.endDate && formData.leaveCategory === 'Full Day') {
            calculateWorkingDays();
        } else if (formData.leaveCategory === 'Half Day') {
            setCalculatedDays(0.5);
        } else if (formData.leaveCategory === 'Short Leave') {
            setCalculatedDays(0.25);
        }
    }, [formData.startDate, formData.endDate, formData.leaveCategory]);

    // Update selected allocation when leave type changes
    useEffect(() => {
        if (formData.leaveTypeId) {
            const allocation = leaveAllocations.find(a => a.leaveTypeId === parseInt(formData.leaveTypeId));
            setSelectedAllocation(allocation);
        }
    }, [formData.leaveTypeId, leaveAllocations]);



    // Fetch companies on mount
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const data = await apiRequest('/companies');
                setCompanies(data);
                if (!selectedCompanyId && data.length > 0) setSelectedCompanyId(data[0].id);
            } catch (err) {
                setError(err.message);
            }
        };
        fetchCompanies();
    }, []);

    // Fetch employees when company changes
    useEffect(() => {
        if (!selectedCompanyId) return;

        const fetchEmployees = async () => {
            setLoading(true);
            try {
                const data = await apiRequest(`/employees?companyId=${selectedCompanyId}`);
                setEmployees(data);
                setSelectedEmployeeId(data.length > 0 ? data[0].id : '');
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, [selectedCompanyId]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const fetchLeaveData = async () => {
        try {
            const typesData = await apiRequest(`/leave-types?companyId=${selectedCompanyId}`);
            setLeaveTypes(typesData.filter(t => t.status === 'Active'));

            // const allocationsData = await apiRequest(`/api/leave-allocations?employeeId=${employeeId}`);
            const allocationsData = await apiRequest(
                `/leave-allocations?companyId=${selectedCompanyId}&employeeId=${selectedEmployeeId}`
            );

            setLeaveAllocations(Array.isArray(allocationsData) ? allocationsData : (allocationsData.leaveAllocations || []));

        } catch (err) {
            setError(err.message);
        }
    };

    const calculateWorkingDays = () => {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        let count = 0;

        while (start <= end) {
            const dayOfWeek = start.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                count++;
            }
            start.setDate(start.getDate() + 1);
        }

        setCalculatedDays(count);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const validateStep1 = () => {
        if (!formData.leaveTypeId) {
            setError('Please select a leave type');
            return false;
        }
        if (!formData.startDate || !formData.endDate) {
            setError('Please select start and end dates');
            return false;
        }
        if (new Date(formData.startDate) > new Date(formData.endDate)) {
            setError('End date must be after start date');
            return false;
        }
        if (formData.leaveCategory === 'Half Day' && !formData.halfDayType) {
            setError('Please select half day type');
            return false;
        }

        if (!selectedAllocation) {
            setError('You have not been assigned/allocated this leave type. Please choose another or contact HR.');
            return false;
        }

        const totalAllocated = parseFloat(selectedAllocation.allocatedLeaves) + parseFloat(selectedAllocation.carryForwardFromPrevious || 0);
        const usedLeaves = parseFloat(selectedAllocation.usedLeaves || 0);
        const available = totalAllocated - usedLeaves;

        if (calculatedDays > available) {
            setError(`Insufficient balance. You have ${available} days available, but requesting ${calculatedDays} days.`);
            return false;
        }

        return true;
    };

    const validateStep2 = () => {
        if (!formData.reason || formData.reason.trim().length === 0) {
            setError('Please provide a reason for leave');
            return false;
        }
        return true;
    };

    const handleNext = () => {
        setError(null);

        if (step === 1 && validateStep1()) {
            setStep(2);
        } else if (step === 2 && validateStep2()) {
            setStep(3);
        }
    };

    const handleBack = () => {
        setError(null);
        setStep(step - 1);
    };

    const handleSubmit = async (asDraft = false) => {
        setError(null);
        setLoading(true);

        try {
            const payload = {
                employeeId: parseInt(selectedEmployeeId),
                companyId: parseInt(selectedCompanyId),
                leaveTypeId: parseInt(formData.leaveTypeId),
                startDate: formData.startDate,
                endDate: formData.endDate,
                leaveCategory: formData.leaveCategory,
                ...(formData.leaveCategory === 'Half Day' && { halfDayType: formData.halfDayType }),
                reason: formData.reason.trim(),
                contactDuringLeave: formData.contactDuringLeave,
                addressDuringLeave: formData.addressDuringLeave,
                submitImmediately: !asDraft
            };
            console.log("Submitting payload:", payload);

            if (editData) {
                // Update the draft
                await apiRequest(`/leave-requests/${editData.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });

                // If submitting, execute the submit draft endpoint
                if (!asDraft) {
                    await apiRequest(`/leave-requests/${editData.id}/submit`, {
                        method: 'POST',
                        body: JSON.stringify({
                            submittedBy: employeeId || selectedEmployeeId
                        })
                    });
                }
            } else {
                // Create a new request
                await apiRequest('/leave-requests', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }

            alert(asDraft ? 'Leave request saved as draft' : 'Leave request submitted successfully');
            onSubmit();

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate available balance for display
    const getAvailableBalance = () => {
        if (!selectedAllocation) return 0;
        const totalAllocated = parseFloat(selectedAllocation.allocatedLeaves) + parseFloat(selectedAllocation.carryForwardFromPrevious || 0);
        const usedLeaves = parseFloat(selectedAllocation.usedLeaves || 0);
        return totalAllocated - usedLeaves;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white sticky top-0 z-10 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">📝 Apply for Leave</h2>
                    <button
                        onClick={onClose}
                        className="text-white text-2xl font-bold hover:bg-blue-800 rounded-lg p-2 transition-colors duration-200"
                    >
                        ×
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mt-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
                        {error}
                    </div>
                )}

                {/* Progress Steps */}
                <div className="px-8 py-6 border-b-2 border-slate-200">
                    <div className="flex items-center justify-between">
                        {[1, 2, 3].map((stepNum, idx) => (
                            <div key={stepNum} className="flex items-center flex-1">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${step >= stepNum
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                                        : 'bg-slate-200 text-slate-600'
                                    }`}>
                                    {step > stepNum ? '✓' : stepNum}
                                </div>
                                <p className={`ml-2 text-xs font-semibold uppercase tracking-wide ${step >= stepNum ? 'text-blue-600' : 'text-slate-500'
                                    }`}>
                                    {stepNum === 1 && 'Leave Details'}
                                    {stepNum === 2 && 'Reason & Contact'}
                                    {stepNum === 3 && 'Review'}
                                </p>
                                {idx < 2 && (
                                    <div className={`flex-1 h-1 mx-2 ${step > stepNum ? 'bg-blue-600' : 'bg-slate-300'
                                        }`}></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-8">
                    {/* Step 1: Leave Details */}

                    {step === 1 && (

                        <div className="space-y-6">
                            {/* Company Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Company <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedCompanyId}
                                    onChange={(e) => {
                                        setSelectedCompanyId(e.target.value);
                                        setSelectedEmployeeId('');
                                        setLeaveAllocations([]);
                                        setSelectedAllocation(null);
                                    }}
                                    required
                                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                                >
                                    <option value="">Select Company</option>
                                    {companies.map(company => (
                                        <option key={company.id} value={company.id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Candidate Selection */}
                            <div className="relative" ref={dropdownRef}>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Candidate <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder={selectedCompanyId ? "Search candidate by name or code..." : "Select company first"}
                                        value={isDropdownOpen ? searchQuery : (selectedEmployee ? `${selectedEmployee.employeeCode} – ${selectedEmployee.firstName}` : "")}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => {
                                            if (selectedCompanyId) {
                                                setIsDropdownOpen(true);
                                                setSearchQuery("");
                                            }
                                        }}
                                        disabled={!selectedCompanyId}
                                        className="w-full px-4 py-2 pr-10 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-700 font-medium"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                        {isDropdownOpen ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        )}
                                    </div>
                                </div>

                                {isDropdownOpen && selectedCompanyId && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {filteredEmployees.length > 0 ? (
                                            filteredEmployees.map(emp => (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => {
                                                        setSelectedEmployeeId(emp.id);
                                                        setSearchQuery("");
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`px-4 py-2.5 cursor-pointer hover:bg-blue-50 text-slate-700 hover:text-blue-900 transition-colors flex items-center justify-between text-sm ${selectedEmployeeId === emp.id ? 'bg-blue-50 font-semibold text-blue-900' : ''
                                                        }`}
                                                >
                                                    <span>{emp.employeeCode} – {emp.firstName}</span>
                                                    {selectedEmployeeId === emp.id && (
                                                        <span className="text-blue-600 font-bold">✓</span>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                                No candidates found matching "{searchQuery}"
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Leave Type */}
                            <div>
                                {leaveAllocations.length === 0 && !loading && (
                                    <div className="p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-800 text-xs font-bold rounded-r mb-4">
                                        ⚠️ You do not have any active leave allocations. Please contact HR to assign leaves before submitting requests.
                                    </div>
                                )}
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Leave Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="leaveTypeId"
                                    value={formData.leaveTypeId}
                                    onChange={handleInputChange}
                                    required
                                    disabled={leaveAllocations.length === 0}
                                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                                >
                                    <option value="">Select Leave Type</option>
                                    {leaveTypes
                                        .filter(type => leaveAllocations.some(alloc => alloc.leaveTypeId === type.id))
                                        .map(type => (
                                            <option key={type.id} value={type.id}>
                                                {type.name} {type.isPaid ? '(Paid)' : '(Unpaid)'}
                                            </option>
                                        ))
                                    }
                                </select>
                                {selectedAllocation && (
                                    <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r">
                                        <p className="text-sm text-blue-700">
                                            Available: <strong className="text-lg">{getAvailableBalance()}</strong> days
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Leave Category */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    Leave Category <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-4">
                                    {['Full Day', 'Half Day', 'Short Leave'].map(category => (
                                        <label key={category} className="flex items-center cursor-pointer">
                                            <input
                                                type="radio"
                                                name="leaveCategory"
                                                value={category}
                                                checked={formData.leaveCategory === category}
                                                onChange={handleInputChange}
                                                className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <span className="ml-2 text-slate-700 font-medium">{category}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        From Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleInputChange}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                        className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        To Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={formData.endDate}
                                        onChange={handleInputChange}
                                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                                        required
                                        className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                                    />
                                </div>
                            </div>

                            {/* Calculated Days */}
                            {calculatedDays > 0 && (
                                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r">
                                    <p className="text-green-700 font-semibold">
                                        Total Days: <span className="text-2xl text-green-600">{calculatedDays}</span>
                                    </p>
                                </div>
                            )}

                            {/* Half Day Type */}
                            {formData.leaveCategory === 'Half Day' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                                        Half Day Type <span className="text-red-500">*</span>
                                    </label>
                                    <div className="space-y-2">
                                        {['First Half', 'Second Half'].map(type => (
                                            <label key={type} className="flex items-center cursor-pointer p-3 border-2 border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
                                                <input
                                                    type="radio"
                                                    name="halfDayType"
                                                    value={type}
                                                    checked={formData.halfDayType === type}
                                                    onChange={handleInputChange}
                                                    className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                                />
                                                <span className="ml-2 text-slate-700 font-medium">
                                                    {type === 'First Half' ? '🌅 First Half (9 AM - 1 PM)' : '🌆 Second Half (2 PM - 6 PM)'}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Reason & Contact */}
                    {step === 2 && (
                        <div className="space-y-6">
                            {/* Reason */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Reason for Leave <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    name="reason"
                                    value={formData.reason}
                                    onChange={handleInputChange}
                                    rows="4"
                                    placeholder="Please provide a reason for your leave..."
                                    required
                                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700 resize-none"
                                ></textarea>
                            </div>

                            {/* Contact */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Contact Number During Leave
                                </label>
                                <input
                                    type="tel"
                                    name="contactDuringLeave"
                                    value={formData.contactDuringLeave}
                                    onChange={handleInputChange}
                                    placeholder="+91-9876543210"
                                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                                />
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Address During Leave
                                </label>
                                <textarea
                                    name="addressDuringLeave"
                                    value={formData.addressDuringLeave}
                                    onChange={handleInputChange}
                                    rows="3"
                                    placeholder="Enter your address where you can be reached..."
                                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700 resize-none"
                                ></textarea>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {step === 3 && (
                        <div className="space-y-6">
                            {/* Leave Details Section */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-3 pb-2 border-b-2 border-blue-200">
                                    Leave Details
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between py-2">
                                        <span className="text-slate-600 font-semibold">Leave Type:</span>
                                        <span className="text-slate-900 font-medium">
                                            {leaveTypes.find(t => t.id === parseInt(formData.leaveTypeId))?.name}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="text-slate-600 font-semibold">Category:</span>
                                        <span className="text-slate-900 font-medium">{formData.leaveCategory}</span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="text-slate-600 font-semibold">Dates:</span>
                                        <span className="text-slate-900 font-medium">
                                            {new Date(formData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(formData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="text-slate-600 font-semibold">Total Days:</span>
                                        <span className="text-green-600 font-bold text-lg">{calculatedDays}</span>
                                    </div>
                                    {formData.halfDayType && (
                                        <div className="flex justify-between py-2">
                                            <span className="text-slate-600 font-semibold">Half Day:</span>
                                            <span className="text-slate-900 font-medium">{formData.halfDayType}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Reason & Contact Section */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-3 pb-2 border-b-2 border-blue-200">
                                    Reason & Contact
                                </h3>
                                <div className="space-y-3">
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Reason</p>
                                        <p className="text-slate-800">{formData.reason}</p>
                                    </div>
                                    {formData.contactDuringLeave && (
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Contact</p>
                                            <p className="text-slate-800">{formData.contactDuringLeave}</p>
                                        </div>
                                    )}
                                    {formData.addressDuringLeave && (
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Address</p>
                                            <p className="text-slate-800">{formData.addressDuringLeave}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Warning */}
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r">
                                <p className="text-amber-700 font-semibold">
                                    ⚠️ Once submitted, your leave request will be sent for approval.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50 px-8 py-4 border-t-2 border-slate-200 sticky bottom-0 flex items-center justify-between gap-4">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            disabled={loading}
                            className="px-6 py-2 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200"
                        >
                            ← Back
                        </button>
                    )}
                    <div className="flex gap-3 ml-auto">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-6 py-2 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200"
                        >
                            Cancel
                        </button>
                        {step < 3 ? (
                            <button
                                onClick={handleNext}
                                disabled={loading || (step === 1 && leaveAllocations.length === 0)}
                                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                            >
                                Next →
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleSubmit(true)}
                                    disabled={loading}
                                    className="px-6 py-2 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200"
                                >
                                    Save as Draft
                                </button>
                                <button
                                    onClick={() => handleSubmit(false)}
                                    disabled={loading}
                                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    {loading ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaveRequestModal;