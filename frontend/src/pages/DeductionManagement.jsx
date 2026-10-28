import React, { useState, useEffect, useRef, useMemo } from 'react';
import { apiRequest } from '../utils/apiCaller';



const MONTHS = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const DEDUCTION_TYPES = ['Mess', 'Stores', 'EB', 'Others', 'Advance'];

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

// ─── Multi-Select Dropdown Component ───
const MultiSelectDropdown = ({ label, options, selected, onChange, displayKey = 'label', valueKey = 'value' }) => {
    const [open, setOpen] = useState(false);

    const toggleOption = (val) => {
        if (selected.includes(val)) {
            onChange(selected.filter(v => v !== val));
        } else {
            onChange([...selected, val]);
        }
    };

    const toggleAll = () => {
        if (selected.length === options.length) {
            onChange([]);
        } else {
            onChange(options.map(o => typeof o === 'string' ? o : o[valueKey]));
        }
    };

    return (
        <div className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
            <div
                onClick={() => setOpen(!open)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 cursor-pointer bg-white flex items-center justify-between min-h-[42px]"
            >
                <div className="flex flex-wrap gap-1 flex-1">
                    {selected.length === 0 && <span className="text-slate-400">Select...</span>}
                    {selected.length === options.length && <span className="text-sm font-medium text-blue-600">All Selected</span>}
                    {selected.length > 0 && selected.length < options.length && selected.map(val => {
                        const opt = options.find(o => (typeof o === 'string' ? o : o[valueKey]) === val);
                        const display = typeof opt === 'string' ? opt : opt[displayKey];
                        return (
                            <span key={val} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                {display}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleOption(val); }}
                                    className="hover:text-blue-900"
                                >×</button>
                            </span>
                        );
                    })}
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)}></div>
                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div
                            onClick={toggleAll}
                            className="px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 cursor-pointer border-b border-slate-100"
                        >
                            {selected.length === options.length ? '✓ Deselect All' : '☐ Select All'}
                        </div>
                        {options.map(opt => {
                            const val = typeof opt === 'string' ? opt : opt[valueKey];
                            const display = typeof opt === 'string' ? opt : opt[displayKey];
                            const isSelected = selected.includes(val);
                            return (
                                <div
                                    key={val}
                                    onClick={() => toggleOption(val)}
                                    className={`px-4 py-2 text-sm cursor-pointer flex items-center gap-2 ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                >
                                    <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                                        {isSelected && '✓'}
                                    </span>
                                    {display}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Employee Multi-Select Component (Search by name & cur/new code, displays curEmployeeCode) ───
const EmployeeMultiSelect = ({ label, employees = [], selected = [], onChange, defaultPlaceholder = "Select Employee(s)...", required = false }) => {
    const [open, setOpen] = useState(false);
    const [searchTxt, setSearchTxt] = useState('');
    const [openSelectedSnapshot, setOpenSelectedSnapshot] = useState([]);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (open) {
            setOpenSelectedSnapshot(selected);
        }
    }, [open]);

    const filtered = useMemo(() => {
        let list = employees;
        if (searchTxt.trim()) {
            const q = searchTxt.toLowerCase().trim();
            list = employees.filter((e) => {
                const name = String(e.firstName || e.employeeName || e.name || '').toLowerCase();
                const lastName = String(e.lastName || '').toLowerCase();
                const fullName = `${name} ${lastName}`.trim();
                const desig = String(e.designation?.acronym || e.designation?.name || e.designationAcronym || '').toLowerCase();
                const dept = String(e.department?.acronym || e.department?.departmentname || e.departmentAcronym || '').toLowerCase();
                const curCode = String(e.curEmployeeCode || e.employeeCode || '').toLowerCase();
                const newCode = String(e.newEmployeeCode || '').toLowerCase();
                return (
                    name.includes(q) ||
                    lastName.includes(q) ||
                    fullName.includes(q) ||
                    curCode.includes(q) ||
                    newCode.includes(q) || desig.includes(q) || dept.includes(q)
                );
            });
        }

        return [...list].sort((a, b) => {
            const aSel = openSelectedSnapshot.includes(String(a.id));
            const bSel = openSelectedSnapshot.includes(String(b.id));
            if (aSel && !bSel) return -1;
            if (!aSel && bSel) return 1;
            return 0;
        });
    }, [employees, searchTxt, openSelectedSnapshot]);

    const toggle = (id) => {
        const sid = String(id);
        onChange(
            selected.includes(sid)
                ? selected.filter((s) => s !== sid)
                : [...selected, sid]
        );
    };

    const toggleAll = () => {
        if (searchTxt.trim()) {
            const filteredIds = filtered.map((e) => String(e.id));
            const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.includes(id));
            if (allFilteredSelected) {
                onChange(selected.filter((id) => !filteredIds.includes(id)));
            } else {
                onChange(Array.from(new Set([...selected, ...filteredIds])));
            }
        } else {
            if (selected.length === employees.length && employees.length > 0) {
                onChange([]);
            } else {
                onChange(employees.map((e) => String(e.id)));
            }
        }
    };

    const isAllSelected = searchTxt.trim()
        ? filtered.length > 0 && filtered.every((e) => selected.includes(String(e.id)))
        : selected.length === employees.length && employees.length > 0;

    const displayText = () => {
        if (!selected.length) return defaultPlaceholder;
        if (selected.length === 1) {
            const found = employees.find((e) => String(e.id) === selected[0]);
            if (found) {
                const code = found.curEmployeeCode || found.employeeCode || '';
                return `${found.firstName || found.name || ''}${code ? ` (${code})` : ''}`;
            }
            return '1 selected';
        }
        return `${selected.length} Employees Selected`;
    };

    return (
        <div className="relative" ref={ref}>
            {label && (
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div
                onClick={() => setOpen(!open)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 cursor-pointer bg-white flex items-center justify-between min-h-[42px] hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 select-none"
            >
                <span className={`truncate text-sm ${!selected.length ? 'text-slate-400' : 'text-slate-800 font-medium'}`}>
                    {displayText()}
                </span>
                <div className="flex items-center gap-1.5 ml-1 shrink-0">
                    {selected.length > 0 && (
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange([]);
                            }}
                            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1 cursor-pointer"
                            title="Clear selection"
                        >
                            ✕
                        </span>
                    )}
                    <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
                </div>
            </div>

            {open && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 min-w-[280px] max-w-[360px] w-full overflow-hidden">
                    {/* Search input */}
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                        <input
                            type="text"
                            placeholder="Search name, cur/new code..."
                            value={searchTxt}
                            onChange={(e) => setSearchTxt(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            autoFocus
                        />
                    </div>
                    {/* Select all bar */}
                    <div
                        onClick={toggleAll}
                        className="flex items-center justify-between px-3 py-2 cursor-pointer border-b border-slate-100 hover:bg-slate-50 bg-slate-50/50 text-xs"
                    >
                        <span className="font-semibold text-slate-700">
                            {isAllSelected ? 'Deselect All' : 'Select All'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                            {selected.length} / {employees.length}
                        </span>
                    </div>
                    {/* Options list */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-slate-400 text-center">
                                No matching employees
                            </div>
                        ) : (
                            filtered.map((e) => {
                                const sid = String(e.id);
                                const isChecked = selected.includes(sid);
                                const curCode = e.curEmployeeCode || e.employeeCode || '';
                                return (
                                    <div
                                        key={e.id}
                                        onClick={() => toggle(e.id)}
                                        className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-blue-50/60 transition-colors text-xs ${
                                            isChecked ? 'bg-blue-50 text-blue-900 font-medium' : 'text-slate-700'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            readOnly
                                            style={{
                                                height: 14,
                                                width: 14,
                                                accentColor: '#2563eb',
                                                pointerEvents: 'none',
                                                cursor: 'pointer',
                                            }}
                                        />
                                        <div className="truncate flex-1">
                                            <span className="font-medium">
                                                {e.firstName || e.employeeName}
                                            </span>
                                            {curCode && (
                                                <span className="text-slate-500 ml-1 font-mono text-[11px]">
                                                    ({curCode})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───
const DeductionManagement = () => {
    const [activeTab, setActiveTab] = useState('entry');
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [deductions, setDeductions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Entry form state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDeduction, setEditingDeduction] = useState(null);
    const [modalSelectedEmps, setModalSelectedEmps] = useState([]);
    const [formData, setFormData] = useState({
        month: currentMonth,
        year: currentYear,
        deductionType: 'Mess',
        amount: '',
        remarks: '',
    });

    // Entry filter state
    const [entryFilterEmps, setEntryFilterEmps] = useState([]);
    const [entryFilterMonth, setEntryFilterMonth] = useState(currentMonth);
    const [entryFilterYear, setEntryFilterYear] = useState(currentYear);

    // Report state
    const [reportDeptIds, setReportDeptIds] = useState([]);
    const [reportEmployeeIds, setReportEmployeeIds] = useState([]);
    const [reportTypes, setReportTypes] = useState([...DEDUCTION_TYPES]);
    const [reportMonth, setReportMonth] = useState(currentMonth);
    const [reportYear, setReportYear] = useState(currentYear);
    const [reportData, setReportData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);

    // Filter employees for the report dropdown based on selected departments (if any)
    const reportEmployees = useMemo(() => {
        if (!reportDeptIds.length) return employees;
        return employees.filter(e => reportDeptIds.includes(e.departmentId));
    }, [employees, reportDeptIds]);

    // Keep reportEmployeeIds in sync if department filter changes
    useEffect(() => {
        if (reportDeptIds.length > 0 && reportEmployeeIds.length > 0) {
            const validIds = new Set(reportEmployees.map(e => String(e.id)));
            setReportEmployeeIds(prev => {
                const next = prev.filter(id => validIds.has(id));
                return next.length !== prev.length ? next : prev;
            });
        }
    }, [reportDeptIds, reportEmployees]);

    // ─── Fetch companies on mount ───
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const data = await apiRequest('/companies');
                setCompanies(data);
                if (data.length > 0) setSelectedCompanyId(data[0].id);
            } catch (err) {
                setError('Failed to fetch companies.');
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    // ─── Fetch departments & employees when company changes ───
    useEffect(() => {
        if (!selectedCompanyId) return;
        setEntryFilterEmps([]);
        const fetchDepts = async () => {
            try {
                const data = await apiRequest(`/departments?companyId=${selectedCompanyId}`);
                setDepartments(data?.data || []);
            } catch (err) {
                console.error(err);
            }
        };
        const fetchEmps = async () => {
            try {
                const data = await apiRequest(`/employees?companyId=${selectedCompanyId}`);
                setEmployees(Array.isArray(data) ? data : data.data || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchDepts();
        fetchEmps();
    }, [selectedCompanyId]);

    // ─── Fetch deductions list (entry tab) ───
    useEffect(() => {
        if (!selectedCompanyId) return;
        fetchDeductions();
    }, [selectedCompanyId, entryFilterEmps, entryFilterMonth, entryFilterYear]);

    const fetchDeductions = async () => {
        try {
            let url = `/deductions?companyId=${selectedCompanyId}&month=${entryFilterMonth}&year=${entryFilterYear}`;
            if (entryFilterEmps.length > 0) url += `&employeeIds=${entryFilterEmps.join(',')}`;
            const data = await apiRequest(url);
            setDeductions(data);
        } catch (err) {
            console.error(err);
        }
    };

    // ─── Auto-clear messages ───
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => { setSuccess(null); setError(null); }, 4000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    // ─── Modal handlers ───
    const openAddModal = () => {
        setEditingDeduction(null);
        setModalSelectedEmps([]);
        setFormData({
            month: entryFilterMonth,
            year: entryFilterYear,
            deductionType: 'Mess',
            amount: '',
            remarks: '',
        });
        setIsModalOpen(true);
    };

    const openEditModal = (d) => {
        setEditingDeduction(d);
        setModalSelectedEmps([String(d.employeeId)]);
        setFormData({
            month: d.month,
            year: d.year,
            deductionType: d.deductionType,
            amount: d.amount,
            remarks: d.remarks || '',
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingDeduction(null);
        setModalSelectedEmps([]);
    };

    // ─── Save deduction ───
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (modalSelectedEmps.length === 0) {
            setError('Please select at least one employee.');
            return;
        }
        setSaving(true);
        setError(null);

        try {
            if (editingDeduction) {
                const payload = {
                    ...formData,
                    employeeId: parseInt(modalSelectedEmps[0]),
                    companyId: selectedCompanyId,
                    amount: parseFloat(formData.amount),
                };
                await apiRequest(`/deductions/${editingDeduction.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
                setSuccess('Deduction updated successfully!');
            } else {
                const payload = {
                    ...formData,
                    employeeIds: modalSelectedEmps.map(id => parseInt(id)),
                    companyId: selectedCompanyId,
                    amount: parseFloat(formData.amount),
                };
                const res = await apiRequest('/deductions', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                setSuccess(res.message || 'Deduction(s) saved successfully!');
            }
            fetchDeductions();
            closeModal();
        } catch (err) {
            setError(err.message || 'Failed to save deduction.');
        } finally {
            setSaving(false);
        }
    };

    // ─── Delete deduction ───
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this deduction entry?')) return;
        try {
            await apiRequest(`/deductions/${id}`, { method: 'DELETE' });
            setDeductions(deductions.filter(d => d.id !== id));
            setSuccess('Deduction deleted successfully!');
        } catch (err) {
            setError('Failed to delete deduction.');
        }
    };

    // ─── Generate report ───
    const handleGenerateReport = async () => {
        if (reportTypes.length === 0) {
            setError('Please select at least one deduction type.');
            return;
        }
        setReportLoading(true);
        setReportData(null);
        try {
            const params = new URLSearchParams({
                companyId: selectedCompanyId,
                month: reportMonth,
                year: reportYear,
                deductionTypes: reportTypes.join(','),
            });
            if (reportDeptIds.length > 0) {
                params.set('departmentIds', reportDeptIds.join(','));
            }
            if (reportEmployeeIds.length > 0) {
                params.set('employeeIds', reportEmployeeIds.join(','));
            }
            const data = await apiRequest(`/deductions/report?${params}`);
            setReportData(data);
        } catch (err) {
            setError('Failed to generate report.');
        } finally {
            setReportLoading(false);
        }
    };

    // ─── Download CSV ───
    const downloadCSV = () => {
        if (!reportData) return;
        const monthLabel = MONTHS.find(m => m.value === parseInt(reportMonth))?.label || reportMonth;

        let csv = `Consolidated Deduction Report - ${monthLabel} ${reportYear}\n\n`;
        csv += 'S.No,Employee Code,Employee Name,Department,Designation,Mess (₹),Stores (₹),EB (₹),Others (₹),Total (₹)\n';

        let sno = 1;
        reportData.reportData.forEach(row => {
            const code = row.curEmployeeCode || row.employeeCode || '';
            csv += `${sno++},${code},${row.employeeName},${row.departmentAcronym || row.departmentName},${row.designationAcronym || row.designationName || ''},${row.Mess.toFixed(2)},${row.Stores.toFixed(2)},${row.EB.toFixed(2)},${row.Others.toFixed(2)},${row.total.toFixed(2)}\n`;
        });

        csv += '\nDepartment Sub-Totals\n';
        csv += ',,,,Department,Mess (₹),Stores (₹),EB (₹),Others (₹),Total (₹)\n';
        reportData.deptTotals.forEach(dt => {
            csv += `,,,,"${dt.departmentAcronym || dt.departmentName}",${dt.Mess.toFixed(2)},${dt.Stores.toFixed(2)},${dt.EB.toFixed(2)},${dt.Others.toFixed(2)},${dt.total.toFixed(2)}\n`;
        });

        const gt = reportData.grandTotal;
        csv += `\n,,,"GRAND TOTAL",${gt.Mess.toFixed(2)},${gt.Stores.toFixed(2)},${gt.EB.toFixed(2)},${gt.Others.toFixed(2)},${gt.total.toFixed(2)}\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Deduction_Report_${monthLabel}_${reportYear}.csv`;
        link.click();
    };

    // ─── Format currency ───
    const formatCurrency = (val) => {
        const num = parseFloat(val) || 0;
        return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    if (loading && companies.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            {/* ─── Header ─── */}
            <div className="mb-6">
                <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-3 mb-2">
                    <span className="text-3xl">💰</span> Deduction Management
                </h1>
                <p className="text-slate-600">Manage monthly deductions — Mess, Stores, EB & Others</p>
            </div>

            {/* ─── Alerts ─── */}
            {success && (
                <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded-lg text-sm font-medium flex items-center gap-2">
                    <span>✅</span> {success}
                </div>
            )}
            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg text-sm font-medium flex items-center gap-2">
                    <span>❌</span> {error}
                </div>
            )}

            {/* ─── Company Selector ─── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                        <select
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* ─── Tab Navigation ─── */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('entry')}
                    className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                        activeTab === 'entry'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    ✏️ Deduction Entry
                </button>
                <button
                    onClick={() => setActiveTab('report')}
                    className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                        activeTab === 'report'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    📊 Consolidated Report
                </button>
            </div>

            {/* ══════════════════════════════════════════════════════
                ENTRY TAB
               ══════════════════════════════════════════════════════ */}
            {activeTab === 'entry' && (
                <>
                    {/* Entry Filters + Add Button */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="min-w-[240px] flex-1 max-w-sm">
                                <EmployeeMultiSelect
                                    label="Employee"
                                    employees={employees}
                                    selected={entryFilterEmps}
                                    onChange={setEntryFilterEmps}
                                    defaultPlaceholder="All Employees"
                                />
                            </div>
                            <div className="min-w-[140px]">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Month</label>
                                <select
                                    value={entryFilterMonth}
                                    onChange={(e) => setEntryFilterMonth(parseInt(e.target.value))}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <div className="min-w-[110px]">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Year</label>
                                <select
                                    value={entryFilterYear}
                                    onChange={(e) => setEntryFilterYear(parseInt(e.target.value))}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="ml-auto">
                                <button
                                    onClick={openAddModal}
                                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <span className="text-lg">+</span> Add Deduction
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Entry Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                                        {['S.No', 'Employee Code', 'Employee Name', 'Department', 'Designation', 'Type', 'Amount (₹)', 'Remarks', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {deductions.length > 0 ? deductions.map((d, idx) => (
                                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-slate-500">{idx + 1}</td>
                                            <td className="px-4 py-3 text-sm font-mono text-slate-700 font-semibold">{d.employee?.curEmployeeCode || d.employee?.newEmployeeCode || '-'}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-slate-800">{d.employee?.firstName}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                                    {d.department?.acronym || d.department?.departmentname}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                                                    d.deductionType === 'Mess' ? 'bg-orange-100 text-orange-700' :
                                                    d.deductionType === 'Stores' ? 'bg-green-100 text-green-700' :
                                                    d.deductionType === 'EB' ? 'bg-sky-100 text-sky-700' :
                                                    d.deductionType === 'Advance' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {d.deductionType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold font-mono text-slate-800">{formatCurrency(d.amount)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{d.remarks || '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => openEditModal(d)}
                                                        className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(d.id)}
                                                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="9" className="px-6 py-12 text-center">
                                                <div className="text-slate-500">
                                                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                    </svg>
                                                    <p className="text-lg font-medium">No deduction entries found</p>
                                                    <p className="text-sm mt-1">Add a new deduction entry to get started</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ══════════════════════════════════════════════════════
                REPORT TAB
               ══════════════════════════════════════════════════════ */}
            {activeTab === 'report' && (
                <>
                    {/* Report Filters */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span>🔍</span> Report Filters
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
                            <MultiSelectDropdown
                                label="Departments"
                                options={(departments || []).map(d => ({ value: d.id, label: d.departmentname || d.name }))}
                                selected={reportDeptIds}
                                onChange={setReportDeptIds}
                            />
                            <EmployeeMultiSelect
                                label="Employees"
                                employees={reportEmployees}
                                selected={reportEmployeeIds}
                                onChange={setReportEmployeeIds}
                                defaultPlaceholder="All Employees"
                            />
                            <MultiSelectDropdown
                                label="Deduction Types"
                                options={DEDUCTION_TYPES}
                                selected={reportTypes}
                                onChange={setReportTypes}
                            />
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Month</label>
                                <select
                                    value={reportMonth}
                                    onChange={(e) => setReportMonth(parseInt(e.target.value))}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Year</label>
                                <select
                                    value={reportYear}
                                    onChange={(e) => setReportYear(parseInt(e.target.value))}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                            <button
                                onClick={() => { setReportDeptIds([]); setReportEmployeeIds([]); setReportTypes([...DEDUCTION_TYPES]); setReportData(null); }}
                                className="px-5 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Reset Filters
                            </button>
                            <button
                                onClick={handleGenerateReport}
                                disabled={reportLoading}
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                            >
                                {reportLoading ? (
                                    <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Generating...</>
                                ) : (
                                    <><span>🔍</span> Generate Report</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Report Table */}
                    {reportData && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <span>📊</span> Consolidated Deduction Report
                                    <span className="text-sm font-normal text-slate-500 ml-2">
                                        {MONTHS.find(m => m.value === parseInt(reportMonth))?.label} {reportYear}
                                    </span>
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={downloadCSV}
                                        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                                    >
                                        📥 Download CSV
                                    </button>
                                </div>
                            </div>

                            {reportData.reportData.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                                                <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider">S.No</th>
                                                <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider">Emp Code</th>
                                                <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider">Employee Name</th>
                                                <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider">Department</th>
                                                <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider">Designation</th>
                                                {reportTypes.includes('Mess') && <th className="px-4 py-3.5 text-right text-xs font-bold text-white uppercase tracking-wider">Mess (₹)</th>}
                                                {reportTypes.includes('Stores') && <th className="px-4 py-3.5 text-right text-xs font-bold text-white uppercase tracking-wider">Stores (₹)</th>}
                                                {reportTypes.includes('EB') && <th className="px-4 py-3.5 text-right text-xs font-bold text-white uppercase tracking-wider">EB (₹)</th>}
                                                {reportTypes.includes('Others') && <th className="px-4 py-3.5 text-right text-xs font-bold text-white uppercase tracking-wider">Others (₹)</th>}
                                                <th className="px-4 py-3.5 text-right text-xs font-bold text-white uppercase tracking-wider">Total (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {/* Employee Rows */}
                                            {reportData.reportData.map((row, idx) => (
                                                <tr key={row.employeeId} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-sm text-slate-500">{idx + 1}</td>
                                                    <td className="px-4 py-3 text-sm font-mono text-slate-700">{row.curEmployeeCode || row.employeeCode}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{row.employeeName}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                                            {row.departmentAcronym}
                                                        </span>
                                                    </td>
                                                    {reportTypes.includes('Mess') && <td className="px-4 py-3 text-sm text-right font-mono">{row.Mess ? formatCurrency(row.Mess) : '—'}</td>}
                                                    {reportTypes.includes('Stores') && <td className="px-4 py-3 text-sm text-right font-mono">{row.Stores ? formatCurrency(row.Stores) : '—'}</td>}
                                                    {reportTypes.includes('EB') && <td className="px-4 py-3 text-sm text-right font-mono">{row.EB ? formatCurrency(row.EB) : '—'}</td>}
                                                    {reportTypes.includes('Others') && <td className="px-4 py-3 text-sm text-right font-mono">{row.Others ? formatCurrency(row.Others) : '—'}</td>}
                                                    <td className="px-4 py-3 text-sm text-right font-mono font-bold text-slate-800">{formatCurrency(row.total)}</td>
                                                </tr>
                                            ))}

                                            {/* Department Sub-Totals */}
                                            {reportData.deptTotals.map(dt => (
                                                <tr key={`dept-${dt.departmentId}`} className="bg-amber-50 border-t-2 border-amber-200">
                                                    <td colSpan="3" className="px-4 py-3 text-sm font-bold text-amber-700 uppercase">Sub-Total</td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-block px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-bold rounded-full">{dt.departmentAcronym}</span>
                                                    </td>
                                                    {reportTypes.includes('Mess') && <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-amber-700">{formatCurrency(dt.Mess)}</td>}
                                                    {reportTypes.includes('Stores') && <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-amber-700">{formatCurrency(dt.Stores)}</td>}
                                                    {reportTypes.includes('EB') && <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-amber-700">{formatCurrency(dt.EB)}</td>}
                                                    {reportTypes.includes('Others') && <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-amber-700">{formatCurrency(dt.Others)}</td>}
                                                    <td className="px-4 py-3 text-sm text-right font-mono font-bold text-amber-800">{formatCurrency(dt.total)}</td>
                                                </tr>
                                            ))}

                                            {/* Grand Total */}
                                            <tr className="bg-slate-800 text-white">
                                                <td colSpan="5" className="px-4 py-3 text-sm font-bold uppercase tracking-wider">Grand Total</td>
                                                {reportTypes.includes('Mess') && <td className="px-4 py-3 text-sm text-right font-mono font-bold">{formatCurrency(reportData.grandTotal.Mess)}</td>}
                                                {reportTypes.includes('Stores') && <td className="px-4 py-3 text-sm text-right font-mono font-bold">{formatCurrency(reportData.grandTotal.Stores)}</td>}
                                                {reportTypes.includes('EB') && <td className="px-4 py-3 text-sm text-right font-mono font-bold">{formatCurrency(reportData.grandTotal.EB)}</td>}
                                                {reportTypes.includes('Others') && <td className="px-4 py-3 text-sm text-right font-mono font-bold">{formatCurrency(reportData.grandTotal.Others)}</td>}
                                                <td className="px-4 py-3 text-sm text-right font-mono font-bold text-amber-300 text-base">{formatCurrency(reportData.grandTotal.total)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-12 text-center text-slate-500">
                                    <p className="text-lg font-medium">No deduction data found</p>
                                    <p className="text-sm mt-1">Try changing the filters and generate again</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ══════════════════════════════════════════════════════
                ADD / EDIT MODAL
               ══════════════════════════════════════════════════════ */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={closeModal}
                            aria-label="Close"
                            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-red-500 hover:text-red-700 text-2xl font-bold transition-all z-10"
                        >×</button>

                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 rounded-t-xl">
                            <h2 className="text-xl font-bold">
                                {editingDeduction ? '✏️ Edit Deduction Entry' : '➕ Add Deduction Entry'}
                            </h2>
                        </div>

                        <form onSubmit={handleFormSubmit} className="p-6">
                            <div className="space-y-4">
                                {/* Employee Multi-Select */}
                                <div>
                                    <EmployeeMultiSelect
                                        label={editingDeduction ? "Employee" : "Select Employee(s)"}
                                        employees={employees}
                                        selected={modalSelectedEmps}
                                        onChange={setModalSelectedEmps}
                                        defaultPlaceholder="-- Select Employee(s) --"
                                        required
                                    />
                                </div>

                                {/* Month & Year */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Month <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.month}
                                            onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                                            required
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Year <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                            required
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Deduction Type & Amount */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Deduction Type <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.deductionType}
                                            onChange={(e) => setFormData({ ...formData, deductionType: e.target.value })}
                                            required
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {DEDUCTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Amount (₹) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            placeholder="0.00"
                                            required
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Remarks */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Remarks</label>
                                    <input
                                        type="text"
                                        value={formData.remarks}
                                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                        placeholder="Optional remarks..."
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Saving...</>
                                    ) : (
                                        editingDeduction ? 'Update Deduction' : 'Save Deduction'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeductionManagement;
