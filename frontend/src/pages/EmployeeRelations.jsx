import React, { useState, useEffect } from 'react';

const RELATION_OPTIONS = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister', 'Other'];

const emptyRelation = () => ({
  name: '',
  age: '',
  relation: '',
  occupation: '',
  salary: '',
});

const relationColors = {
  Father:   'bg-blue-50   text-blue-700   border-blue-200',
  Mother:   'bg-pink-50   text-pink-700   border-pink-200',
  Spouse:   'bg-rose-50   text-rose-700   border-rose-200',
  Son:      'bg-cyan-50   text-cyan-700   border-cyan-200',
  Daughter: 'bg-purple-50 text-purple-700 border-purple-200',
  Brother:  'bg-amber-50  text-amber-700  border-amber-200',
  Sister:   'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  Other:    'bg-gray-50   text-gray-600   border-gray-200',
};

const relationIcons = {
  Father:   '👨',
  Mother:   '👩',
  Spouse:   '💑',
  Son:      '👦',
  Daughter: '👧',
  Brother:  '🧑',
  Sister:   '👱‍♀️',
  Other:    '🧑‍🤝‍🧑',
};

const safe = (val) => (val === null || val === undefined ? '' : String(val));

const EmployeeRelations = () => {
  const [companies, setCompanies]                       = useState([]);
  const [departments, setDepartments]                   = useState([]);
  const [employees, setEmployees]                       = useState([]);
  const [selectedCompanyId, setSelectedCompanyId]       = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId]     = useState('');
  const [selectedEmployee, setSelectedEmployee]         = useState(null);
  const [relations, setRelations]                       = useState([]);
  const [saving, setSaving]                             = useState(false);
  const [loading, setLoading]                           = useState(false);
  const [successMsg, setSuccessMsg]                     = useState('');
  const [errorMsg, setErrorMsg]                         = useState('');

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
      } catch (err) { console.error('Error fetching companies:', err); }
    };
    fetchCompanies();
  }, []);

  // ── Fetch departments ────────────────────────────────────────
  useEffect(() => {
    if (!selectedCompanyId) {
      setDepartments([]); setSelectedDepartmentId('');
      setEmployees([]); setSelectedEmployeeId('');
      setSelectedEmployee(null); setRelations([]);
      return;
    }
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${apiUrl}/departments?companyId=${selectedCompanyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) { const data = await res.json(); setDepartments(Array.isArray(data) ? data : data.data || []); }
      } catch (err) { console.error('Error fetching departments:', err); }
    };
    fetchDepartments();
  }, [selectedCompanyId]);

  // ── Fetch employees ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedDepartmentId || !selectedCompanyId) {
      setEmployees([]); setSelectedEmployeeId('');
      setSelectedEmployee(null); setRelations([]);
      return;
    }
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(
          `${apiUrl}/employees?companyId=${selectedCompanyId}&departmentId=${selectedDepartmentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) { const data = await res.json(); setEmployees(Array.isArray(data) ? data : []); }
        else { const text = await res.text(); console.error('Employees fetch error:', res.status, text); }
      } catch (err) { console.error('Error fetching employees:', err); }
    };
    fetchEmployees();
  }, [selectedDepartmentId]);

  // ── Fetch full employee with relations ───────────────────────
  useEffect(() => {
    if (!selectedEmployeeId) { setSelectedEmployee(null); setRelations([]); return; }
    const fetchEmployee = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${apiUrl}/employees/${selectedEmployeeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const emp = await res.json();
          setSelectedEmployee(emp);
          const normalized = Array.isArray(emp.relations)
            ? emp.relations.map((r) => ({
                id: r.id ?? undefined,
                name: safe(r.name), age: safe(r.age),
                relation: safe(r.relation), occupation: safe(r.occupation), salary: safe(r.salary),
              }))
            : [];
          setRelations(normalized);
        } else {
          const text = await res.text();
          console.error('Employee fetch error:', res.status, text);
        }
      } catch (err) { console.error('Error fetching employee:', err); }
      finally { setLoading(false); }
    };
    fetchEmployee();
  }, [selectedEmployeeId]);

  // ── Handlers ─────────────────────────────────────────────────
  const addRelation = () => setRelations((prev) => [...prev, emptyRelation()]);

  const handleRelationChange = (index, field, value) => {
    setRelations((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeRelation = (index) => setRelations((prev) => prev.filter((_, i) => i !== index));

  const duplicateRelation = (index) => {
    setRelations((prev) => {
      const copy = { ...prev[index] };
      delete copy.id;
      const updated = [...prev];
      updated.splice(index + 1, 0, copy);
      return updated;
    });
  };

  const handleReset = () => {
    setSelectedCompanyId(''); setSelectedDepartmentId(''); setSelectedEmployeeId('');
    setSelectedEmployee(null); setRelations([]); setSuccessMsg(''); setErrorMsg('');
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeId) { setErrorMsg('Please select an employee first.'); return; }
    const invalid = relations.find((r) => !r.name.trim() || !r.relation);
    if (invalid) { setErrorMsg('Please fill Name and Relation for all entries.'); return; }

    setSaving(true); setSuccessMsg(''); setErrorMsg('');

    try {
      const token = localStorage.getItem('authToken');
      const payload = relations.map((r) => ({
        name:       r.name.trim(),
        age:        r.age !== '' ? parseInt(r.age) : null,
        relation:   r.relation,
        occupation: r.occupation.trim() !== '' ? r.occupation.trim() : null,
        salary:     r.salary !== '' ? parseFloat(r.salary) : null,
      }));

      const res = await fetch(`${apiUrl}/employees/${selectedEmployeeId}/relations`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ relations: payload }),
      });

      if (!res.ok) {
        const text = await res.text();
        let message = 'Failed to save relations';
        try { message = JSON.parse(text).message || message; } catch { message = `Server error ${res.status}`; }
        throw new Error(message);
      }

      const result = await res.json();
      const saved = Array.isArray(result.relations)
        ? result.relations.map((r) => ({
            id: r.id ?? undefined,
            name: safe(r.name), age: safe(r.age),
            relation: safe(r.relation), occupation: safe(r.occupation), salary: safe(r.salary),
          }))
        : [];

      setRelations(saved);
      setSuccessMsg('Relations saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-xl shadow-md shadow-blue-200">
            👨‍👩‍👧‍👦
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Employee Relations</h1>
            <p className="text-gray-500 text-sm">Manage family & dependent information</p>
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
              <label className="block text-gray-600 text-xs font-semibold uppercase tracking-wider">Company</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => { setSelectedCompanyId(e.target.value); setSelectedDepartmentId(''); setSelectedEmployeeId(''); }}
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
              <label className="block text-gray-600 text-xs font-semibold uppercase tracking-wider">Department</label>
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
              <label className="block text-gray-600 text-xs font-semibold uppercase tracking-wider">Employee</label>
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
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-medium">
                  {relations.length} relation{relations.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-3 py-1 rounded-full font-medium">
                  {selectedEmployee.employmentStatus || 'Active'}
                </span>
              </div>
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
            <button type="button" onClick={() => setErrorMsg('')} className="ml-auto text-red-400 hover:text-red-600 font-bold">✕</button>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-10 gap-3">
            <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-gray-500">Loading relations...</span>
          </div>
        )}

        {/* ── Relations Form ───────────────────────────────────── */}
        {!loading && (
          <form onSubmit={handleSubmit}>
            <div className={`transition-all duration-300 ${!selectedEmployeeId ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>

              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

                {/* Top bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">👨‍👩‍👧‍👦</span>
                    <div>
                      <h3 className="text-gray-800 font-bold text-base">Family Relations</h3>
                      <p className="text-gray-500 text-xs">Add family members and dependents</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addRelation}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-200 active:scale-95"
                  >
                    <span className="text-lg leading-none">+</span> Add Relation
                  </button>
                </div>

                {/* Empty state */}
                {relations.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="text-5xl mb-4 opacity-20">👨‍👩‍👧‍👦</div>
                    <p className="text-gray-500 font-medium mb-1">No relations added yet</p>
                    <p className="text-gray-400 text-sm">
                      {selectedEmployeeId ? 'Click "Add Relation" to add a family member' : 'Select an employee to manage their relations'}
                    </p>
                  </div>
                )}

                {/* Column headers */}
                {relations.length > 0 && (
                  <div className="grid grid-cols-12 gap-3 px-6 py-3 bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                    <div className="col-span-3">Name <span className="text-red-500">*</span></div>
                    <div className="col-span-1">Age</div>
                    <div className="col-span-2">Relation <span className="text-red-500">*</span></div>
                    <div className="col-span-3">Occupation</div>
                    <div className="col-span-2">Salary (₹)</div>
                    <div className="col-span-1 text-center">Actions</div>
                  </div>
                )}

                {/* Rows */}
                <div className="divide-y divide-gray-100">
                  {relations.map((rel, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 px-6 py-4 items-start hover:bg-gray-50 transition-colors group">

                      {/* Name */}
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Full name"
                          value={safe(rel.name)}
                          onChange={(e) => handleRelationChange(index, 'name', e.target.value)}
                          className="w-full bg-white border border-gray-300 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          required
                        />
                      </div>

                      {/* Age */}
                      <div className="col-span-1">
                        <input
                          type="number"
                          placeholder="Age"
                          min="0"
                          max="120"
                          value={safe(rel.age)}
                          onChange={(e) => handleRelationChange(index, 'age', e.target.value)}
                          className="w-full bg-white border border-gray-300 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>

                      {/* Relation */}
                      <div className="col-span-2">
                        <select
                          value={safe(rel.relation)}
                          onChange={(e) => handleRelationChange(index, 'relation', e.target.value)}
                          className="w-full bg-white border border-gray-300 text-gray-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          required
                        >
                          <option value="">Select</option>
                          {RELATION_OPTIONS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>

                      {/* Occupation */}
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="e.g. Retired, Student"
                          value={safe(rel.occupation)}
                          onChange={(e) => handleRelationChange(index, 'occupation', e.target.value)}
                          className="w-full bg-white border border-gray-300 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>

                      {/* Salary */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          value={safe(rel.salary)}
                          onChange={(e) => handleRelationChange(index, 'salary', e.target.value)}
                          className="w-full bg-white border border-gray-300 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex items-center justify-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => duplicateRelation(index)}
                          title="Duplicate"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all opacity-0 group-hover:opacity-100 text-sm"
                        >⧉</button>
                        <button
                          type="button"
                          onClick={() => removeRelation(index)}
                          title="Remove"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-all text-sm"
                        >✕</button>
                      </div>

                      {/* Badge preview */}
                      {rel.relation && (
                        <div className="col-span-12 flex items-center gap-2 -mt-1 ml-1">
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-medium ${relationColors[rel.relation] || relationColors['Other']}`}>
                            {relationIcons[rel.relation]} {rel.relation}
                            {rel.name && ` · ${rel.name}`}
                            {rel.age  && `, ${rel.age} yrs`}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Summary footer */}
                {relations.length > 0 && (
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-2">
                    {RELATION_OPTIONS.map((r) => {
                      const count = relations.filter((rel) => rel.relation === r).length;
                      if (count === 0) return null;
                      return (
                        <span key={r} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${relationColors[r] || relationColors['Other']}`}>
                          {relationIcons[r]} {r}: {count}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit row */}
              <div className="mt-6 flex justify-between items-center">
                <p className="text-gray-400 text-sm">
                  {relations.length > 0
                    ? `${relations.length} relation${relations.length !== 1 ? 's' : ''} total`
                    : 'No relations added'}
                </p>
                <div className="flex gap-3">
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
                      <><span>💾</span> Save Relations</>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EmployeeRelations;