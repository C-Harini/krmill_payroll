import React, { useState, useEffect } from 'react';

const EmployeeDocuments = () => {
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    aadhaarNumber: '',
    passportNumber: '',
    voterIdNumber: '',
    drivingLicenseNumber: '',
    panNumber: '',
    aadhaarDocument: null,
    passportDocument: null,
    voterIdDocument: null,
    drivingLicenseDocument: null,
    panDocument: null,
  });

  const apiUrl = import.meta.env.VITE_API_URL;

  // ── Fetch companies ──────────────────────────────────────────
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${apiUrl}/companies`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCompanies(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
      }
    };
    fetchCompanies();
  }, []);

  // ── Fetch departments when company changes ───────────────────
  useEffect(() => {
    if (!selectedCompanyId) {
      setDepartments([]);
      setSelectedDepartmentId('');
      setEmployees([]);
      setSelectedEmployeeId('');
      setSelectedEmployee(null);
      return;
    }
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${apiUrl}/departments?companyId=${selectedCompanyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setDepartments(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    fetchDepartments();
  }, [selectedCompanyId]);

  // ── Fetch employees when department changes ──────────────────
  useEffect(() => {
    if (!selectedDepartmentId || !selectedCompanyId) {
      setEmployees([]);
      setSelectedEmployeeId('');
      setSelectedEmployee(null);
      return;
    }
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(
          `${apiUrl}/employees?companyId=${selectedCompanyId}&departmentId=${selectedDepartmentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setEmployees(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
      }
    };
    fetchEmployees();
  }, [selectedDepartmentId]);

  // ── Fetch full employee with documents when selected ─────────
  useEffect(() => {
    if (!selectedEmployeeId) {
      setSelectedEmployee(null);
      setFormData({
        aadhaarNumber: '',
        passportNumber: '',
        voterIdNumber: '',
        drivingLicenseNumber: '',
        panNumber: '',
        aadhaarDocument: null,
        passportDocument: null,
        voterIdDocument: null,
        drivingLicenseDocument: null,
        panDocument: null,
      });
      return;
    }

    const fetchEmployeeWithDocuments = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${apiUrl}/employees/${selectedEmployeeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const emp = await res.json();
          setSelectedEmployee(emp);
          const docs = emp.documents || {};
          setFormData({
            aadhaarNumber:        docs.aadhaarNumber        || '',
            passportNumber:       docs.passportNumber       || '',
            voterIdNumber:        docs.voterIdNumber        || '',
            drivingLicenseNumber: docs.drivingLicenseNumber || '',
            panNumber:            docs.panNumber            || '',
            aadhaarDocument:        null,
            passportDocument:       null,
            voterIdDocument:        null,
            drivingLicenseDocument: null,
            panDocument:            null,
          });
        }
      } catch (err) {
        console.error('Error fetching employee documents:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeWithDocuments();
  }, [selectedEmployeeId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (field, file) => {
    setFormData((prev) => ({ ...prev, [field]: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      setErrorMsg('Please select an employee first.');
      return;
    }
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const token = localStorage.getItem('authToken');
      const payload = new FormData();

      payload.append('aadhaarNumber',        formData.aadhaarNumber        || '');
      payload.append('passportNumber',       formData.passportNumber       || '');
      payload.append('voterIdNumber',        formData.voterIdNumber        || '');
      payload.append('drivingLicenseNumber', formData.drivingLicenseNumber || '');
      payload.append('panNumber',            formData.panNumber            || '');

      ['aadhaarDocument', 'passportDocument', 'voterIdDocument', 'drivingLicenseDocument', 'panDocument']
        .forEach((field) => {
          if (formData[field] instanceof File) payload.append(field, formData[field]);
        });

      const res = await fetch(`${apiUrl}/employees/${selectedEmployeeId}/documents`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });

      if (!res.ok) {
        const text = await res.text();
        let message = 'Failed to save documents';
        try { message = JSON.parse(text).message || message; }
        catch { message = `Server error ${res.status}: ${res.statusText}`; }
        throw new Error(message);
      }

      // Re-fetch to show updated file links
      const updatedRes = await fetch(`${apiUrl}/employees/${selectedEmployeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (updatedRes.ok) {
        const updatedEmp = await updatedRes.json();
        setSelectedEmployee(updatedEmp);
      }

      setSuccessMsg('Documents saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedCompanyId('');
    setSelectedDepartmentId('');
    setSelectedEmployeeId('');
    setSelectedEmployee(null);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const renderFileLink = (fileValue, label) => {
    if (!fileValue || typeof fileValue !== 'string') return null;
    return (
      <a
        href={`${apiUrl}/uploads/${fileValue}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 mt-1.5 font-medium underline underline-offset-2"
      >
        <span>📎</span> View existing {label}
      </a>
    );
  };

  const docFields = [
    { key: 'aadhaar',        label: 'Aadhaar',          numberField: 'aadhaarNumber',        fileField: 'aadhaarDocument',        placeholder: 'XXXX XXXX XXXX',    icon: '🪪', color: 'blue' },
    { key: 'pan',            label: 'PAN Card',          numberField: 'panNumber',            fileField: 'panDocument',            placeholder: 'ABCDE1234F',         icon: '💳', color: 'indigo' },
    { key: 'passport',       label: 'Passport',          numberField: 'passportNumber',       fileField: 'passportDocument',       placeholder: 'A1234567',           icon: '📘', color: 'sky' },
    { key: 'voterId',        label: 'Voter ID',          numberField: 'voterIdNumber',        fileField: 'voterIdDocument',        placeholder: 'ABC1234567',         icon: '🗳️', color: 'violet' },
    { key: 'drivingLicense', label: 'Driving License',   numberField: 'drivingLicenseNumber', fileField: 'drivingLicenseDocument', placeholder: 'DL-0420110012345',   icon: '🚗', color: 'cyan' },
  ];

  const cardAccent = {
    blue:   'border-blue-200   hover:border-blue-400   hover:shadow-blue-100',
    indigo: 'border-indigo-200 hover:border-indigo-400 hover:shadow-indigo-100',
    sky:    'border-sky-200    hover:border-sky-400    hover:shadow-sky-100',
    violet: 'border-violet-200 hover:border-violet-400 hover:shadow-violet-100',
    cyan:   'border-cyan-200   hover:border-cyan-400   hover:shadow-cyan-100',
  };

  const iconBg = {
    blue:   'bg-blue-50   text-blue-500',
    indigo: 'bg-indigo-50 text-indigo-500',
    sky:    'bg-sky-50    text-sky-500',
    violet: 'bg-violet-50 text-violet-500',
    cyan:   'bg-cyan-50   text-cyan-500',
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-xl shadow-md shadow-blue-200">
              📄
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">Employee Documents</h1>
              <p className="text-gray-500 text-sm">Manage identity & verification documents</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">

        {/* ── Selection Panel ──────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-gray-700 font-semibold text-sm uppercase tracking-widest mb-5">
            Select Employee
          </h2>
          <div className="grid grid-cols-3 gap-5">

            {/* Company */}
            <div className="space-y-1.5">
              <label className="block text-gray-600 text-xs font-semibold uppercase tracking-wider">
                Company
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  setSelectedDepartmentId('');
                  setSelectedEmployeeId('');
                }}
                className="w-full bg-white border border-gray-300 text-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">-- Select Company --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name || c.companyName}</option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="block text-gray-600 text-xs font-semibold uppercase tracking-wider">
                Department
              </label>
              <select
                value={selectedDepartmentId}
                onChange={(e) => { setSelectedDepartmentId(e.target.value); setSelectedEmployeeId(''); }}
                disabled={!selectedCompanyId}
                className="w-full bg-white border border-gray-300 text-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
              >
                <option value="">-- Select Department --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.departmentname || d.name}</option>
                ))}
              </select>
            </div>

            {/* Employee */}
            <div className="space-y-1.5">
              <label className="block text-gray-600 text-xs font-semibold uppercase tracking-wider">
                Employee
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                disabled={!selectedDepartmentId}
                className="w-full bg-white border border-gray-300 text-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp) => {
                  const name = emp.firstName || '';
                  return (
                    <option key={emp.id} value={emp.id}>
                      {name} ({emp.employeeCode || 'N/A'})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Employee Badge */}
          {selectedEmployee && (
            <div className="mt-5 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow">
                {(selectedEmployee.firstName || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-gray-800 font-semibold text-sm">
                  {selectedEmployee.firstName}
                </p>
                <p className="text-blue-600 text-xs">
                  {selectedEmployee.employeeCode} &middot;{' '}
                  {departments.find((d) => String(d.id) === String(selectedDepartmentId))?.name}
                </p>
              </div>
              <span className="ml-auto text-xs bg-green-100 text-green-700 border border-green-200 px-3 py-1 rounded-full font-medium">
                {selectedEmployee.employmentStatus || 'Active'}
              </span>
            </div>
          )}
        </div>

        {/* ── Alerts ───────────────────────────────────────────── */}
        {successMsg && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-4 text-sm font-medium shadow-sm">
            <span className="text-lg">✅</span> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm font-medium shadow-sm">
            <span className="text-lg">❌</span> {errorMsg}
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              className="ml-auto text-red-400 hover:text-red-600 font-bold"
            >✕</button>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-10 gap-3 text-gray-400">
            <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-gray-500">Loading documents...</span>
          </div>
        )}

        {/* ── Document Form ─────────────────────────────────────── */}
        {!loading && (
          <form onSubmit={handleSubmit}>
            <div className={`transition-all duration-300 ${!selectedEmployeeId ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>

              <div className="grid grid-cols-2 gap-5">
                {docFields.map((doc) => (
                  <div
                    key={doc.key}
                    className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all ${cardAccent[doc.color]}`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${iconBg[doc.color]}`}>
                        {doc.icon}
                      </div>
                      <h3 className="text-gray-800 font-bold text-base">{doc.label}</h3>
                    </div>

                    {/* Number Input */}
                    <div className="mb-4">
                      <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">
                        {doc.label} Number
                      </label>
                      <input
                        type="text"
                        name={doc.numberField}
                        value={formData[doc.numberField]}
                        onChange={handleInputChange}
                        placeholder={doc.placeholder}
                        className="w-full bg-white border border-gray-300 text-gray-800 placeholder-gray-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>

                    {/* File Upload */}
                    <div>
                      <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">
                        Upload Document
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(doc.fileField, e.target.files[0])}
                        className="w-full text-gray-600 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 transition-all"
                      />

                      {/* Existing file link */}
                      {selectedEmployee?.documents &&
                        renderFileLink(selectedEmployee.documents[doc.fileField], doc.label)}

                      {/* New file selected indicator */}
                      {formData[doc.fileField] instanceof File && (
                        <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1 font-medium">
                          <span>✓</span> {formData[doc.fileField].name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Submit Row ───────────────────────────────────── */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedEmployeeId}
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <><span>💾</span> Save Documents</>
                  )}
                </button>
              </div>

            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EmployeeDocuments;