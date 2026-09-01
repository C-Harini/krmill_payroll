// frontend/src/pages/EmployeeReports.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from '../api';

const EmployeeReports = () => {
  const [activeTab, setActiveTab] = useState('employee-details');
  
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employmentTypes, setEmploymentTypes] = useState([]);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    company_id: '',
    department_id: '',
    employment_type_id: '',
    employee_id: '',
    employee_name: '',
    leave_type_id: '',
    from_date: '',
    to_date: '',
    status: 'Active',
    attendance_status: '',
    punch_type: '',
    year: new Date().getFullYear()
  });

  const [employeeData, setEmployeeData] = useState([]);
  const [leaveBalanceData, setLeaveBalanceData] = useState([]);
  const [leaveTakenData, setLeaveTakenData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({});
  const [biometricData, setBiometricData] = useState([]);
  const [comprehensiveData, setComprehensiveData] = useState(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Column config for Employee Details dynamic table columns
  const ALL_COLUMNS = [
    { key: 'employeeCode', label: 'Emp Code' },
    { key: 'fullName', label: 'Name' },
    { key: 'company', label: 'Company' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'employmentType', label: 'Employment Type' },
    { key: 'email', label: 'Email' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'doj', label: 'DOJ' },
    { key: 'status', label: 'Status' },
    { key: 'dob', label: 'DOB' },
    { key: 'gender', label: 'Gender' },
    { key: 'bloodGroup', label: 'Blood Group' },
    { key: 'maritalStatus', label: 'Marital Status' },
    { key: 'address', label: 'Address' },
    { key: 'pan', label: 'PAN' },
    { key: 'aadhar', label: 'Aadhar' },
    { key: 'uan', label: 'UAN' },
    { key: 'esic', label: 'ESIC' },
    { key: 'bankName', label: 'Bank Name' },
    { key: 'accountNumber', label: 'Account Number' },
    { key: 'ifsc', label: 'IFSC Code' },
    { key: 'emergencyContactName', label: 'Emergency Contact' }
  ];

  const [selectedFields, setSelectedFields] = useState([
    'employeeCode', 'fullName', 'company', 'department', 'designation', 'employmentType', 'email', 'mobile', 'doj', 'status'
  ]);
  const [isFieldsDropdownOpen, setIsFieldsDropdownOpen] = useState(false);
  const fieldsDropdownRef = useRef(null);

  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
  const empDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (empDropdownRef.current && !empDropdownRef.current.contains(event.target)) {
        setIsEmpDropdownOpen(false);
      }
      if (fieldsDropdownRef.current && !fieldsDropdownRef.current.contains(event.target)) {
        setIsFieldsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Auth token helper ────────────────────────────────────────
  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (filters.company_id) {
      fetchDepartments(filters.company_id);
      fetchEmployees(filters.company_id);
      fetchLeaveTypes(filters.company_id);
      fetchEmploymentTypes(filters.company_id);
    }
  }, [filters.company_id]);

  // ── FIXED: fetchCompanies now sends auth token ───────────────
  const fetchCompanies = async () => {
    try {
      const response = await axios.get('/companies', {
        headers: getAuthHeaders()
      });
      const data = response.data;
      const list = Array.isArray(data) ? data : (data.data || []);
      const companiesData = list.map(company => ({
        company_id: company.id || company.company_id,
        company_name: company.name || company.company_name,
        company_code: company.registrationNumber || company.company_code || ''
      }));
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error fetching companies:', error.response?.data || error.message);
      setError('Failed to load companies. Check your connection and try refreshing.');
    }
  };

  const fetchDepartments = async (companyId) => {
    try {
      const response = await axios.get(`/departments`, {
        headers: getAuthHeaders(),
        params: { company_id: companyId, companyId: companyId }
      });
      const depts = Array.isArray(response.data) ? response.data : (response.data.data || []);
      const mapped = depts.map(d => ({
        department_id: d.id || d.department_id,
        department_name: d.name || d.departmentname || d.department_name,
        department_code: d.code || d.department_code
      }));
      setDepartments(mapped);
    } catch (error) {
      console.error('Department error:', error.response?.data);
      setDepartments([]);
    }
  };

  const fetchEmployees = async (companyId) => {
    try {
      const response = await axios.get(`/employees`, {
        headers: getAuthHeaders(),
        params: { company_id: companyId, companyId: companyId, status: 'Active' }
      });
      const emps = Array.isArray(response.data) ? response.data : (response.data.data || []);
      const mapped = emps.map(e => ({
        employee_id: e.id || e.employee_id,
        employee_code: e.employeeCode || e.code || e.employee_code,
        employee_name: e.firstName || e.fullName || e.name || e.employee_name || ""
      }));
      setEmployees(mapped);
    } catch (error) {
      console.error('Employee error:', error.response?.data);
      setEmployees([]);
    }
  };

  const fetchLeaveTypes = async (companyId) => {
    try {
      const response = await axios.get('/leave-types', {
        headers: getAuthHeaders(),
        params: { companyId: companyId, company_id: companyId }
      });
      setLeaveTypes(Array.isArray(response.data) ? response.data : (response.data.data || []));
    } catch (error) {
      console.error('Leave types error:', error.response?.data);
      setLeaveTypes([]);
    }
  };

  const fetchEmploymentTypes = async (companyId) => {
    try {
      const response = await axios.get('/employment-types', {
        headers: getAuthHeaders(),
        params: { companyId: companyId, company_id: companyId }
      });
      const mappedTypes = (response.data || []).map(type => ({
        employment_type_id: type.id,
        employment_type_name: type.name,
        employment_type_code: type.code
      }));
      setEmploymentTypes(mappedTypes);
    } catch (error) {
      console.error('Employment types error:', error.response?.data);
      setEmploymentTypes([]);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const fetchEmployeeDetails = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => { if (value) params.append(key, value); });
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);

      const response = await axios.get(`/employee-reports/employee-details?${params}`, {
        headers: getAuthHeaders()
      });

      if (response.data && Array.isArray(response.data.data)) {
        setEmployeeData(response.data.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0
        }));
      } else {
        throw new Error('Invalid data structure received from server');
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
      setEmployeeData([]);
      setError(`Failed to fetch employee details: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveBalance = async () => {
    if (!filters.company_id) { alert('Please select a company'); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('company_id', filters.company_id);
      if (filters.department_id) params.append('department_id', filters.department_id);
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      if (filters.leave_type_id) params.append('leave_type_id', filters.leave_type_id);
      params.append('year', filters.year);
      const response = await axios.get(`/employee-reports/leave-balance?${params}`, { headers: getAuthHeaders() });
      setLeaveBalanceData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      alert('Failed to fetch leave balance: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveTaken = async () => {
    if (!filters.from_date || !filters.to_date) { alert('Please select from date and to date'); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.company_id) params.append('company_id', filters.company_id);
      if (filters.department_id) params.append('department_id', filters.department_id);
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      if (filters.leave_type_id) params.append('leave_type_id', filters.leave_type_id);
      params.append('from_date', filters.from_date);
      params.append('to_date', filters.to_date);
      if (filters.status) params.append('status', filters.status);
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);
      const response = await axios.get(`/employee-reports/leave-taken?${params}`, { headers: getAuthHeaders() });
      setLeaveTakenData(response.data.data || []);
      setPagination(prev => ({ ...prev, total: response.data.pagination?.total || 0, totalPages: response.data.pagination?.totalPages || 0 }));
    } catch (error) {
      console.error('Error fetching leave taken:', error);
      alert('Failed to fetch leave taken: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!filters.from_date || !filters.to_date) { alert('Please select from date and to date'); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.company_id) params.append('company_id', filters.company_id);
      if (filters.department_id) params.append('department_id', filters.department_id);
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      params.append('from_date', filters.from_date);
      params.append('to_date', filters.to_date);
      if (filters.attendance_status) params.append('attendance_status', filters.attendance_status);
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);
      const response = await axios.get(`/employee-reports/attendance?${params}`, { headers: getAuthHeaders() });
      setAttendanceData(response.data.data || []);
      setAttendanceSummary(response.data.summary || {});
      setPagination(prev => ({ ...prev, total: response.data.pagination?.total || 0, totalPages: response.data.pagination?.totalPages || 0 }));
    } catch (error) {
      console.error('Error fetching attendance:', error);
      alert('Failed to fetch attendance: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchBiometric = async () => {
    if (!filters.from_date || !filters.to_date) { alert('Please select from date and to date'); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.company_id) params.append('company_id', filters.company_id);
      if (filters.department_id) params.append('department_id', filters.department_id);
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      params.append('from_date', filters.from_date);
      params.append('to_date', filters.to_date);
      if (filters.punch_type) params.append('punch_type', filters.punch_type);
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);
      const response = await axios.get(`/employee-reports/biometric?${params}`, { headers: getAuthHeaders() });
      setBiometricData(response.data.data || []);
      setPagination(prev => ({ ...prev, total: response.data.pagination?.total || 0, totalPages: response.data.pagination?.totalPages || 0 }));
    } catch (error) {
      console.error('Error fetching biometric data:', error);
      alert('Failed to fetch biometric data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchComprehensive = async () => {
    if (!filters.employee_id) { alert('Please select an employee'); return; }
    if (!filters.from_date || !filters.to_date) { alert('Please select from date and to date'); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('employee_id', filters.employee_id);
      params.append('from_date', filters.from_date);
      params.append('to_date', filters.to_date);
      const response = await axios.get(`/employee-reports/comprehensive?${params}`, { headers: getAuthHeaders() });
      setComprehensiveData(response.data.data || null);
    } catch (error) {
      console.error('Error fetching comprehensive report:', error);
      alert('Failed to fetch comprehensive report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    switch (activeTab) {
      case 'employee-details': fetchEmployeeDetails(); break;
      case 'leave-balance':    fetchLeaveBalance();    break;
      case 'leave-taken':      fetchLeaveTaken();      break;
      case 'attendance':       fetchAttendance();      break;
      case 'biometric':        fetchBiometric();       break;
      case 'comprehensive':    fetchComprehensive();   break;
      default: break;
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    setTimeout(handleSearch, 0);
  };

  // ── Generic server-side download ─────────────────────────────
  const downloadFile = async (url, filename) => {
    setDownloadLoading(true);
    try {
      const response = await axios.get(url, {
        responseType: 'blob',
        headers: getAuthHeaders()
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download: ' + (error.response?.data?.message || error.message));
    } finally {
      setDownloadLoading(false);
    }
  };

  // ── Download handlers per tab ─────────────────────────────────
  const handleDownloadPDF = async () => {
    const params = new URLSearchParams();
    if (filters.company_id) params.append('company_id', filters.company_id);
    if (filters.department_id) params.append('department_id', filters.department_id);
    if (filters.employment_type_id) params.append('employment_type_id', filters.employment_type_id);
    if (filters.status) params.append('status', filters.status);
    params.append('fields', selectedFields.join(','));
    await downloadFile(`/employee-reports/export/employee-details-pdf?${params}`, `employee_details_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDownloadExcel = async () => {
    const params = new URLSearchParams();
    if (filters.company_id) params.append('company_id', filters.company_id);
    if (filters.department_id) params.append('department_id', filters.department_id);
    if (filters.employment_type_id) params.append('employment_type_id', filters.employment_type_id);
    if (filters.status) params.append('status', filters.status);
    params.append('fields', selectedFields.join(','));
    await downloadFile(`/employee-reports/export/employee-details-excel?${params}`, `employee_details_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleLeaveBalancePDF = async () => {
    const params = new URLSearchParams();
    if (filters.company_id) params.append('company_id', filters.company_id);
    if (filters.department_id) params.append('department_id', filters.department_id);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    if (filters.leave_type_id) params.append('leave_type_id', filters.leave_type_id);
    const yearVal = filters.year || new Date().getFullYear();
    params.append('year', yearVal);
    await downloadFile(`/employee-reports/export/leave-balance-pdf?${params}`, `leave_balance_${yearVal}.pdf`);
  };

  const handleLeaveBalanceExcel = async () => {
    const params = new URLSearchParams();
    if (filters.company_id) params.append('company_id', filters.company_id);
    if (filters.department_id) params.append('department_id', filters.department_id);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    if (filters.leave_type_id) params.append('leave_type_id', filters.leave_type_id);
    const yearVal = filters.year || new Date().getFullYear();
    params.append('year', yearVal);
    await downloadFile(`/employee-reports/export/leave-balance-excel?${params}`, `leave_balance_${yearVal}.xlsx`);
  };

  const handleLeaveTakenPDF = async () => {
    const params = new URLSearchParams();
    if (filters.company_id) params.append('company_id', filters.company_id);
    if (filters.department_id) params.append('department_id', filters.department_id);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    if (filters.leave_type_id) params.append('leave_type_id', filters.leave_type_id);
    const fromVal = filters.from_date || 'all';
    const toVal = filters.to_date || 'all';
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    if (filters.status) params.append('status', filters.status);
    await downloadFile(`/employee-reports/export/leave-taken-pdf?${params}`, `leave_taken_${fromVal}_${toVal}.pdf`);
  };

  const handleLeaveTakenExcel = async () => {
    const params = new URLSearchParams();
    if (filters.company_id) params.append('company_id', filters.company_id);
    if (filters.department_id) params.append('department_id', filters.department_id);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    if (filters.leave_type_id) params.append('leave_type_id', filters.leave_type_id);
    const fromVal = filters.from_date || 'all';
    const toVal = filters.to_date || 'all';
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    if (filters.status) params.append('status', filters.status);
    await downloadFile(`/employee-reports/export/leave-taken-excel?${params}`, `leave_taken_${fromVal}_${toVal}.xlsx`);
  };

  const handleAttendancePDF = async () => {
    const params = new URLSearchParams();
    if (filters.company_id) params.append('company_id', filters.company_id);
    if (filters.department_id) params.append('department_id', filters.department_id);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    const fromVal = filters.from_date || 'all';
    const toVal = filters.to_date || 'all';
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    if (filters.attendance_status) params.append('attendance_status', filters.attendance_status);
    await downloadFile(`/employee-reports/export/attendance-pdf?${params}`, `attendance_${fromVal}_${toVal}.pdf`);
  };

  const handleAttendanceExcel = async () => {
    const params = new URLSearchParams();
    if (filters.company_id) params.append('company_id', filters.company_id);
    if (filters.department_id) params.append('department_id', filters.department_id);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    const fromVal = filters.from_date || 'all';
    const toVal = filters.to_date || 'all';
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    if (filters.attendance_status) params.append('attendance_status', filters.attendance_status);
    await downloadFile(`/employee-reports/export/attendance-excel?${params}`, `attendance_${fromVal}_${toVal}.xlsx`);
  };

  const handleBiometricPDF = async () => {
    const params = new URLSearchParams();
    if (filters.company_id) params.append('company_id', filters.company_id);
    if (filters.department_id) params.append('department_id', filters.department_id);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    const fromVal = filters.from_date || 'all';
    const toVal = filters.to_date || 'all';
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    if (filters.punch_type) params.append('punch_type', filters.punch_type);
    await downloadFile(`/employee-reports/export/biometric-pdf?${params}`, `biometric_${fromVal}_${toVal}.pdf`);
  };

  const handleBiometricExcel = async () => {
    const params = new URLSearchParams();
    if (filters.company_id) params.append('company_id', filters.company_id);
    if (filters.department_id) params.append('department_id', filters.department_id);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    const fromVal = filters.from_date || 'all';
    const toVal = filters.to_date || 'all';
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    if (filters.punch_type) params.append('punch_type', filters.punch_type);
    await downloadFile(`/employee-reports/export/biometric-excel?${params}`, `biometric_${fromVal}_${toVal}.xlsx`);
  };

  const handleComprehensivePDF = async () => {
    const params = new URLSearchParams();
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    const fromVal = filters.from_date || 'all';
    const toVal = filters.to_date || 'all';
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    await downloadFile(`/employee-reports/export/comprehensive-pdf?${params}`, `comprehensive_report_${fromVal}_${toVal}.pdf`);
  };

  const handleComprehensiveExcel = async () => {
    const params = new URLSearchParams();
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    const fromVal = filters.from_date || 'all';
    const toVal = filters.to_date || 'all';
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    await downloadFile(`/employee-reports/export/comprehensive-excel?${params}`, `comprehensive_report_${fromVal}_${toVal}.xlsx`);
  };

  // ── Reusable export button pair ───────────────────────────────
  const ExportButtons = ({ onPDF, onExcel, disabled = false }) => (
    <>
      <button
        onClick={onPDF}
        disabled={downloadLoading || disabled}
        className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
      >
        {downloadLoading ? 'Downloading...' : '📄 PDF'}
      </button>
      <button
        onClick={onExcel}
        disabled={downloadLoading || disabled}
        className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
      >
        {downloadLoading ? 'Downloading...' : '📊 Excel'}
      </button>
    </>
  );

  const renderEmployeeSelect = (isRequired = false) => {
    const selectedEmp = employees.find(emp => String(emp.employee_id) === String(filters.employee_id));
    const filtered = employees.filter(emp => {
      const searchStr = `${emp.employee_code || ''} ${emp.employee_name || ''}`.toLowerCase();
      return searchStr.includes(empSearchQuery.toLowerCase());
    });

    return (
      <div className="relative" ref={empDropdownRef}>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Employee {isRequired && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder={filters.company_id ? "Search employee..." : "Select company first"}
            value={isEmpDropdownOpen ? empSearchQuery : (selectedEmp ? `${selectedEmp.employee_code} - ${selectedEmp.employee_name}` : (isRequired ? "Select Employee" : "All Employees"))}
            onChange={(e) => setEmpSearchQuery(e.target.value)}
            onFocus={() => {
              if (filters.company_id) {
                setIsEmpDropdownOpen(true);
                setEmpSearchQuery("");
              }
            }}
            disabled={!filters.company_id}
            className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-700 font-medium"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            {isEmpDropdownOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
          {filters.employee_id && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFilters(prev => ({ ...prev, employee_id: '' }));
                setEmpSearchQuery('');
                setIsEmpDropdownOpen(false);
              }}
              className="absolute inset-y-0 right-8 px-2 flex items-center text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>

        {isEmpDropdownOpen && filters.company_id && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {!isRequired && (
              <div
                onClick={() => {
                  setFilters(prev => ({ ...prev, employee_id: '' }));
                  setEmpSearchQuery("");
                  setIsEmpDropdownOpen(false);
                }}
                className={`px-4 py-2.5 cursor-pointer hover:bg-blue-50 text-slate-700 hover:text-blue-900 transition-colors flex items-center justify-between text-sm ${
                  !filters.employee_id ? 'bg-blue-50 font-semibold text-blue-900' : ''
                }`}
              >
                <span>All Employees</span>
                {!filters.employee_id && <span className="text-blue-600 font-bold">✓</span>}
              </div>
            )}
            {filtered.length > 0 ? (
              filtered.map(emp => (
                <div
                  key={emp.employee_id}
                  onClick={() => {
                    setFilters(prev => ({ ...prev, employee_id: String(emp.employee_id) }));
                    setEmpSearchQuery("");
                    setIsEmpDropdownOpen(false);
                  }}
                  className={`px-4 py-2.5 cursor-pointer hover:bg-blue-50 text-slate-700 hover:text-blue-900 transition-colors flex items-center justify-between text-sm ${
                    String(filters.employee_id) === String(emp.employee_id) ? 'bg-blue-50 font-semibold text-blue-900' : ''
                  }`}
                >
                  <span>{emp.employee_code} - {emp.employee_name}</span>
                  {String(filters.employee_id) === String(emp.employee_id) && (
                    <span className="text-blue-600 font-bold">✓</span>
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                No employees found matching "{empSearchQuery}"
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderFilters = () => {
    switch (activeTab) {
      case 'employee-details':
        return (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                <select name="company_id" value={filters.company_id} onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                  <option value="">All Companies</option>
                  {companies.map(company => (
                    <option key={company.company_id} value={company.company_id}>{company.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Department</label>
                <select name="department_id" value={filters.department_id} onChange={handleFilterChange}
                  disabled={!filters.company_id}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-100">
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Employment Type</label>
                <select name="employment_type_id" value={filters.employment_type_id} onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                  <option value="">All Types</option>
                  {employmentTypes.map(type => (
                    <option key={type.employment_type_id} value={type.employment_type_id}>{type.employment_type_name}</option>
                  ))}
                </select>
              </div>
              {renderEmployeeSelect(false)}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Search by Name</label>
                <input type="text" name="employee_name" value={filters.employee_name} onChange={handleFilterChange}
                  placeholder="Type employee name..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                <select name="status" value={filters.status} onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Fields</label>
                <div className="relative" ref={fieldsDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsFieldsDropdownOpen(!isFieldsDropdownOpen)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left text-slate-700 font-medium flex items-center justify-between"
                  >
                    <span>Fields ({selectedFields.length}/{ALL_COLUMNS.length})</span>
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isFieldsDropdownOpen && (
                    <div className="absolute right-0 z-50 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-xl p-4 max-h-80 overflow-y-auto">
                      <div className="flex items-center justify-between border-b pb-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setSelectedFields(ALL_COLUMNS.map(c => c.key))}
                          className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                        >
                          ✓ Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedFields(['employeeCode', 'fullName'])}
                          className="text-xs text-red-600 hover:text-red-800 font-bold"
                        >
                          ✕ Reset
                        </button>
                      </div>
                      <div className="space-y-2">
                        {ALL_COLUMNS.map(col => {
                          const isChecked = selectedFields.includes(col.key);
                          return (
                            <label key={col.key} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedFields(selectedFields.filter(k => k !== col.key));
                                  } else {
                                    setSelectedFields([...selectedFields, col.key]);
                                  }
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                              />
                              <span>{col.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={handleSearch} disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50">
                {loading ? 'Searching...' : 'Search'}
              </button>
              <ExportButtons onPDF={handleDownloadPDF} onExcel={handleDownloadExcel} disabled={employeeData.length === 0} />
            </div>
          </div>
        );

      case 'leave-balance':
        return (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Company *</label>
                <select name="company_id" value={filters.company_id} onChange={handleFilterChange} required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                  <option value="">Select Company</option>
                  {companies.map(company => (
                    <option key={company.company_id} value={company.company_id}>{company.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Department</label>
                <select name="department_id" value={filters.department_id} onChange={handleFilterChange}
                  disabled={!filters.company_id}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-100">
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
                  ))}
                </select>
              </div>
              {renderEmployeeSelect(false)}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Leave Type</label>
                <select name="leave_type_id" value={filters.leave_type_id} onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                  <option value="">All Leave Types</option>
                  {leaveTypes.map(type => (
                    <option key={type.id || type.leave_type_id} value={type.id || type.leave_type_id}>{type.name || type.leave_type_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Year</label>
                <select name="year" value={filters.year} onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                  {[...Array(5)].map((_, i) => { const year = new Date().getFullYear() - i; return <option key={year} value={year}>{year}</option>; })}
                </select>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={handleSearch} disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50">
                {loading ? 'Searching...' : 'Search'}
              </button>
              <ExportButtons onPDF={handleLeaveBalancePDF} onExcel={handleLeaveBalanceExcel} disabled={leaveBalanceData.length === 0} />
            </div>
          </div>
        );

      case 'leave-taken':
      case 'attendance':
      case 'biometric':
        return (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                <select name="company_id" value={filters.company_id} onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                  <option value="">All Companies</option>
                  {companies.map(company => (
                    <option key={company.company_id} value={company.company_id}>{company.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Department</label>
                <select name="department_id" value={filters.department_id} onChange={handleFilterChange}
                  disabled={!filters.company_id}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-100">
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
                  ))}
                </select>
              </div>
              {renderEmployeeSelect(false)}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">From Date *</label>
                <input type="date" name="from_date" value={filters.from_date} onChange={handleFilterChange} required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">To Date *</label>
                <input type="date" name="to_date" value={filters.to_date} onChange={handleFilterChange} required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              {activeTab === 'leave-taken' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Leave Type</label>
                  <select name="leave_type_id" value={filters.leave_type_id} onChange={handleFilterChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                    <option value="">All Leave Types</option>
                    {leaveTypes.map(type => (
                      <option key={type.id || type.leave_type_id} value={type.id || type.leave_type_id}>{type.name || type.leave_type_name}</option>
                    ))}
                  </select>
                </div>
              )}
              {activeTab === 'attendance' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Attendance Status</label>
                  <select name="attendance_status" value={filters.attendance_status} onChange={handleFilterChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                    <option value="">All Status</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Leave">Leave</option>
                    <option value="Holiday">Holiday</option>
                  </select>
                </div>
              )}
              {activeTab === 'biometric' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Punch Type</label>
                  <select name="punch_type" value={filters.punch_type} onChange={handleFilterChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                    <option value="">All Types</option>
                    <option value="In">Check In</option>
                    <option value="Out">Check Out</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={handleSearch} disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50">
                {loading ? 'Searching...' : 'Search'}
              </button>
              {activeTab === 'leave-taken' && (
                <ExportButtons onPDF={handleLeaveTakenPDF} onExcel={handleLeaveTakenExcel} disabled={leaveTakenData.length === 0} />
              )}
              {activeTab === 'attendance' && (
                <ExportButtons onPDF={handleAttendancePDF} onExcel={handleAttendanceExcel} disabled={attendanceData.length === 0} />
              )}
              {activeTab === 'biometric' && (
                <ExportButtons onPDF={handleBiometricPDF} onExcel={handleBiometricExcel} disabled={biometricData.length === 0} />
              )}
            </div>
          </div>
        );

      case 'comprehensive':
        return (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Company *</label>
                <select name="company_id" value={filters.company_id} onChange={handleFilterChange} required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                  <option value="">Select Company</option>
                  {companies.map(company => (
                    <option key={company.company_id} value={company.company_id}>{company.company_name}</option>
                  ))}
                </select>
              </div>
              {renderEmployeeSelect(true)}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">From Date *</label>
                <input type="date" name="from_date" value={filters.from_date} onChange={handleFilterChange} required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">To Date *</label>
                <input type="date" name="to_date" value={filters.to_date} onChange={handleFilterChange} required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={handleSearch} disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50">
                {loading ? 'Searching...' : 'Search'}
              </button>
              <ExportButtons onPDF={handleComprehensivePDF} onExcel={handleComprehensiveExcel} disabled={!comprehensiveData} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderEmployeeDetailsTable = () => {
    if (loading) return <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;
    if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>;
    if (employeeData.length === 0) return <div className="py-8 text-center text-slate-500">No employee data found</div>;

    const activeColumns = ALL_COLUMNS.filter(col => selectedFields.includes(col.key));

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                {activeColumns.map(col => (
                  <th key={col.key} className="px-6 py-3 text-left text-sm font-semibold whitespace-nowrap">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {employeeData.map((emp, index) => (
                <tr key={emp.employee_id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
                  {activeColumns.map(col => {
                    switch (col.key) {
                      case 'employeeCode':
                        return <td key={col.key} className="px-6 py-4 text-sm font-medium text-slate-800 whitespace-nowrap">{emp.employee_code}</td>;
                      case 'fullName':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-800 whitespace-nowrap">{emp.employee_name}</td>;
                      case 'company':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.company_name}</td>;
                      case 'department':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.department_name}</td>;
                      case 'designation':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.designation_name}</td>;
                      case 'employmentType':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.employment_type_name}</td>;
                      case 'email':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.email}</td>;
                      case 'mobile':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.mobile}</td>;
                      case 'doj':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString() : 'N/A'}</td>;
                      case 'status':
                        return (
                          <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${emp.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {emp.status}
                            </span>
                          </td>
                        );
                      case 'dob':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString() : 'N/A'}</td>;
                      case 'gender':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.gender || 'N/A'}</td>;
                      case 'bloodGroup':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.bloodGroup || 'N/A'}</td>;
                      case 'maritalStatus':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.maritalStatus || 'N/A'}</td>;
                      case 'address':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 max-w-xs truncate" title={emp.address}>{emp.address || 'N/A'}</td>;
                      case 'pan':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.pan || 'N/A'}</td>;
                      case 'aadhar':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.aadhar || 'N/A'}</td>;
                      case 'uan':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.uan || 'N/A'}</td>;
                      case 'esic':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.esic || 'N/A'}</td>;
                      case 'bankName':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.bankName || 'N/A'}</td>;
                      case 'accountNumber':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.accountNumber || 'N/A'}</td>;
                      case 'ifsc':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.ifsc || 'N/A'}</td>;
                      case 'emergencyContactName':
                        return <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{emp.emergencyContactName || 'N/A'}</td>;
                      default:
                        return null;
                    }
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
            <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50">Previous</button>
            <span className="text-sm text-slate-600">Page {pagination.page} of {pagination.totalPages} (Total: {pagination.total} records)</span>
            <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50">Next</button>
          </div>
        )}
      </div>
    );
  };

  const renderLeaveBalanceTable = () => {
    if (loading) return <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;
    if (leaveBalanceData.length === 0) return <div className="py-8 text-center text-slate-500">No leave balance data found</div>;

    const groupedData = leaveBalanceData.reduce((acc, item) => {
      if (!acc[item.employee_id]) {
        acc[item.employee_id] = {
          employee_code: item.employee_code, employee_name: item.employee_name,
          company_name: item.company_name, department_name: item.department_name,
          employment_type_name: item.employment_type_name, leaves: []
        };
      }
      acc[item.employee_id].leaves.push(item);
      return acc;
    }, {});

    return (
      <div className="grid gap-6">
        {Object.values(groupedData).map((employee) => (
          <div key={employee.employee_code} className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800">{employee.employee_code} - {employee.employee_name}</h3>
              <div className="flex gap-4 mt-2 text-sm text-slate-600">
                <span><strong>Company:</strong> {employee.company_name}</span>
                <span><strong>Department:</strong> {employee.department_name}</span>
                <span><strong>Type:</strong> {employee.employment_type_name}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employee.leaves.map((leave) => (
                <div key={leave.leave_type_id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-blue-600 mb-3">{leave.leave_type_name}</h4>
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm"><span className="text-slate-600">Total Allowed</span><span className="font-semibold">{leave.total_allowed}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-600">Used</span><span className="font-semibold text-red-600">{leave.total_used}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-600">Balance</span><span className="font-semibold text-green-600">{leave.balance}</span></div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (leave.total_used / (leave.total_allowed || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLeaveTakenTable = () => {
    if (loading) return <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;
    if (leaveTakenData.length === 0) return <div className="py-8 text-center text-slate-500">No leave data found</div>;

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <th className="px-6 py-3 text-left text-sm font-semibold">Emp Code</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Employee Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Company</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Department</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Leave Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">From Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">To Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Days</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Reason</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leaveTakenData.map((leave, index) => (
                <tr key={leave.leave_id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{leave.employee_code}</td>
                  <td className="px-6 py-4 text-sm text-slate-800">{leave.employee_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{leave.company_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{leave.department_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{leave.leave_type_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{new Date(leave.from_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{new Date(leave.to_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{leave.total_days}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{leave.reason}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {leave.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
            <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50">Previous</button>
            <span className="text-sm text-slate-600">Page {pagination.page} of {pagination.totalPages}</span>
            <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50">Next</button>
          </div>
        )}
      </div>
    );
  };

  const renderAttendanceTable = () => {
    if (loading) return <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;
    if (attendanceData.length === 0) return <div className="py-8 text-center text-slate-500">No attendance data found</div>;

    // Group by Date, then Shift
    const grouped = {};
    attendanceData.forEach((att) => {
      const dateKey = att.attendance_date ? new Date(att.attendance_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown Date';
      if (!grouped[dateKey]) grouped[dateKey] = {};
      const shiftKey = att.shift_name || 'Unassigned';
      if (!grouped[dateKey][shiftKey]) grouped[dateKey][shiftKey] = [];
      grouped[dateKey][shiftKey].push(att);
    });

    return (
      <>
        {Object.keys(attendanceSummary).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[['Present', attendanceSummary.present, 'blue'], ['Absent', attendanceSummary.absent, 'red'],
              ['Leave', attendanceSummary.leave, 'amber'], ['Holiday', attendanceSummary.holiday, 'green'],
              ['Late Entries', attendanceSummary.late_entries, 'purple']].map(([label, val, color]) => (
              <div key={label} className={`bg-gradient-to-br from-${color}-50 to-${color}-100 rounded-lg p-4 border border-${color}-200`}>
                <h4 className={`text-sm font-semibold text-${color}-800 mb-2`}>{label}</h4>
                <p className={`text-2xl font-bold text-${color}-600`}>{val || 0}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-6">
          {Object.entries(grouped).map(([dateStr, shifts]) => (
            <div key={dateStr} className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                <span className="font-bold text-slate-800 text-lg">{dateStr}</span>
              </div>
              
              <div className="p-4 space-y-4">
                {Object.entries(shifts).map(([shiftName, records]) => (
                  <div key={shiftName} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                      <span className="font-semibold text-slate-700 text-sm">SHIFT: {shiftName}</span>
                      <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                        {records.length} {records.length === 1 ? 'Record' : 'Records'}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            {['Emp Code', 'Employee Name', 'Company', 'Department', 'Status', 'Check In', 'Check Out', 'Total Hours', 'Late (min)'].map(h => (
                              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {records.map((att, idx) => (
                            <tr key={att.attendance_id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30 transition-colors`}>
                              <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{att.employee_code}</td>
                              <td className="px-4 py-3 text-slate-800 whitespace-nowrap">{att.employee_name}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{att.company_name}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{att.department_name}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${att.attendance_status === 'Present' ? 'bg-green-100 text-green-800' : att.attendance_status === 'Absent' ? 'bg-red-100 text-red-800' : att.attendance_status === 'Leave' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
                                  {att.attendance_status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                {att.check_in_time ? new Date(att.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}
                              </td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                {att.check_out_time ? new Date(att.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}
                              </td>
                              <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">{att.total_hours ? `${Number(att.total_hours).toFixed(2)}h` : '-'}</td>
                              <td className={`px-4 py-3 text-sm font-semibold whitespace-nowrap ${att.is_late === 'Yes' ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                                {att.is_late === 'Yes' ? `${att.late_by_minutes}m` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {pagination.totalPages > 1 && (
          <div className="mt-6 px-6 py-4 border border-slate-200 rounded-lg flex justify-between items-center bg-slate-50">
            <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50 font-medium text-sm transition-colors">Previous</button>
            <span className="text-sm font-medium text-slate-600">Page {pagination.page} of {pagination.totalPages}</span>
            <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50 font-medium text-sm transition-colors">Next</button>
          </div>
        )}
      </>
    );
  };

  const renderBiometricTable = () => {
    if (loading) return <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;
    if (biometricData.length === 0) return <div className="py-8 text-center text-slate-500">No biometric data found</div>;

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Time</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Emp Code</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Employee Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Company</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Department</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Punch Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Device</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {biometricData.map((punch, index) => (
                <tr key={punch.punch_id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
                  <td className="px-6 py-4 text-sm text-slate-800">{new Date(punch.punch_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-800">{punch.punch_time}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{punch.employee_code}</td>
                  <td className="px-6 py-4 text-sm text-slate-800">{punch.employee_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{punch.company_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{punch.department_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${punch.punch_type === 'In' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {punch.punch_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{punch.device_name || punch.device_id}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{punch.location || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
            <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50">Previous</button>
            <span className="text-sm text-slate-600">Page {pagination.page} of {pagination.totalPages}</span>
            <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50">Next</button>
          </div>
        )}
      </div>
    );
  };

  const renderComprehensiveReport = () => {
    if (loading) return <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;
    if (!comprehensiveData) return <div className="py-8 text-center text-slate-500">No data found. Please search for an employee.</div>;

    const { employee_details, leave_balance, leave_taken, attendance_summary, attendance_details } = comprehensiveData;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">📋 Employee Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              ['Employee Code', employee_details.employee_code], ['Name', employee_details.employee_name],
              ['Company', employee_details.company_name], ['Department', employee_details.department_name],
              ['Designation', employee_details.designation_name], ['Employment Type', employee_details.employment_type_name],
              ['Email', employee_details.email], ['Mobile', employee_details.mobile],
              ['DOJ', employee_details.date_of_joining ? new Date(employee_details.date_of_joining).toLocaleDateString() : 'N/A'],
            ].map(([label, val]) => (
              <div key={label} className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-600 font-semibold">{label}</p>
                <p className="text-sm font-bold text-slate-800">{val || 'N/A'}</p>
              </div>
            ))}
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${employee_details.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {employee_details.status}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">📊 Leave Balance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {leave_balance.map((leave, index) => (
              <div key={index} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 className="font-bold text-blue-600 mb-3">{leave.leave_type_name}</h4>
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm"><span className="text-slate-600">Total</span><span className="font-semibold">{leave.total_allowed}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-600">Used</span><span className="font-semibold text-red-600">{leave.total_used}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-600">Balance</span><span className="font-semibold text-green-600">{leave.balance}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {leave_taken.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">🏖️ Leave Taken</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    {['Leave Type','From Date','To Date','Days','Reason','Status'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-slate-700 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {leave_taken.map((leave, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 text-slate-800">{leave.leave_type}</td>
                      <td className="px-4 py-3 text-slate-800">{new Date(leave.from_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-slate-800">{new Date(leave.to_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-slate-800">{leave.total_days}</td>
                      <td className="px-4 py-3 text-slate-800">{leave.reason}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">📅 Attendance Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              ['Present', attendance_summary.present, 'blue'], ['Absent', attendance_summary.absent, 'red'],
              ['Leave', attendance_summary.leave, 'amber'], ['Holiday', attendance_summary.holiday, 'green'],
              ['Late Entries', attendance_summary.late_entries, 'purple']
            ].map(([label, val, color]) => (
              <div key={label} className={`bg-gradient-to-br from-${color}-50 to-${color}-100 rounded-lg p-4 border border-${color}-200`}>
                <h4 className={`text-sm font-semibold text-${color}-800 mb-2`}>{label}</h4>
                <p className={`text-2xl font-bold text-${color}-600`}>{val}</p>
              </div>
            ))}
          </div>
        </div>

        {attendance_details.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">📊 Attendance Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    {['Date','Status','Check In','Check Out','Total Hours','Late'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-slate-700 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {attendance_details.map((att, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 text-slate-800">{new Date(att.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${att.status === 'Present' ? 'bg-green-100 text-green-800' : att.status === 'Absent' ? 'bg-red-100 text-red-800' : att.status === 'Leave' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
                          {att.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{att.check_in || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-800">{att.check_out || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-800">{att.total_hours ? att.total_hours.toFixed ? att.total_hours.toFixed(2) : att.total_hours : 'N/A'}</td>
                      <td className={`px-4 py-3 font-semibold ${att.is_late ? 'text-red-600' : 'text-slate-700'}`}>
                        {att.is_late ? '⚠️ Late' : '✓'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-3">
          <span className="text-4xl">📊</span>
          Employee Reports Dashboard
        </h1>
        <p className="text-slate-600 mt-2">Comprehensive employee reporting with attendance, leave, and biometric tracking</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-lg shadow-md p-3">
        {[
          { id: 'employee-details', label: '📋 Employee Details' },
          { id: 'leave-balance',    label: '📊 Leave Balance' },
          { id: 'leave-taken',      label: '🏖️ Leave Taken' },
          { id: 'attendance',       label: '📅 Attendance' },
          { id: 'biometric',        label: '🔐 Biometric' },
          { id: 'comprehensive',    label: '📑 Comprehensive' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 font-semibold rounded-lg transition-all ${activeTab === tab.id ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-6">{renderFilters()}</div>

      <div className="space-y-6">
        {activeTab === 'employee-details' && renderEmployeeDetailsTable()}
        {activeTab === 'leave-balance'    && renderLeaveBalanceTable()}
        {activeTab === 'leave-taken'      && renderLeaveTakenTable()}
        {activeTab === 'attendance'       && renderAttendanceTable()}
        {activeTab === 'biometric'        && renderBiometricTable()}
        {activeTab === 'comprehensive'    && renderComprehensiveReport()}
      </div>
    </div>
  );
};

export default EmployeeReports;