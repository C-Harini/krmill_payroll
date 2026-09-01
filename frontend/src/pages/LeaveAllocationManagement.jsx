import React, { useState, useEffect } from 'react';
import LeaveAllocationModal from './LeaveAllocationModal';
import BulkLeaveAllocationModal from './BulkLeaveAllocationModal';
import { apiRequest } from '../utils/apiCaller';


const LeaveAllocationManagement = () => {
    // State Management
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [leavePeriods, setLeavePeriods] = useState([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [departments, setDepartments] = useState([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    const [allocations, setAllocations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAllocation, setEditingAllocation] = useState(null);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    // Master data for modal
    const [masterData, setMasterData] = useState({
        departments: [],
        employees: [],
        leaveTypes: [],
        leavePeriods: []
    });

    // Fetch companies on mount
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const data = await apiRequest('/companies');
                setCompanies(data);
                if (data.length > 0) setSelectedCompanyId(data[0].id);
            } catch (err) { 
                setError(err.message); 
            } finally { 
                setLoading(false); 
            }
        };
        fetchCompanies();
    }, []);

    // Fetch company-specific data
    useEffect(() => {
        if (!selectedCompanyId) return;
        
        const fetchData = async () => {
            setLoading(true);
            try {
                const [periodsData, deptData] = await Promise.all([
                    apiRequest(`/leave-periods?companyId=${selectedCompanyId}`),
                    apiRequest(`/departments?companyId=${selectedCompanyId}`)
                ]);
                
                setLeavePeriods(periodsData);
                setDepartments(deptData?.data || []);
                
                if (periodsData.length > 0 && !selectedPeriodId) {
                    setSelectedPeriodId(periodsData[0].id);
                }
            } catch (err) { 
                setError(err.message);
            } finally { 
                setLoading(false); 
            }
        };
        
        fetchData();
    }, [selectedCompanyId]);

    // Fetch allocations
    useEffect(() => {
        if (!selectedCompanyId || !selectedPeriodId) return;
        
        const fetchAllocations = async () => {
            setLoading(true);
            try {
                let url = `/leave-allocations?companyId=${selectedCompanyId}&leavePeriodId=${selectedPeriodId}`;
                if (selectedDepartmentId) {
                    url += `&departmentId=${selectedDepartmentId}`;
                }
                
                console.log('Fetching allocations from:', url);
                const data = await apiRequest(url);
                console.log('Allocations received:', data);
                setAllocations(data);
            } catch (err) { 
                console.error('Error fetching allocations:', err);
                setError(err.message);
            } finally { 
                setLoading(false); 
            }
        };
        
        fetchAllocations();
    }, [selectedCompanyId, selectedPeriodId, selectedDepartmentId]);

    // Event Handlers
    const handleCompanyChange = (e) => {
        setSelectedCompanyId(e.target.value);
        setSelectedPeriodId('');
        setSelectedDepartmentId('');
    };

    const handlePeriodChange = (e) => setSelectedPeriodId(e.target.value);
    const handleDepartmentChange = (e) => setSelectedDepartmentId(e.target.value);
    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const openAddModal = async () => {
        try {
            const [employeesData, leaveTypesData, periodsData, deptData] = await Promise.all([
                apiRequest(`/employees?companyId=${selectedCompanyId}`),
                apiRequest(`/leave-types?companyId=${selectedCompanyId}`),
                apiRequest(`/leave-periods?companyId=${selectedCompanyId}`),
                apiRequest(`/departments?companyId=${selectedCompanyId}`)
            ]);

            setMasterData({
                departments: deptData?.data || [],
                employees: employeesData,
                leaveTypes: leaveTypesData,
                leavePeriods: periodsData
            });

            setEditingAllocation(null);
            setIsModalOpen(true);
        } catch (err) {
            window.alert('Error loading data: ' + err.message);
        }
    };

    const openEditModal = async (allocation) => {
        try {
            const fullAllocation = await apiRequest(`/leave-allocations/${allocation.id}`);
            setEditingAllocation(fullAllocation);
            setIsModalOpen(true);
        } catch (err) {
            window.alert('Error loading allocation: ' + err.message);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingAllocation(null);
    };
   
    const openBulkModal = async () => {
        try {
            const [employeesData, leaveTypesData, periodsData, deptData] = await Promise.all([
                apiRequest(`/employees?companyId=${selectedCompanyId}`),
                apiRequest(`/leave-types?companyId=${selectedCompanyId}`),
                apiRequest(`/leave-periods?companyId=${selectedCompanyId}`),
                apiRequest(`/departments?companyId=${selectedCompanyId}`)
            ]);

            console.log('=== BULK MODAL MASTER DATA LOADED ===');
            console.log('Leave Types fetched:', leaveTypesData?.length || 0, leaveTypesData);
            console.log('Leave Periods fetched:', periodsData?.length || 0, periodsData);
            console.log('Employees fetched:', employeesData?.length || 0);
            console.log('Departments fetched:', deptData?.length || 0);

            setMasterData({
                departments: deptData?.data || [],
                employees: employeesData,
                leaveTypes: leaveTypesData,
                leavePeriods: periodsData
            });

            setIsBulkModalOpen(true);
        } catch (err) {
            console.error('Error loading bulk modal data:', err);
            window.alert('Error loading data for bulk upload: ' + err.message);
        }
    };

    const handleAllocationSaved = async () => {
        try {
            setLoading(true);
            let url = `/leave-allocations?companyId=${selectedCompanyId}&leavePeriodId=${selectedPeriodId}`;
            if (selectedDepartmentId) url += `&departmentId=${selectedDepartmentId}`;
            
            const data = await apiRequest(url);
            setAllocations(data);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this allocation?')) return;
        
        try {
            await apiRequest(`/leave-allocations/${id}`, { method: 'DELETE' });
            setAllocations(allocations.filter(a => a.id !== id));
        } catch (err) {
            window.alert('Error deleting allocation: ' + err.message);
        }
    };

    // Filter allocations
    const filteredAllocations = allocations.filter(a => {
        const employeeName = (a.employee?.firstName || '').toLowerCase();
        const employeeCode = a.employee?.employeeCode?.toLowerCase() || '';
        return employeeName.includes(searchTerm.toLowerCase()) || 
               employeeCode.includes(searchTerm.toLowerCase());
    });

    // Group allocations by employee
    const groupedAllocations = filteredAllocations.reduce((acc, alloc) => {
        const empId = alloc.employeeId;
        if (!acc[empId]) {
            acc[empId] = {
                employee: alloc.employee,
                allocations: []
            };
        }
        acc[empId].allocations.push(alloc);
        return acc;
    }, {});

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
                        <span>🏖️</span> Leave Allocation Management
                    </h1>
                </div>

                {/* Filter Section */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="company-select" className="block text-sm font-semibold text-slate-700 mb-2">
                                Company
                            </label>
                            <select 
                                id="company-select" 
                                value={selectedCompanyId} 
                                onChange={handleCompanyChange}
                                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                            >
                                <option value="">-- Select Company --</option>
                                {companies.map(company => (
                                    <option key={company.id} value={company.id}>{company.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="period-select" className="block text-sm font-semibold text-slate-700 mb-2">
                                Leave Period
                            </label>
                            <select 
                                id="period-select" 
                                value={selectedPeriodId} 
                                onChange={handlePeriodChange}
                                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                            >
                                <option value="">-- Select Period --</option>
                                {leavePeriods.map(period => (
                                    <option key={period.id} value={period.id}>{period.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="dept-select" className="block text-sm font-semibold text-slate-700 mb-2">
                                Department
                            </label>
                            <select 
                                id="dept-select" 
                                value={selectedDepartmentId} 
                                onChange={handleDepartmentChange}
                                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                            >
                                <option value="">All Departments</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.departmentname  }</option>
                                ))}
                            </select>
                        </div>
                    </div>
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
                            placeholder="Search by employee name or code..." 
                            value={searchTerm} 
                            onChange={handleSearchChange}
                            className="w-full px-4 py-2 pl-10 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                        />
                        <svg className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={openBulkModal} 
                            disabled={!selectedCompanyId || !selectedPeriodId}
                            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                        >
                            📊 Bulk Upload
                        </button>
                        <button 
                            onClick={openAddModal} 
                            disabled={!selectedCompanyId || !selectedPeriodId}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                        >
                            + Add Allocation
                        </button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Emp Code</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Employee</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Department</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Leave Type</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold">Allocated</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold">CF</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold">Total</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold">Used</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold">Balance</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="11" className="px-6 py-8 text-center">
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                <span className="ml-3 text-slate-600">Loading...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : Object.keys(groupedAllocations).length > 0 ? (
                                    Object.values(groupedAllocations).map(group => (
                                        group.allocations.map((alloc, idx) => (
                                            <tr 
                                                key={alloc.id}
                                                className={`border-b border-slate-200 hover:bg-blue-50 transition-colors duration-150 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                                            >
                                                {idx === 0 && (
                                                    <>
                                                        <td rowSpan={group.allocations.length} className="px-4 py-3 text-sm font-medium text-slate-900">
                                                            {alloc.employee.employeeCode}
                                                        </td>
                                                        <td rowSpan={group.allocations.length} className="px-4 py-3 text-sm font-medium text-slate-900">
                                                            {alloc.employee.firstName}
                                                        </td>
                                                        <td rowSpan={group.allocations.length} className="px-4 py-3 text-sm text-slate-700">
                                                            {alloc.employee.department?.name || 'N/A'}
                                                        </td>
                                                    </>
                                                )}
                                                <td className="px-4 py-3 text-sm text-slate-700">{alloc.leaveType.name}</td>
                                                <td className="px-4 py-3 text-center text-sm text-slate-700">{alloc.allocatedLeaves}</td>
                                                <td className="px-4 py-3 text-center text-sm text-slate-700">{alloc.carryForwardFromPrevious}</td>
                                                <td className="px-4 py-3 text-center text-sm font-semibold text-slate-900">{alloc.totalAvailable}</td>
                                                <td className="px-4 py-3 text-center text-sm text-slate-700">{alloc.usedLeaves}</td>
                                                <td className="px-4 py-3 text-center text-sm font-semibold">
                                                    <span className={alloc.remainingBalance < 3 ? 'text-red-600' : 'text-green-600'}>
                                                        {alloc.remainingBalance}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                                        alloc.status === 'Active' 
                                                            ? 'bg-green-100 text-green-700 border border-green-300' 
                                                            : 'bg-red-100 text-red-700 border border-red-300'
                                                    }`}>
                                                        {alloc.status === 'Active' ? '✓' : '✕'} {alloc.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={() => openEditModal(alloc)} 
                                                            title="Edit"
                                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(alloc.id)} 
                                                            title="Delete"
                                                            disabled={alloc.usedLeaves > 0}
                                                            className={`p-2 rounded-lg transition-colors duration-200 ${alloc.usedLeaves > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-red-600 hover:bg-red-100'}`}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="11" className="px-6 py-8 text-center text-slate-500">
                                            No allocations found. Click "+ Add Allocation" to start.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Leave Allocation Modal */}
            {isModalOpen && (
                <LeaveAllocationModal
                    allocation={editingAllocation}
                    companyId={selectedCompanyId}
                    companyName={selectedCompany?.name}
                    defaultPeriodId={selectedPeriodId}
                    masterData={masterData}
                    onClose={closeModal}
                    onSave={handleAllocationSaved}
                />
            )}

            {/* Bulk Leave Allocation Modal */}
            {isBulkModalOpen && (
                <BulkLeaveAllocationModal
                    companyId={selectedCompanyId}
                    companyName={selectedCompany?.name}
                    defaultPeriodId={selectedPeriodId}
                    masterData={masterData}
                    onClose={() => setIsBulkModalOpen(false)}
                    onSave={handleAllocationSaved}
                />
            )}
        </div>
    );
};

export default LeaveAllocationManagement;