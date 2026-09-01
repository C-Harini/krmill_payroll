import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../utils/apiCaller';

const LeaveAllocationModal = ({ allocation, companyId, companyName, defaultPeriodId, masterData, onClose, onSave }) => {
    // Multi-select state
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [showDeptDropdown, setShowDeptDropdown] = useState(false);
    const [showEmpDropdown, setShowEmpDropdown] = useState(false);
    
    // Bulk allocation mode
    const [bulkMode, setBulkMode] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        leavePeriodId: defaultPeriodId || '',
        leaveTypeId: '',
        allocatedLeaves: 12,
        effectiveFrom: '',
        effectiveTo: '',
        applyCarryForward: true,
        applyProRating: true,
        allowNegativeBalance: false,
        maxNegativeLimit: 0,
        enableMonthlyAccrual: false,
        monthlyAccrualRate: 1,
        accrualCondition: 'first_year',
        maxCarryForwardLimit: null,
        carryForwardExpiryDate: '',
        notifyEmployee: true,
        notifyManager: false,
        notes: ''
    });

    const [leaveTypeDetails, setLeaveTypeDetails] = useState(null);
    const [allocationSummary, setAllocationSummary] = useState([]);
    
    const deptDropdownRef = useRef(null);
    const empDropdownRef = useRef(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target)) {
                setShowDeptDropdown(false);
            }
            if (empDropdownRef.current && !empDropdownRef.current.contains(event.target)) {
                setShowEmpDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter employees by selected departments
    const filteredEmployees = masterData?.employees?.filter(emp => {
        if (selectedDepartments.length === 0) return false;
        return selectedDepartments.includes(emp.departmentId);
    }) || [];

    // Handle department selection
    const handleDepartmentToggle = (deptId) => {
        setSelectedDepartments(prev => {
            if (prev.includes(deptId)) {
                const newDepts = prev.filter(id => id !== deptId);
                const empIdsToRemove = (masterData?.employees || [])
                    .filter(emp => emp.departmentId === deptId)
                    .map(emp => emp.id);
                setSelectedEmployees(prevEmp => prevEmp.filter(id => !empIdsToRemove.includes(id)));
                return newDepts;
            } else {
                return [...prev, deptId];
            }
        });
    };

    const handleSelectAllDepartments = () => {
        const departments = masterData?.departments || [];
        if (selectedDepartments.length === departments.length) {
            setSelectedDepartments([]);
            setSelectedEmployees([]);
        } else {
            setSelectedDepartments(departments.map(d => d.id));
        }
    };

    // Handle employee selection
    const handleEmployeeToggle = (empId) => {
        setSelectedEmployees(prev => 
            prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
        );
    };

    const handleSelectAllEmployees = () => {
        if (selectedEmployees.length === filteredEmployees.length) {
            setSelectedEmployees([]);
        } else {
            setSelectedEmployees(filteredEmployees.map(e => e.id));
        }
    };

    // Bulk select all employees from selected departments
    const handleBulkSelectAll = () => {
        if (selectedDepartments.length === 0) {
            alert('Please select at least one department first');
            return;
        }
        setSelectedEmployees(filteredEmployees.map(e => e.id));
        setBulkMode(true);
    };

    // Handle form changes
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Fetch leave type details when selected
    useEffect(() => {
        if (formData.leaveTypeId && masterData?.leaveTypes) {
            const leaveType = masterData.leaveTypes.find(lt => lt.id === parseInt(formData.leaveTypeId));
            setLeaveTypeDetails(leaveType);
        } else {
            setLeaveTypeDetails(null);
        }
    }, [formData.leaveTypeId, masterData]);

    // Calculate allocation summary with carry forward
    useEffect(() => {
        if (selectedEmployees.length > 0 && formData.allocatedLeaves && formData.leavePeriodId && masterData?.employees && masterData?.leavePeriods && masterData?.departments) {
            const summary = selectedEmployees.map(empId => {
                const employee = masterData.employees.find(e => e.id === empId);
                let allocated = parseFloat(formData.allocatedLeaves);
                let isProRated = false;
                let carryForward = 0;
                
                if (formData.applyProRating && employee) {
                    const period = masterData.leavePeriods.find(p => p.id === parseInt(formData.leavePeriodId));
                    if (period && employee.dateOfJoining) {
                        const joiningDate = new Date(employee.dateOfJoining);
                        const periodStart = new Date(period.startDate);
                        
                        if (joiningDate > periodStart) {
                            isProRated = true;
                            const periodEnd = new Date(period.endDate);
                            const totalDays = (periodEnd - periodStart) / (1000 * 60 * 60 * 24);
                            const remainingDays = (periodEnd - joiningDate) / (1000 * 60 * 60 * 24);
                            allocated = (formData.allocatedLeaves / totalDays) * remainingDays;
                            allocated = Math.round(allocated * 2) / 2;
                        }
                    }
                }

                if (formData.applyCarryForward && leaveTypeDetails?.isCarryForwardEnabled) {
                    carryForward = 0;
                }

                return {
                    employeeId: empId,
                    employeeCode: employee?.employeeCode,
                    employeeName: employee?.firstName || '',
                    department: masterData.departments.find(d => d.id === employee?.departmentId)?.name || 'N/A',
                    allocated: allocated,
                    carryForward: carryForward,
                    total: allocated + carryForward,
                    isProRated
                };
            });
            setAllocationSummary(summary);
        } else {
            setAllocationSummary([]);
        }
    }, [selectedEmployees, formData.allocatedLeaves, formData.applyProRating, formData.applyCarryForward, formData.leavePeriodId, leaveTypeDetails, masterData]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (selectedEmployees.length === 0) {
            alert('Please select at least one employee');
            return;
        }

        if (!formData.leaveTypeId) {
            alert('Please select a leave type');
            return;
        }

        if (!formData.leavePeriodId) {
            alert('Please select a leave period');
            return;
        }

        if (selectedDepartments.length === 0) {
            alert('Please select at least one department');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            
            const payload = {
                employees: selectedEmployees,
                companyId: companyId,
                ...formData,
                carryForwardExpiryDate: formData.carryForwardExpiryDate || null,
                maxCarryForwardLimit: formData.maxCarryForwardLimit || null,
                allocatedLeaves: parseFloat(formData.allocatedLeaves),
                maxNegativeLimit: formData.maxNegativeLimit ? parseFloat(formData.maxNegativeLimit) : 0,
                monthlyAccrualRate: formData.monthlyAccrualRate ? parseFloat(formData.monthlyAccrualRate) : null
            };

            const result = await apiRequest('/leave-allocations', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            if (result.results.failed.length > 0) {
                const failedMsg = result.results.failed
                    .map(f => `${f.employeeCode || f.employeeId}: ${f.error}`)
                    .join('\n');
                alert(`Allocation completed with some errors:\n\nSuccessful: ${result.results.success.length}\nFailed: ${result.results.failed.length}\n\nErrors:\n${failedMsg}`);
            } else {
                alert(`✅ Successfully allocated leaves to ${result.results.success.length} employee(s)!`);
            }

            if (onSave) {
                await onSave();
            }
            
            onClose();

        } catch (err) {
            console.error('Allocation error:', err);
            alert('Error: ' + err.message);
        }
    };

    const getDepartmentLabel = () => {
        const departments = masterData?.departments || [];
        if (selectedDepartments.length === 0) return 'Select Departments';
        if (selectedDepartments.length === departments.length) return 'All Departments';
        return `${selectedDepartments.length} department(s) selected`;
    };

    const getEmployeeLabel = () => {
        if (selectedEmployees.length === 0) return 'Select Employees (Select department first)';
        if (selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0) 
            return `All Employees (${filteredEmployees.length})`;
        return `${selectedEmployees.length} employee(s) selected`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col shadow-xl">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white px-8 py-6 rounded-t-lg">
                    <h2 className="text-2xl font-bold m-0">🏖️ {bulkMode ? 'Bulk' : 'Add'} Leave Allocation</h2>
                    <p className="text-sm opacity-90 m-0 mt-1">{companyName} - Allocate leaves to employees</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-8">
                        
                        {/* Quick Tip */}
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-8 flex justify-between items-center">
                            <div>
                                <strong>💡 Quick Tip:</strong> Select departments first, then choose employees
                            </div>
                            <button
                                type="button"
                                onClick={handleBulkSelectAll}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded transition duration-200"
                            >
                                🚀 Bulk Select All Employees
                            </button>
                        </div>

                        {/* STEP 1: SELECT EMPLOYEES */}
                        <div className="border-b-2 border-gray-300 pb-3 mb-6">
                            <h3 className="text-base font-bold text-blue-600 m-0">STEP 1: SELECT DEPARTMENTS & EMPLOYEES</h3>
                        </div>

                        <div className="space-y-6 mb-8">
                            {/* Department Multi-Select */}
                            <div ref={deptDropdownRef} className="relative">
                                <label className="block mb-2 font-bold text-gray-700">
                                    Select Department(s) * 
                                    <span className="text-xs font-normal text-gray-600 ml-2">
                                        (Employees will be filtered based on departments)
                                    </span>
                                </label>
                                <div 
                                    onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                                    className="px-3 py-2 border-2 border-blue-600 rounded-lg cursor-pointer bg-white flex justify-between items-center hover:bg-gray-50 transition"
                                >
                                    <span>{getDepartmentLabel()}</span>
                                    <span className="text-xs text-gray-600">
                                        {selectedDepartments.length > 0 && `(${selectedDepartments.length}/${masterData?.departments?.length || 0})`}
                                    </span>
                                </div>
                                {showDeptDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                                        <div className="p-3 border-b border-gray-200 bg-gray-100">
                                            <label className="flex items-center gap-2 cursor-pointer font-bold">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDepartments.length === (masterData?.departments || []).length && (masterData?.departments || []).length > 0}
                                                    onChange={handleSelectAllDepartments}
                                                    className="w-4 h-4 accent-blue-600"
                                                />
                                                Select All Departments
                                            </label>
                                        </div>
                                        {(masterData?.departments || []).map(dept => {
                                            const empCount = (masterData?.employees || []).filter(e => e.departmentId === dept.id).length;
                                            return (
                                                <div key={dept.id} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedDepartments.includes(dept.id)}
                                                            onChange={() => handleDepartmentToggle(dept.id)}
                                                            className="w-4 h-4 accent-blue-600"
                                                        />
                                                        <span>{dept.departmentname}</span>
                                                        <span className="ml-auto text-xs text-gray-600">
                                                            ({empCount} employees)
                                                        </span>
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Employee Multi-Select */}
                            <div ref={empDropdownRef} className="relative">
                                <label className="block mb-2 font-bold text-gray-700">
                                    Select Employee(s) *
                                    <span className="text-xs font-normal text-gray-600 ml-2">
                                        (Showing employees from selected departments only)
                                    </span>
                                </label>
                                <div 
                                    onClick={() => selectedDepartments.length > 0 && setShowEmpDropdown(!showEmpDropdown)}
                                    className={`px-3 py-2 rounded-lg flex justify-between items-center transition ${
                                        selectedDepartments.length === 0 
                                            ? 'border border-gray-300 bg-gray-100 cursor-not-allowed opacity-60' 
                                            : 'border-2 border-blue-600 bg-white cursor-pointer hover:bg-gray-50'
                                    }`}
                                >
                                    <span>{getEmployeeLabel()}</span>
                                    <span className="text-xs text-gray-600">
                                        {selectedEmployees.length > 0 && `(${selectedEmployees.length}/${filteredEmployees.length})`}
                                    </span>
                                </div>
                                {showEmpDropdown && selectedDepartments.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                                        <div className="p-3 border-b border-gray-200 bg-gray-100">
                                            <label className="flex items-center gap-2 cursor-pointer font-bold">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                                                    onChange={handleSelectAllEmployees}
                                                    className="w-4 h-4 accent-blue-600"
                                                />
                                                Select All Employees {filteredEmployees.length > 0 && `(${filteredEmployees.length} from selected departments)`}
                                            </label>
                                        </div>
                                        {filteredEmployees.length > 0 ? (
                                            filteredEmployees.map(emp => {
                                                const dept = (masterData?.departments || []).find(d => d.id === emp.departmentId);
                                                return (
                                                    <div key={emp.id} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedEmployees.includes(emp.id)}
                                                                onChange={() => handleEmployeeToggle(emp.id)}
                                                                className="w-4 h-4 accent-blue-600"
                                                            />
                                                            <span className="flex-1">
                                                                {emp.employeeCode} - {emp.firstName}
                                                            </span>
                                                            <span className="text-xs text-gray-700 bg-blue-100 px-2 py-1 rounded">
                                                                {dept?.name || 'N/A'}
                                                            </span>
                                                        </label>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-8 text-center text-gray-600">
                                                No employees found in selected departments
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Selection Summary */}
                            <div className={`p-4 rounded border-2 ${
                                selectedEmployees.length > 0 
                                    ? 'bg-green-50 border-green-500' 
                                    : 'bg-amber-50 border-amber-500'
                            }`}>
                                <strong>
                                    {selectedEmployees.length > 0 
                                        ? `✅ ${selectedEmployees.length} employee(s) selected from ${selectedDepartments.length} department(s)`
                                        : '⚠️ Please select departments and employees to proceed'
                                    }
                                </strong>
                            </div>
                        </div>

                        {/* STEP 2: LEAVE PERIOD & TYPE */}
                        <div className="border-b-2 border-gray-300 pb-3 mb-6">
                            <h3 className="text-base font-bold text-blue-600 m-0">STEP 2: LEAVE PERIOD & TYPE</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div>
                                <label className="block mb-2 font-bold text-gray-700">Leave Period *</label>
                                <select 
                                    name="leavePeriodId" 
                                    value={formData.leavePeriodId} 
                                    onChange={handleInputChange} 
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Select Period --</option>
                                    {(masterData?.leavePeriods || []).map(period => (
                                        <option key={period.id} value={period.id}>{period.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block mb-2 font-bold text-gray-700">Leave Type *</label>
                                <select 
                                    name="leaveTypeId" 
                                    value={formData.leaveTypeId} 
                                    onChange={handleInputChange} 
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Select Leave Type --</option>
                                    {(masterData?.leaveTypes || []).map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                            </div>

                            {leaveTypeDetails && (
                                <div className="col-span-2 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                                    <strong>ℹ️ Leave Type Details:</strong>
                                    <ul className="m-0 mt-2 ml-5 space-y-1 text-sm">
                                        <li>Carry Forward Enabled: <strong>{leaveTypeDetails.isCarryForwardEnabled ? '✅ Yes (will add previous balance automatically)' : '❌ No'}</strong></li>
                                        <li>Negative Balance: {formData.allowNegativeBalance ? '✅ Allowed' : '❌ Not Allowed'}</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* STEP 3: ALLOCATION DETAILS */}
                        <div className="border-b-2 border-gray-300 pb-3 mb-6">
                            <h3 className="text-base font-bold text-blue-600 m-0">STEP 3: ALLOCATION DETAILS</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div>
                                <label className="block mb-2 font-bold text-gray-700">
                                    Allocated Leaves per Employee *
                                </label>
                                <input 
                                    type="number" 
                                    name="allocatedLeaves" 
                                    value={formData.allocatedLeaves} 
                                    onChange={handleInputChange}
                                    min="0"
                                    step="0.5"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="applyCarryForward"
                                        checked={formData.applyCarryForward}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 accent-blue-600"
                                    />
                                    <span className="text-sm">📊 Auto-calculate carry forward from previous period</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="applyProRating"
                                        checked={formData.applyProRating}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 accent-blue-600"
                                    />
                                    <span className="text-sm">📅 Pro-rate for mid-year joiners</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="allowNegativeBalance"
                                        checked={formData.allowNegativeBalance}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 accent-blue-600"
                                    />
                                    <span className="text-sm">➖ Allow negative balance (advance leave)</span>
                                </label>
                            </div>
                        </div>

                        {/* CARRY FORWARD INFO */}
                        {formData.applyCarryForward && leaveTypeDetails?.isCarryForwardEnabled && (
                            <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500 mb-8">
                                <strong>📌 Carry Forward Information:</strong>
                                <p className="text-sm m-0 mt-2">
                                    The system will automatically add any unused leave balance from the previous period 
                                    to the allocated leaves. The total available will be: <strong>Allocated + Carry Forward</strong>
                                </p>
                            </div>
                        )}

                        {/* ALLOCATION SUMMARY */}
                        {allocationSummary.length > 0 && (
                            <>
                                <div className="border-b-2 border-gray-300 pb-3 mb-6">
                                    <h3 className="text-base font-bold text-blue-600 m-0">📋 ALLOCATION PREVIEW</h3>
                                </div>

                                <div className="border border-gray-300 rounded-lg overflow-hidden mb-6 max-h-80 overflow-y-auto">
                                    <table className="w-full text-sm border-collapse">
                                        <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white sticky top-0">
                                            <tr>
                                                <th className="p-3 text-left">Employee Code</th>
                                                <th className="p-3 text-left">Name</th>
                                                <th className="p-3 text-left">Department</th>
                                                <th className="p-3 text-right">Allocated</th>
                                                <th className="p-3 text-right">Carry Forward</th>
                                                <th className="p-3 text-right">Total</th>
                                                <th className="p-3 text-center">Pro-rated?</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allocationSummary.map((summary, idx) => (
                                                <tr key={summary.employeeId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                    <td className="p-3">
                                                        <strong>{summary.employeeCode}</strong>
                                                    </td>
                                                    <td className="p-3">
                                                        {summary.employeeName}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="bg-blue-100 px-2 py-1 rounded text-xs">
                                                            {summary.department}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <strong>{summary.allocated.toFixed(1)}</strong> days
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        {summary.carryForward > 0 ? (
                                                            <span className="text-green-700 font-bold">
                                                                +{summary.carryForward} days
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-600">Will be calculated</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <strong className="text-blue-600 text-base">
                                                            {summary.total.toFixed(1)} days
                                                        </strong>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {summary.isProRated ? (
                                                            <span className="text-amber-700 font-bold bg-amber-50 px-2 py-1 rounded text-xs">
                                                                ✓ Yes
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-600">No</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="grid grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg mb-8">
                                    <div>
                                        <div className="text-xs text-gray-600">Total Employees</div>
                                        <div className="text-2xl font-bold text-blue-600">
                                            {allocationSummary.length}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-600">Total Allocated Leaves</div>
                                        <div className="text-2xl font-bold text-green-700">
                                            {allocationSummary.reduce((sum, s) => sum + s.allocated, 0).toFixed(1)} days
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-600">Pro-rated Employees</div>
                                        <div className="text-2xl font-bold text-amber-700">
                                            {allocationSummary.filter(s => s.isProRated).length}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* NOTIFICATIONS */}
                        <div className="border-b-2 border-gray-300 pb-3 mb-6 mt-8">
                            <h3 className="text-base font-bold text-blue-600 m-0">📧 NOTIFICATIONS</h3>
                        </div>

                        <div className="space-y-3 mb-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="notifyEmployee"
                                    checked={formData.notifyEmployee}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 accent-blue-600"
                                />
                                <span className="text-sm">Send email notification to employees</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="notifyManager"
                                    checked={formData.notifyManager}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 accent-blue-600"
                                />
                                <span className="text-sm">Send notification to reporting managers</span>
                            </label>
                        </div>

                        {/* NOTES */}
                        <div>
                            <label className="block mb-2 font-bold text-gray-700">
                                Notes/Remarks (Optional)
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows="3"
                                placeholder="Any additional notes or comments..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-inherit focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-between items-center gap-4 p-6 border-t border-gray-300 bg-gray-100">
                        <div className="text-sm text-gray-700">
                            {selectedEmployees.length > 0 && (
                                <span>
                                    Ready to allocate leaves to <strong>{selectedEmployees.length}</strong> employee(s)
                                </span>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <button 
                                type="button" 
                                onClick={onClose}
                                className="px-6 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-bold hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={selectedEmployees.length === 0}
                                className={`px-6 py-2 rounded-lg text-white font-bold transition ${
                                    selectedEmployees.length === 0
                                        ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                        : 'bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800'
                                }`}
                            >
                                💾 Save Allocation
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LeaveAllocationModal;