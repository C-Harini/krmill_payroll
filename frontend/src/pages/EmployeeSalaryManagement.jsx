import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, FileText, AlertCircle, Search } from 'lucide-react';
import { apiRequest } from '../utils/apiCaller';



const orderComponents = (components) => {
    if (!components || !Array.isArray(components)) return [];
    const basicIndex = components.findIndex(comp => 
        comp.componentCode === 'BASIC' || 
        comp.componentName?.toLowerCase() === 'basic pay' || 
        comp.componentName?.toLowerCase() === 'basic'
    );
    if (basicIndex > -1) {
        const basicComp = components[basicIndex];
        const otherComps = components.filter((_, idx) => idx !== basicIndex);
        return [basicComp, ...otherComps];
    }
    return components;
};

const EmployeeSelector = ({ employees, selectedIds, onChange }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handleOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handleKey = (e) => {
            if (e.key === "Escape") {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [open]);

    const filtered = employees.filter(
        (e) =>
            !search ||
            `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase().includes(search.toLowerCase()) ||
            (e.employeeCode || '').toLowerCase().includes(search.toLowerCase())
    );

    const isAllSelected =
        selectedIds.length === employees.length && employees.length > 0;
    const toggleAll = () =>
        onChange(isAllSelected ? [] : employees.map((e) => e.id));
    const toggle = (id) =>
        onChange(
            selectedIds.includes(id)
                ? selectedIds.filter((x) => x !== id)
                : [...selectedIds, id]
        );

    const label =
        selectedIds.length === 0 || isAllSelected
            ? "All employees"
            : `${selectedIds.length} employee${selectedIds.length > 1 ? "s" : ""} selected`;

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-h-[38px]"
            >
                <span
                    className={
                        selectedIds.length === 0 || isAllSelected
                            ? "text-gray-400"
                            : "text-gray-800 font-medium"
                    }
                >
                    {label}
                </span>
                <span className="text-gray-400 text-xs ml-2 shrink-0">
                    {open ? "▲" : "▼"}
                </span>
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg max-h-72 flex flex-col">
                    <div className="p-2 border-b border-gray-100">
                        <input
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name or code..."
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div
                        className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-100 select-none"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={toggleAll}
                    >
                        <input
                            type="checkbox"
                            readOnly
                            checked={isAllSelected}
                            className="rounded pointer-events-none"
                        />
                        <span className="font-semibold text-slate-700">All employees</span>
                        <span className="ml-auto text-xs text-gray-400">
                            {employees.length} total
                        </span>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {filtered.map((emp) => (
                            <div
                                key={emp.id}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer select-none"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => toggle(emp.id)}
                            >
                                <input
                                    type="checkbox"
                                    readOnly
                                    checked={selectedIds.includes(emp.id)}
                                    className="rounded pointer-events-none"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">
                                        {emp.firstName} {emp.lastName || ''}
                                    </p>
                                    <p className="text-xs text-gray-400">{emp.employeeCode}</p>
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <p className="text-center text-gray-400 text-sm py-4">
                                No employees found
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const EmployeeSingleSelector = ({ employees, selectedId, onChange, disabled }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handleOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handleKey = (e) => {
            if (e.key === "Escape") {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [open]);

    const filtered = employees.filter(
        (e) =>
            !search ||
            `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase().includes(search.toLowerCase()) ||
            (e.employeeCode || '').toLowerCase().includes(search.toLowerCase())
    );

    const selectedEmp = employees.find(e => e.id === parseInt(selectedId));
    const label = selectedEmp
        ? `${selectedEmp.firstName} ${selectedEmp.lastName || ''} (${selectedEmp.employeeCode})`
        : "Select Employee";

    const handleSelect = (id) => {
        onChange(id);
        setOpen(false);
        setSearch("");
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-h-[38px] disabled:opacity-50"
            >
                <span
                    className={
                        !selectedEmp
                            ? "text-gray-400"
                            : "text-gray-800 font-medium"
                    }
                >
                    {label}
                </span>
                <span className="text-gray-400 text-xs ml-2 shrink-0">
                    {open ? "▲" : "▼"}
                </span>
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg max-h-72 flex flex-col">
                    <div className="p-2 border-b border-gray-100">
                        <input
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name or code..."
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {filtered.map((emp) => (
                            <div
                                key={emp.id}
                                className={`flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 cursor-pointer select-none text-sm ${parseInt(selectedId) === emp.id ? 'bg-blue-50 font-semibold text-blue-900' : 'text-slate-700'}`}
                                onClick={() => handleSelect(emp.id)}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">
                                        {emp.firstName} {emp.lastName || ''}
                                    </p>
                                    <p className="text-xs text-gray-400">{emp.employeeCode}</p>
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <p className="text-center text-gray-400 text-sm py-4">
                                No employees found
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const EmployeeSalaryManagement = () => {
    const [companies, setCompanies] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [salaryComponents, setSalaryComponents] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [isRevisionMode, setIsRevisionMode] = useState(false);
    const [currentSalary, setCurrentSalary] = useState(null);
    const [viewHistoryModal, setViewHistoryModal] = useState(false);
    const [salaryHistory, setSalaryHistory] = useState([]);
    const [bulkUploadFile, setBulkUploadFile] = useState(null);
    const [bulkUploadResults, setBulkUploadResults] = useState(null);

    const [formData, setFormData] = useState({
        employeeId: '',
        effectiveFrom: new Date().toISOString().split('T')[0],
        revisionType: 'Initial',
        revisionPercentage: '',
        reason: '',
        remarks: '',
        components: []
    });

    // Fetch companies
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

    // Fetch employees, components and salaries when company changes
    useEffect(() => {
        if (!selectedCompanyId) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [employeesData, componentsData, salariesData] = await Promise.all([
                    apiRequest(`/employees?companyId=${selectedCompanyId}`),
                    apiRequest(`/salary-components?companyId=${selectedCompanyId}&status=Active`),
                    apiRequest(`/employee-salary?companyId=${selectedCompanyId}`)
                ]);

                setEmployees(employeesData);
                setSalaryComponents(componentsData);
                setSalaries(salariesData);
            } catch (err) {
                setError(err.message);
                console.error('Fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedCompanyId]);

    const handleCompanyChange = (e) => {
        setSelectedCompanyId(e.target.value);
        setSelectedEmployeeIds([]);
    };

    const handleEmployeeFilter = (e) => {
        setSelectedEmployeeId(e.target.value);
    };

    const openAssignModal = () => {
        setIsRevisionMode(false);
        setCurrentSalary(null);

        setFormData({
            employeeId: '',
            effectiveFrom: new Date().toISOString().split('T')[0],
            revisionType: 'Initial',
            revisionPercentage: '',
            reason: '',
            remarks: '',
            components: orderComponents(salaryComponents.map(comp => ({
                componentId: comp.id,
                componentName: comp.name,
                componentCode: comp.code,
                componentType: comp.type,
                valueType: comp.calculationType,
                fixedAmount: '',
                percentageValue: comp.calculationType === 'Percentage' ? comp.percentage : '',
                percentageBase: 'BASIC',
                formula: comp.calculationType === 'Formula' ? comp.formula : null
            })))
        });
        setIsModalOpen(true);
    };

    const openBulkUploadModal = () => {
        setBulkUploadFile(null);
        setBulkUploadResults(null);
        setIsBulkUploadOpen(true);
    };

    const downloadTemplate = () => {
        const headers = ['EmployeeCode', 'EmployeeId', 'Daily_Wages'];

        salaryComponents.forEach(comp => {
            if (comp.calculationType === 'Fixed') {
                headers.push(`${comp.code}_Amount`);
            } else if (comp.calculationType === 'Percentage') {
                headers.push(`${comp.code}_Percentage`);
                headers.push(`${comp.code}_Base`);
            }
        });

        headers.push('Remarks');

        // Sample 1: Daily Wage Worker (per-day rate entered in Daily_Wages)
        const sampleRow1 = ['EMP001', '1', '577.00'];
        salaryComponents.forEach(comp => {
            if (comp.calculationType === 'Fixed') {
                sampleRow1.push('');
            } else if (comp.calculationType === 'Percentage') {
                sampleRow1.push('');
                sampleRow1.push('BASIC');
            }
        });
        sampleRow1.push('Daily worker - ₹577/day');

        // Sample 2: Monthly Staff (Daily_Wages left blank, components filled)
        const sampleRow2 = ['EMP002', '2', ''];
        salaryComponents.forEach(comp => {
            if (comp.calculationType === 'Fixed') {
                sampleRow2.push(comp.code === 'BASIC' ? '30000' : '');
            } else if (comp.calculationType === 'Percentage') {
                sampleRow2.push(comp.percentage || '40');
                sampleRow2.push('BASIC');
            }
        });
        sampleRow2.push('Monthly staff');

        const csvContent = [headers.join(','), sampleRow1.join(','), sampleRow2.join(',')].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'salary_bulk_upload_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setBulkUploadFile(file);
        }
    };

    const processBulkUpload = async () => {
        if (!bulkUploadFile) {
            alert('Please select a file first');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const rows = text.split('\n').map(row => row.trim()).filter(row => row);
                const headers = rows[0].split(',').map(h => h.trim());

                const salaryData = [];

                for (let i = 1; i < rows.length; i++) {
                    const values = rows[i].split(',').map(v => v.trim());
                    const rowData = {};

                    headers.forEach((header, index) => {
                        rowData[header] = values[index];
                    });

                    // Daily wage rate if entered
                    const rawDaily = rowData.Daily_Wages || rowData.Daily_Wage || rowData.DailyWages || rowData.Wages_Per_Day;
                    const dailyWages = rawDaily && !isNaN(parseFloat(rawDaily)) ? parseFloat(rawDaily) : null;

                    const components = [];
                    salaryComponents.forEach(comp => {
                        if (comp.calculationType === 'Fixed') {
                            const amountKey = `${comp.code}_Amount`;
                            if (rowData[amountKey] && !isNaN(parseFloat(rowData[amountKey]))) {
                                components.push({
                                    componentId: comp.id,
                                    valueType: 'Fixed',
                                    fixedAmount: parseFloat(rowData[amountKey])
                                });
                            }
                        } else if (comp.calculationType === 'Percentage') {
                            const percentageKey = `${comp.code}_Percentage`;
                            const baseKey = `${comp.code}_Base`;
                            if (rowData[percentageKey] && !isNaN(parseFloat(rowData[percentageKey]))) {
                                components.push({
                                    componentId: comp.id,
                                    valueType: 'Percentage',
                                    percentageValue: parseFloat(rowData[percentageKey]),
                                    percentageBase: rowData[baseKey] || 'BASIC'
                                });
                            }
                        } else if (comp.calculationType === 'Formula') {
                            components.push({
                                componentId: comp.id,
                                valueType: 'Formula',
                                formula: comp.formula
                            });
                        }
                    });

                    // If daily wages is entered and components don't have BASIC / SPL explicitly defined, auto-add them
                    if (dailyWages && dailyWages > 0) {
                        const hasBasic = components.some(c => {
                            const found = salaryComponents.find(sc => sc.id === c.componentId);
                            return found && (found.code === 'BASIC' || found.name.toLowerCase().includes('basic'));
                        });
                        const hasSpl = components.some(c => {
                            const found = salaryComponents.find(sc => sc.id === c.componentId);
                            return found && (found.code === 'SPECIAL_ALLOWANCE' || found.code === 'SPL' || found.name.toLowerCase().includes('special'));
                        });

                        if (!hasBasic) {
                            const basicDef = salaryComponents.find(sc => sc.code === 'BASIC' || sc.name.toLowerCase().includes('basic'));
                            if (basicDef) {
                                components.push({
                                    componentId: basicDef.id,
                                    valueType: 'Fixed',
                                    fixedAmount: parseFloat((dailyWages * 0.6).toFixed(2))
                                });
                            }
                        }

                        if (!hasSpl) {
                            const splDef = salaryComponents.find(sc => sc.code === 'SPECIAL_ALLOWANCE' || sc.code === 'SPL' || sc.name.toLowerCase().includes('special'));
                            if (splDef) {
                                components.push({
                                    componentId: splDef.id,
                                    valueType: 'Fixed',
                                    fixedAmount: parseFloat((dailyWages * 0.4).toFixed(2))
                                });
                            }
                        }
                    }

                    salaryData.push({
                        employeeCode: rowData.EmployeeCode,
                        employeeId: rowData.EmployeeId ? parseInt(rowData.EmployeeId) : null,
                        dailyWages: dailyWages,
                        components,
                        remarks: rowData.Remarks || (dailyWages ? `Daily wage: ₹${dailyWages}/day` : 'Bulk upload')
                    });
                }

                const payload = {
                    companyId: parseInt(selectedCompanyId),
                    effectiveFrom: new Date().toISOString().split('T')[0],
                    salaryData,
                    createdBy: 1
                };

                const result = await apiRequest('/employee-salary/bulk-assign', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                setBulkUploadResults(result);

                const salariesData = await apiRequest(`/employee-salary?companyId=${selectedCompanyId}`);
                setSalaries(salariesData);

            } catch (error) {
                console.error('Bulk upload error:', error);
                alert('Error processing file: ' + error.message);
            }
        };

        reader.readAsText(bulkUploadFile);
    };

    const openEditModal = async (salary) => {
        try {
            const salaryDetails = await apiRequest(`/employee-salary/current/${salary.employeeId}`);
            setCurrentSalary(salaryDetails);
            setIsRevisionMode(false);

            setFormData({
                employeeId: salary.employeeId,
                effectiveFrom: salary.effectiveFrom.split('T')[0],
                revisionType: salary.revisionType,
                revisionPercentage: salary.revisionPercentage || '',
                reason: '',
                remarks: salary.remarks || '',
                components: salaryDetails.EmployeeSalaryComponents.map(comp => ({
                    componentId: comp.componentId,
                    componentName: comp.componentName,
                    componentCode: comp.componentCode,
                    componentType: comp.componentType,
                    valueType: comp.valueType,
                    fixedAmount: comp.fixedAmount || '',
                    percentageValue: comp.percentageValue || '',
                    percentageBase: comp.percentageBase || 'BASIC',
                    formula: comp.formulaExpression || null
                }))
            });
            setIsModalOpen(true);
        } catch (err) {
            console.error('Edit modal error:', err);
            window.alert('Error loading salary details: ' + err.message);
        }
    };

    const openRevisionModal = async (employeeId) => {
        try {
            const currentSalaryData = await apiRequest(`/employee-salary/current/${employeeId}`);
            setCurrentSalary(currentSalaryData);
            setIsRevisionMode(true);

            setFormData({
                employeeId: employeeId,
                effectiveFrom: new Date().toISOString().split('T')[0],
                revisionType: 'Annual_Hike',
                revisionPercentage: '',
                reason: '',
                remarks: '',
                components: currentSalaryData.EmployeeSalaryComponents.map(comp => ({
                    componentId: comp.componentId,
                    componentName: comp.componentName,
                    componentCode: comp.componentCode,
                    componentType: comp.componentType,
                    valueType: comp.valueType,
                    fixedAmount: comp.fixedAmount || '',
                    percentageValue: comp.percentageValue || '',
                    percentageBase: comp.percentageBase || 'BASIC',
                    formula: comp.formulaExpression || null
                }))
            });
            setIsModalOpen(true);
        } catch (err) {
            console.error('Revision modal error:', err);
            window.alert(err.message);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsRevisionMode(false);
        setCurrentSalary(null);
    };

    const closeBulkUploadModal = () => {
        setIsBulkUploadOpen(false);
        setBulkUploadFile(null);
        setBulkUploadResults(null);
    };

    const handleComponentChange = (index, field, value) => {
        const updatedComponents = [...formData.components];
        updatedComponents[index][field] = value;

        if (field === 'valueType') {
            updatedComponents[index].fixedAmount = '';
            updatedComponents[index].percentageValue = '';
            updatedComponents[index].formula = null;
        }

        setFormData({ ...formData, components: updatedComponents });
    };

    const calculatePreview = () => {
        let basic = 0;
        let gross = 0;
        let deductions = 0;
        const componentValues = {};

        formData.components.forEach(comp => {
            if (comp.valueType === 'Fixed' && comp.fixedAmount) {
                componentValues[comp.componentCode] = parseFloat(comp.fixedAmount);
                if (comp.componentCode === 'BASIC' || comp.componentName.toLowerCase().includes('basic')) {
                    basic = parseFloat(comp.fixedAmount);
                }
            }
        });

        formData.components.forEach(comp => {
            if (comp.valueType === 'Percentage' && comp.percentageValue && comp.percentageBase) {
                const baseValue = componentValues[comp.percentageBase] || 0;
                componentValues[comp.componentCode] = (baseValue * parseFloat(comp.percentageValue)) / 100;
            }
        });

        formData.components.forEach(comp => {
            if (comp.valueType === 'Formula' && comp.formula) {
                try {
                    let expression = comp.formula;
                    Object.keys(componentValues).forEach(code => {
                        const regex = new RegExp(`\\b${code}\\b`, 'g');
                        expression = expression.replace(regex, componentValues[code]);
                    });
                    const result = new Function(`return ${expression}`)();
                    componentValues[comp.componentCode] = parseFloat(result) || 0;
                } catch (error) {
                    console.error('Formula evaluation error:', error);
                    componentValues[comp.componentCode] = 0;
                }
            }
        });

        formData.components.forEach(comp => {
            const amount = componentValues[comp.componentCode] || 0;
            if (comp.componentType === 'Earning') {
                gross += amount;
            } else if (comp.componentType === 'Deduction') {
                deductions += amount;
            }
        });

        const net = gross - deductions;
        const ctcAnnual = gross * 12;

        return { basic, gross, deductions, net, ctcAnnual };
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (!formData.employeeId) {
            window.alert('Please select an employee');
            return;
        }

        try {
            const payload = {
                employeeId: parseInt(formData.employeeId),
                companyId: parseInt(selectedCompanyId),
                effectiveFrom: formData.effectiveFrom,
                components: formData.components.map(comp => ({
                    componentId: comp.componentId,
                    valueType: comp.valueType,
                    fixedAmount: comp.valueType === 'Fixed' ? parseFloat(comp.fixedAmount) || 0 : null,
                    percentageValue: comp.valueType === 'Percentage' ? parseFloat(comp.percentageValue) || 0 : null,
                    percentageBase: comp.valueType === 'Percentage' ? comp.percentageBase : null,
                    formula: comp.valueType === 'Formula' ? comp.formula : null,
                    remarks: comp.remarks || null
                })).filter(comp => {
                    if (comp.valueType === 'Fixed') return comp.fixedAmount > 0;
                    if (comp.valueType === 'Percentage') return comp.percentageValue > 0;
                    if (comp.valueType === 'Formula') return comp.formula !== null;
                    return false;
                }),
                remarks: formData.remarks,
                createdBy: 1
            };

            if (isRevisionMode) {
                payload.revisionType = formData.revisionType;
                payload.revisionPercentage = formData.revisionPercentage ? parseFloat(formData.revisionPercentage) : null;
                payload.reason = formData.reason;

                await apiRequest('/employee-salary/revise', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                window.alert('Salary revised successfully!');
            } else if (currentSalary && currentSalary.id) {
                payload.updatedBy = 1;

                await apiRequest(`/employee-salary/${currentSalary.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                window.alert('Salary updated successfully!');
            } else {
                await apiRequest('/employee-salary/assign', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                window.alert('Salary assigned successfully!');
            }

            const salariesData = await apiRequest(`/employee-salary?companyId=${selectedCompanyId}`);
            setSalaries(salariesData);

            closeModal();
        } catch (err) {
            console.error('Form submit error:', err);
            window.alert(err.message);
        }
    };

    const handleDelete = async (salaryId) => {
        if (!window.confirm('Are you sure you want to delete this salary structure?')) {
            return;
        }

        try {
            await apiRequest(`/employee-salary/${salaryId}`, { method: 'DELETE' });
            const salariesData = await apiRequest(`/employee-salary?companyId=${selectedCompanyId}`);
            setSalaries(salariesData);
            window.alert('Salary structure deleted successfully!');
        } catch (err) {
            console.error('Delete error:', err);
            window.alert('Error deleting salary: ' + err.message);
        }
    };

    const viewHistory = async (employeeId) => {
        try {
            const history = await apiRequest(`/employee-salary/history/${employeeId}`);
            setSalaryHistory(history);
            setViewHistoryModal(true);
        } catch (err) {
            console.error('History error:', err);
            window.alert('Error fetching history: ' + err.message);
        }
    };

    const preview = calculatePreview();
    const filteredSalaries = selectedEmployeeIds.length > 0
        ? salaries.filter(s => selectedEmployeeIds.includes(s.employeeId))
        : salaries;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-lg text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">💰 Employee Salary Management</h1>
                <p className="text-gray-600">Assign and manage employee salary structures</p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Company</label>
                        <select
                            value={selectedCompanyId}
                            onChange={handleCompanyChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Company</option>
                            {companies.map(company => (
                                <option key={company.id} value={company.id}>{company.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Employee</label>
                        <EmployeeSelector
                            employees={employees}
                            selectedIds={selectedEmployeeIds}
                            onChange={setSelectedEmployeeIds}
                        />
                    </div>

                    <div className="flex flex-col justify-end gap-3">
                        <button
                            onClick={openAssignModal}
                            disabled={!selectedCompanyId}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            + Assign Salary
                        </button>
                        <button
                            onClick={openBulkUploadModal}
                            disabled={!selectedCompanyId}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Upload size={16} />
                            Bulk Upload
                        </button>
                    </div>
                </div>
            </div>

            {/* Salaries Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Employee</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Code</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Effective From</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Basic</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Gross</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Net</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">CTC (Annual)</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Revision Type</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                                <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredSalaries.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                                        {selectedCompanyId
                                            ? 'No salary structures found. Click "Assign Salary" to add one.'
                                            : 'Please select a company to view salary structures.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredSalaries.map((salary, index) => (
                                    <tr key={salary.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                        <td className="px-6 py-4 text-sm text-gray-700">{salary.Employee?.firstName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{salary.Employee?.employeeCode}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{new Date(salary.effectiveFrom).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-800">₹{parseFloat(salary.basicSalary).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-green-700">₹{parseFloat(salary.grossSalary).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-blue-700">₹{parseFloat(salary.netSalary).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-orange-700">₹{parseFloat(salary.ctcAnnual).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{salary.revisionType.replace('_', ' ')}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={salary.status === 'Active'
                                                ? 'px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300'
                                                : 'px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300'
                                            }>
                                                {salary.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button
                                                    onClick={() => openEditModal(salary)}
                                                    className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-sm transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Edit"
                                                    disabled={salary.status !== 'Active'}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => openRevisionModal(salary.employeeId)}
                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Revise Salary"
                                                    disabled={salary.status !== 'Active'}
                                                >
                                                    📈
                                                </button>
                                                <button
                                                    onClick={() => viewHistory(salary.employeeId)}
                                                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition duration-200"
                                                    title="View History"
                                                >
                                                    📜
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(salary.id)}
                                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition duration-200"
                                                    title="Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bulk Upload Modal */}
            {isBulkUploadOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 border-b border-blue-800 flex justify-between items-center">
                            <h2 className="flex items-center gap-2 text-xl font-bold">
                                <Upload size={24} />
                                Bulk Salary Upload
                            </h2>
                            <button onClick={closeBulkUploadModal} className="text-white hover:text-gray-200 text-2xl">✕</button>
                        </div>

                        <div className="p-6">
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
                                <h3 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                                    <AlertCircle size={20} />
                                    Instructions
                                </h3>
                                <ol className="text-sm text-gray-700 space-y-2 ml-4">
                                    <li>1. Download the CSV template using the button below.</li>
                                    <li>2. <strong>For Daily Wage Workers:</strong> Enter their per-day wage rate in the <code className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">Daily_Wages</code> column (e.g. 577). The 60% Basic & 40% Special Allowance will be auto-calculated.</li>
                                    <li>3. <strong>For Monthly Staff:</strong> Leave <code className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">Daily_Wages</code> blank and fill the component columns (e.g. BASIC_Amount, HRA_Amount).</li>
                                    <li>4. Formula components are auto-calculated (no input needed).</li>
                                    <li>5. Upload the completed CSV file below.</li>
                                </ol>
                            </div>

                            <button
                                onClick={downloadTemplate}
                                className="w-full mb-6 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition duration-200 flex items-center justify-center gap-2"
                            >
                                <Download size={16} />
                                Download CSV Template
                            </button>

                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                                <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="bulk-upload-input"
                                />
                                <label
                                    htmlFor="bulk-upload-input"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg cursor-pointer inline-block transition duration-200"
                                >
                                    Select CSV File
                                </label>
                                {bulkUploadFile && (
                                    <p className="mt-4 text-sm font-semibold text-green-700">
                                        Selected: {bulkUploadFile.name}
                                    </p>
                                )}
                            </div>

                            {bulkUploadResults && (
                                <div className={`mt-6 p-4 rounded ${bulkUploadResults.failed > 0 ? 'bg-amber-50 border-l-4 border-amber-500' : 'bg-green-50 border-l-4 border-green-500'}`}>
                                    <h3 className="font-bold mb-3 text-gray-800">Upload Results</h3>
                                    <p className="text-sm text-gray-700 mb-2"><strong>Successful:</strong> {bulkUploadResults.successful}</p>
                                    <p className="text-sm text-gray-700"><strong>Failed:</strong> {bulkUploadResults.failed}</p>

                                    {bulkUploadResults.details.failed.length > 0 && (
                                        <div className="mt-4">
                                            <h4 className="font-semibold text-gray-800 mb-2">Failed Records:</h4>
                                            <ul className="text-sm text-red-700 space-y-1 ml-4">
                                                {bulkUploadResults.details.failed.map((fail, idx) => (
                                                    <li key={idx}>
                                                        {fail.data.employeeCode || fail.data.employeeId}: {fail.error}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                                <button type="button" onClick={closeBulkUploadModal} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition duration-200">
                                    Close
                                </button>
                                <button
                                    onClick={processBulkUpload}
                                    disabled={!bulkUploadFile}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Process Upload
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 border-b border-blue-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold">
                                {isRevisionMode ? '📈 Revise Salary' : currentSalary ? '✏️ Edit Salary' : '➕ Assign Salary'}
                            </h2>
                            <button onClick={closeModal} className="text-white hover:text-gray-200 text-2xl">✕</button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="p-6">
                            {/* Basic Info */}
                            <div className={`grid gap-4 mb-6 bg-gray-50 p-4 rounded-lg ${isRevisionMode ? 'grid-cols-4' : 'grid-cols-2'}`}>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Employee *</label>
                                    <EmployeeSingleSelector
                                        employees={employees}
                                        selectedId={formData.employeeId}
                                        onChange={val => setFormData({ ...formData, employeeId: val })}
                                        disabled={isRevisionMode || !!currentSalary}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Effective From *</label>
                                    <input
                                        type="date"
                                        value={formData.effectiveFrom}
                                        onChange={e => setFormData({ ...formData, effectiveFrom: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {isRevisionMode && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Revision Type *</label>
                                            <select
                                                value={formData.revisionType}
                                                onChange={e => setFormData({ ...formData, revisionType: e.target.value })}
                                                required
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="Annual_Hike">Annual Hike</option>
                                                <option value="Promotion">Promotion</option>
                                                <option value="Special_Increment">Special Increment</option>
                                                <option value="Correction">Correction</option>
                                                <option value="Transfer">Transfer</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Revision %</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.revisionPercentage}
                                                onChange={e => setFormData({ ...formData, revisionPercentage: e.target.value })}
                                                placeholder="e.g., 10.50"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Salary Components */}
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">Salary Components</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead className="bg-gray-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Component</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Code</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Type</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Calculation</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Value / Formula</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Base (for %)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {formData.components.map((comp, index) => (
                                                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{comp.componentName}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <code className="bg-gray-200 px-2 py-1 rounded text-xs">{comp.componentCode}</code>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${comp.componentType === 'Earning'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {comp.componentType}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <select
                                                            value={comp.valueType}
                                                            onChange={e => handleComponentChange(index, 'valueType', e.target.value)}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            <option value="Fixed">Fixed</option>
                                                            <option value="Percentage">Percentage</option>
                                                            <option value="Formula">Formula</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {comp.valueType === 'Fixed' && (
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={comp.fixedAmount}
                                                                onChange={e => handleComponentChange(index, 'fixedAmount', e.target.value)}
                                                                placeholder="Amount"
                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                        {comp.valueType === 'Percentage' && (
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={comp.percentageValue}
                                                                onChange={e => handleComponentChange(index, 'percentageValue', e.target.value)}
                                                                placeholder="%"
                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        )}
                                                        {comp.valueType === 'Formula' && (
                                                            <div className="text-xs">
                                                                <div className="bg-gray-100 px-2 py-1 rounded border border-gray-300 font-mono">
                                                                    {comp.formula || 'No formula'}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {comp.valueType === 'Percentage' && (
                                                            <select
                                                                value={comp.percentageBase}
                                                                onChange={e => handleComponentChange(index, 'percentageBase', e.target.value)}
                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            >
                                                                <option value="BASIC">BASIC</option>
                                                                <option value="GROSS">GROSS</option>
                                                                {formData.components
                                                                    .filter(c => c.componentType === 'Earning')
                                                                    .map(c => (
                                                                        <option key={c.componentCode} value={c.componentCode}>
                                                                            {c.componentCode}
                                                                        </option>
                                                                    ))
                                                                }
                                                            </select>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Preview Section */}
                            {preview && (
                                <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-2 border-blue-300">
                                    <h3 className="text-lg font-bold text-blue-900 mb-4">Salary Preview</h3>
                                    <div className="grid grid-cols-5 gap-4">
                                        <div>
                                            <div className="text-xs text-gray-600 mb-1">Basic Salary</div>
                                            <div className="text-2xl font-bold text-blue-900">
                                                ₹{preview.basic.toLocaleString()}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-600 mb-1">Gross Salary</div>
                                            <div className="text-2xl font-bold text-green-700">
                                                ₹{preview.gross.toLocaleString()}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-600 mb-1">Deductions</div>
                                            <div className="text-2xl font-bold text-red-700">
                                                ₹{preview.deductions.toLocaleString()}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-600 mb-1">Net Salary</div>
                                            <div className="text-2xl font-bold text-purple-700">
                                                ₹{preview.net.toLocaleString()}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-600 mb-1">Annual CTC</div>
                                            <div className="text-2xl font-bold text-orange-700">
                                                ₹{preview.ctcAnnual.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition duration-200">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition duration-200">
                                    {isRevisionMode ? 'Apply Revision' : 'Assign Salary'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {viewHistoryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 border-b border-blue-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Salary History</h2>
                            <button onClick={() => setViewHistoryModal(false)} className="text-white hover:text-gray-200 text-2xl">✕</button>
                        </div>

                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Effective From</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Effective To</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Revision Type</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Basic</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Gross</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Net</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">CTC (Annual)</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-300">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {salaryHistory.map((history, index) => (
                                            <tr key={history.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                <td className="px-4 py-3 text-sm text-gray-700">{new Date(history.effectiveFrom).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{history.effectiveTo ? new Date(history.effectiveTo).toLocaleDateString() : 'Present'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{history.revisionType.replace('_', ' ')}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-800">₹{parseFloat(history.basicSalary).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-800">₹{parseFloat(history.grossSalary).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-800">₹{parseFloat(history.netSalary).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-800">₹{parseFloat(history.ctcAnnual).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={history.status === 'Active'
                                                        ? 'px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300'
                                                        : 'px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300'
                                                    }>
                                                        {history.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeSalaryManagement;
