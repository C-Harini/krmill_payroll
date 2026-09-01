import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../utils/apiCaller';



const DEDUCTION_TYPES = ['Mess', 'Stores', 'EB', 'Others'];
const MONTHS = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const currentDate = new Date();
const CURRENT_MONTH = currentDate.getMonth() + 1;
const CURRENT_YEAR = currentDate.getFullYear();

const TYPE_COLORS = {
    Mess: { bg: 'bg-orange-100', text: 'text-orange-700' },
    Stores: { bg: 'bg-green-100', text: 'text-green-700' },
    EB: { bg: 'bg-blue-100', text: 'text-blue-700' },
    Others: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

// ─── Multi-Select Dropdown Component ──────────────────────────────────────────
const MultiSelect = ({ label, options, selected, onChange, required, displayKey = 'label', valueKey = 'value' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value) => {
        if (selected.includes(value)) {
            onChange(selected.filter((v) => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const toggleAll = () => {
        if (selected.length === options.length) {
            onChange([]);
        } else {
            onChange(options.map((o) => o[valueKey]));
        }
    };

    const getSelectedLabels = () => {
        return selected.map((val) => {
            const opt = options.find((o) => o[valueKey] === val);
            return opt ? opt[displayKey] : val;
        });
    };

    return (
        <div className="flex-1 min-w-[200px]" ref={dropdownRef}>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div
                className="relative px-4 py-2.5 border border-slate-300 rounded-lg bg-white cursor-pointer min-h-[42px] flex items-center justify-between focus-within:ring-2 focus-within:ring-blue-500"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex flex-wrap gap-1.5 flex-1 pr-6">
                    {selected.length === 0 ? (
                        <span className="text-slate-400 text-sm">-- Select {label} --</span>
                    ) : selected.length === options.length ? (
                        <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                            All Selected
                        </span>
                    ) : (
                        getSelectedLabels().map((lbl, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                {lbl}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleOption(selected[i]);
                                    }}
                                    className="text-blue-500 hover:text-blue-800 font-bold ml-0.5"
                                >
                                    ×
                                </button>
                            </span>
                        ))
                    )}
                </div>
                <svg className={`w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <polyline points="6 9 12 15 18 9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-auto min-w-[220px] bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {/* Select All */}
                    <div
                        className="px-4 py-2.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100"
                        onClick={toggleAll}
                    >
                        <input
                            type="checkbox"
                            checked={selected.length === options.length}
                            readOnly
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-semibold text-slate-700">Select All</span>
                    </div>
                    {options.map((opt) => (
                        <div
                            key={opt[valueKey]}
                            className="px-4 py-2.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer"
                            onClick={() => toggleOption(opt[valueKey])}
                        >
                            <input
                                type="checkbox"
                                checked={selected.includes(opt[valueKey])}
                                readOnly
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700">{opt[displayKey]}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Main Report Component ────────────────────────────────────────────────────
const DeductionReport = () => {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [departments, setDepartments] = useState([]);

    // Filter states
    const [selectedDeptIds, setSelectedDeptIds] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [month, setMonth] = useState(CURRENT_MONTH);
    const [year, setYear] = useState(CURRENT_YEAR);

    // Report data
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);

    const reportRef = useRef(null);

    // Fetch companies on mount
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const data = await apiRequest('/companies');
                setCompanies(data);
                if (data.length > 0) {
                    setSelectedCompanyId(data[0].id);
                }
            } catch (err) {
                setError('Failed to fetch companies.');
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    // Fetch departments when company changes
    useEffect(() => {
        if (!selectedCompanyId) return;
        const fetchDepartments = async () => {
            try {
                const data = await apiRequest(`/departments?companyId=${selectedCompanyId}`);
                setDepartments(data?.data || []);
            } catch (err) {
                console.error('Failed to fetch departments:', err);
            }
        };
        fetchDepartments();
    }, [selectedCompanyId]);

    const yearOptions = [];
    for (let y = CURRENT_YEAR - 2; y <= CURRENT_YEAR + 1; y++) {
        yearOptions.push(y);
    }

    const handleGenerateReport = async () => {
        if (selectedDeptIds.length === 0 || selectedTypes.length === 0) {
            setError('Please select at least one department and one deduction type.');
            return;
        }

        setError(null);
        setGenerating(true);

        try {
            const params = new URLSearchParams({
                companyId: selectedCompanyId,
                month: month,
                year: year,
                departmentIds: selectedDeptIds.join(','),
                deductionTypes: selectedTypes.join(','),
            });

            const data = await apiRequest(`/deductions/report?${params.toString()}`);
            setReportData(data);
        } catch (err) {
            setError(err.message || 'Failed to generate report.');
        } finally {
            setGenerating(false);
        }
    };

    const resetFilters = () => {
        setSelectedDeptIds([]);
        setSelectedTypes([]);
        setMonth(CURRENT_MONTH);
        setYear(CURRENT_YEAR);
        setReportData(null);
        setError(null);
    };

    // ─── Download as CSV ──────────────────────────────────────────────────────────
    const downloadCSV = () => {
        if (!reportData) return;

        const monthName = MONTHS.find(m => m.value === reportData.month)?.label || reportData.month;
        const headers = ['S.No', 'Staff Name', 'Employee ID', 'Department', 'Mess (₹)', 'Stores (₹)', 'EB (₹)', 'Others (₹)', 'Total (₹)'];
        const rows = [];

        let sno = 1;
        reportData.reportData.forEach((row) => {
            rows.push([
                sno++,
                row.staffName,
                row.employeeId,
                row.departmentAcronym,
                row.Mess || 0,
                row.Stores || 0,
                row.EB || 0,
                row.Others || 0,
                row.total,
            ]);
        });

        // Department sub-totals
        rows.push([]);
        (reportData.deptSubTotals || []).forEach((dept) => {
            rows.push([
                '', 'Sub-Total', '', dept.departmentAcronym,
                dept.Mess, dept.Stores, dept.EB, dept.Others, dept.total,
            ]);
        });

        // Grand total
        rows.push([
            '', 'GRAND TOTAL', '', '',
            reportData.grandTotal.Mess,
            reportData.grandTotal.Stores,
            reportData.grandTotal.EB,
            reportData.grandTotal.Others,
            reportData.grandTotal.total,
        ]);

        const csvContent = [
            `Deduction Report - ${monthName} ${reportData.year}`,
            '',
            headers.join(','),
            ...rows.map((r) => r.join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Deduction_Report_${monthName}_${reportData.year}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // ─── Print / PDF ──────────────────────────────────────────────────────────────
    const handlePrint = () => {
        if (!reportRef.current) return;

        const monthName = MONTHS.find(m => m.value === reportData?.month)?.label || '';
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Deduction Report - ${monthName} ${reportData?.year}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                    h1 { font-size: 20px; margin-bottom: 4px; }
                    h3 { font-size: 14px; color: #666; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { background: #1a5276; color: white; padding: 8px 10px; text-align: left; }
                    th.right, td.right { text-align: right; }
                    td { padding: 6px 10px; border-bottom: 1px solid #ddd; }
                    .subtotal td { background: #fff3e0; font-weight: 600; color: #e67e22; }
                    .grandtotal td { background: #1a5276; color: white; font-weight: 700; }
                    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: #eaf2f8; color: #2471a3; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <h1>💰 Consolidated Deduction Report</h1>
                <h3>${monthName} ${reportData?.year} — ${(reportData?.deptSubTotals || []).map(d => d.departmentAcronym).join(', ')}</h3>
                ${reportRef.current.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    };

    const formatAmount = (val) => {
        const num = parseFloat(val) || 0;
        return num === 0 ? '—' : `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    };

    const formatAmountBold = (val) => {
        const num = parseFloat(val) || 0;
        return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    };

    if (loading && companies.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    const monthName = MONTHS.find(m => m.value === parseInt(month))?.label || '';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-3 mb-2">
                    <span className="text-3xl">📊</span> Deduction Report
                </h1>
                <p className="text-slate-600">Consolidated deduction report with multi-select filters</p>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 font-bold">×</button>
                </div>
            )}

            {/* Company Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                <select
                    value={selectedCompanyId}
                    onChange={(e) => {
                        setSelectedCompanyId(e.target.value);
                        resetFilters();
                    }}
                    className="w-full md:w-1/3 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">-- Select Company --</option>
                    {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Filters Card */}
            {selectedCompanyId && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                        🔍 Report Filters
                    </h2>

                    {/* Row 1: Multi-select Departments & Deduction Types */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 relative">
                        <MultiSelect
                            label="Departments"
                            options={(Array.isArray(departments) ? departments : []).map(d => ({ value: d.id, label: `${d.departmentname} (${d.acronym})` }))}
                            selected={selectedDeptIds}
                            onChange={setSelectedDeptIds}
                            required
                        />
                        <MultiSelect
                            label="Deduction Types"
                            options={DEDUCTION_TYPES.map(t => ({ value: t, label: t }))}
                            selected={selectedTypes}
                            onChange={setSelectedTypes}
                            required
                        />
                    </div>

                    {/* Row 2: Month & Year */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Month <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={month}
                                onChange={(e) => setMonth(parseInt(e.target.value))}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {MONTHS.map((m) => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Year <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={year}
                                onChange={(e) => setYear(parseInt(e.target.value))}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {yearOptions.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                        <button
                            onClick={resetFilters}
                            className="px-6 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Reset Filters
                        </button>
                        <button
                            onClick={handleGenerateReport}
                            disabled={generating || selectedDeptIds.length === 0 || selectedTypes.length === 0}
                            className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {generating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    Generating...
                                </>
                            ) : (
                                <>🔍 Generate Report</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Report Table */}
            {reportData && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    {/* Report Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                📊 Consolidated Deduction Report
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                {MONTHS.find(m => m.value === reportData.month)?.label} {reportData.year} —{' '}
                                {(reportData.deptSubTotals || []).map(d => d.departmentAcronym).join(', ')}
                                {' '}— {reportData.grandTotal?.staffCount || 0} staff members
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={downloadCSV}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download Excel
                            </button>
                            <button
                                onClick={handlePrint}
                                className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Print / PDF
                            </button>
                        </div>
                    </div>

                    {/* Report Table Content */}
                    <div className="overflow-x-auto" ref={reportRef}>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-700 text-white">
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">S.No</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Staff Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Emp ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Department</th>
                                    {selectedTypes.includes('Mess') && <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Mess (₹)</th>}
                                    {selectedTypes.includes('Stores') && <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Stores (₹)</th>}
                                    {selectedTypes.includes('EB') && <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">EB (₹)</th>}
                                    {selectedTypes.includes('Others') && <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Others (₹)</th>}
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Total (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.reportData.length > 0 ? (
                                    <>
                                        {/* Staff Rows */}
                                        {reportData.reportData.map((row, index) => (
                                            <tr key={`${row.staffId}-${row.departmentId}`} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-slate-800">{row.staffName}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600 font-mono">{row.employeeId}</td>
                                                <td className="px-4 py-3">
                                                    <span className="badge inline-block px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                                        {row.departmentAcronym}
                                                    </span>
                                                </td>
                                                {selectedTypes.includes('Mess') && (
                                                    <td className="right px-4 py-3 text-sm text-right font-mono">{formatAmount(row.Mess)}</td>
                                                )}
                                                {selectedTypes.includes('Stores') && (
                                                    <td className="right px-4 py-3 text-sm text-right font-mono">{formatAmount(row.Stores)}</td>
                                                )}
                                                {selectedTypes.includes('EB') && (
                                                    <td className="right px-4 py-3 text-sm text-right font-mono">{formatAmount(row.EB)}</td>
                                                )}
                                                {selectedTypes.includes('Others') && (
                                                    <td className="right px-4 py-3 text-sm text-right font-mono">{formatAmount(row.Others)}</td>
                                                )}
                                                <td className="right px-4 py-3 text-sm text-right font-mono font-bold text-slate-800">
                                                    {formatAmountBold(row.total)}
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Department Sub-Totals */}
                                        {(reportData.deptSubTotals || []).map((dept) => (
                                            <tr key={`sub-${dept.departmentId}`} className="subtotal bg-orange-50 border-b border-orange-200">
                                                <td className="px-4 py-3" colSpan={2}>
                                                    <span className="text-xs font-bold text-orange-600 uppercase">Sub-Total</span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-orange-600 font-semibold">
                                                    {dept.staffCount} staff
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-block px-2.5 py-0.5 bg-orange-200 text-orange-700 text-xs font-bold rounded-full">
                                                        {dept.departmentAcronym}
                                                    </span>
                                                </td>
                                                {selectedTypes.includes('Mess') && (
                                                    <td className="right px-4 py-3 text-sm text-right font-mono font-semibold text-orange-700">{formatAmountBold(dept.Mess)}</td>
                                                )}
                                                {selectedTypes.includes('Stores') && (
                                                    <td className="right px-4 py-3 text-sm text-right font-mono font-semibold text-orange-700">{formatAmountBold(dept.Stores)}</td>
                                                )}
                                                {selectedTypes.includes('EB') && (
                                                    <td className="right px-4 py-3 text-sm text-right font-mono font-semibold text-orange-700">{formatAmountBold(dept.EB)}</td>
                                                )}
                                                {selectedTypes.includes('Others') && (
                                                    <td className="right px-4 py-3 text-sm text-right font-mono font-semibold text-orange-700">{formatAmountBold(dept.Others)}</td>
                                                )}
                                                <td className="right px-4 py-3 text-sm text-right font-mono font-bold text-orange-700">
                                                    {formatAmountBold(dept.total)}
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Grand Total */}
                                        <tr className="grandtotal bg-slate-800">
                                            <td className="px-4 py-4 text-white font-bold uppercase text-xs tracking-wider" colSpan={4}>
                                                Grand Total ({reportData.grandTotal.staffCount} staff)
                                            </td>
                                            {selectedTypes.includes('Mess') && (
                                                <td className="right px-4 py-4 text-right font-mono font-bold text-white">{formatAmountBold(reportData.grandTotal.Mess)}</td>
                                            )}
                                            {selectedTypes.includes('Stores') && (
                                                <td className="right px-4 py-4 text-right font-mono font-bold text-white">{formatAmountBold(reportData.grandTotal.Stores)}</td>
                                            )}
                                            {selectedTypes.includes('EB') && (
                                                <td className="right px-4 py-4 text-right font-mono font-bold text-white">{formatAmountBold(reportData.grandTotal.EB)}</td>
                                            )}
                                            {selectedTypes.includes('Others') && (
                                                <td className="right px-4 py-4 text-right font-mono font-bold text-white">{formatAmountBold(reportData.grandTotal.Others)}</td>
                                            )}
                                            <td className="right px-4 py-4 text-right font-mono font-bold text-yellow-400 text-base">
                                                {formatAmountBold(reportData.grandTotal.total)}
                                            </td>
                                        </tr>
                                    </>
                                ) : (
                                    <tr>
                                        <td colSpan={4 + selectedTypes.length + 1} className="px-6 py-12 text-center">
                                            <div className="text-slate-500">
                                                <svg className="w-12 h-12 mx-auto mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p className="text-lg font-medium">No deduction data found</p>
                                                <p className="text-sm mt-1">No entries exist for the selected filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeductionReport;
