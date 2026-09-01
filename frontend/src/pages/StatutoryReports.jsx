// frontend/src/pages/StatutoryReports.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StatutoryReports = () => {
  // ==========================================
  // STATE
  // ==========================================
  const [activeTab, setActiveTab] = useState('pf');
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [filters, setFilters] = useState({
    companyId: '',
    departmentId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    quarter: '',
    status: '',
    loanType: ''
  });

  const [pfReport,   setPFReport]   = useState({ data: [], totals: {}, companyInfo: {} });
  const [esiReport,  setESIReport]  = useState({ data: [], totals: {}, companyInfo: {} });
  const [taxReport,  setTaxReport]  = useState({ data: [], totals: {}, companyInfo: {} });
  const [ptReport,   setPTReport]   = useState({ data: [], totals: {}, period: [], companyInfo: {} });
  const [loanReport, setLoanReport] = useState({ data: [], totals: {} });

  const [loading,         setLoading]         = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const months = [
    { value: 1, label: 'January' },  { value: 2,  label: 'February' },
    { value: 3, label: 'March' },    { value: 4,  label: 'April' },
    { value: 5, label: 'May' },      { value: 6,  label: 'June' },
    { value: 7, label: 'July' },     { value: 8,  label: 'August' },
    { value: 9, label: 'September'},  { value: 10, label: 'October' },
    { value: 11, label: 'November'}, { value: 12, label: 'December' }
  ];
  const ptMonths = [
    { value: 2, label: 'February (Sep–Feb)' },
    { value: 8, label: 'August (Mar–Aug)' }
  ];
  const years        = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  const quarters     = ['Q1', 'Q2', 'Q3', 'Q4'];
  const loanTypes    = ['Advance'];
  const loanStatuses = ['pending', 'active', 'completed', 'cancelled'];

  const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  // ==========================================
  // FETCH DROPDOWN DATA
  // ==========================================
  useEffect(() => { fetchCompanies(); }, []);

  useEffect(() => { if (filters.companyId) fetchDepartments(); }, [filters.companyId]);

  const fetchCompanies = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/companies');
      setCompanies(res.data || []);
      if (res.data.length > 0) { const firstId = res.data[0].id; setFilters(prev => ({ ...prev, companyId: firstId })); fetchDepartments(firstId); }
    } catch (e) { console.error(e); }
  };

  const fetchDepartments = async (companyId = filters.companyId) => {
    try {
      if (!companyId) return;
      const res = await axios.get('http://localhost:8000/api/departments?companyId=' + companyId);
      setDepartments(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  // ==========================================
  // FETCH REPORTS
  // ==========================================
  const fetchPFReport = async () => {
    setLoading(true);
    try {
      const params = { month: filters.month, year: filters.year };
      if (filters.companyId)    params.companyId    = filters.companyId;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      const res = await axios.get('http://localhost:8000/api/statutory-reports/pf', { params });
      setPFReport(res.data);
    } catch (e) { console.error(e); alert('Failed to fetch EPF report'); }
    finally { setLoading(false); }
  };

  const fetchESIReport = async () => {
    setLoading(true);
    try {
      const params = { month: filters.month, year: filters.year };
      if (filters.companyId)    params.companyId    = filters.companyId;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      const res = await axios.get('http://localhost:8000/api/statutory-reports/esi', { params });
      setESIReport(res.data);
    } catch (e) { console.error(e); alert('Failed to fetch ESI report'); }
    finally { setLoading(false); }
  };

  const fetchTaxReport = async () => {
    setLoading(true);
    try {
      const params = { year: filters.year };
      if (filters.quarter) params.quarter = filters.quarter;
      else params.month = filters.month;
      if (filters.companyId)    params.companyId    = filters.companyId;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      const res = await axios.get('http://localhost:8000/api/statutory-reports/tax', { params });
      setTaxReport(res.data);
    } catch (e) { console.error(e); alert('Failed to fetch Tax report'); }
    finally { setLoading(false); }
  };

  const fetchPTReport = async () => {
    if (parseInt(filters.month) !== 2 && parseInt(filters.month) !== 8) {
      alert('Professional Tax report is only for February and August. Please select the correct month.');
      return;
    }
    setLoading(true);
    try {
      const params = { month: filters.month, year: filters.year };
      if (filters.companyId)    params.companyId    = filters.companyId;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      const res = await axios.get('http://localhost:8000/api/statutory-reports/professional-tax', { params });
      setPTReport(res.data);
    } catch (e) { console.error(e); alert('Failed to fetch PT report'); }
    finally { setLoading(false); }
  };

  const fetchLoanReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.companyId)    params.companyId    = filters.companyId;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.status)       params.status       = filters.status;
      if (filters.loanType)     params.loanType     = filters.loanType;
      const res = await axios.get('http://localhost:8000/api/statutory-reports/loan', { params });
      setLoanReport(res.data);
    } catch (e) { console.error(e); alert('Failed to fetch Loan report'); }
    finally { setLoading(false); }
  };

  // ==========================================
  // DOWNLOAD FUNCTIONS
  // ==========================================
  const downloadPDF = async (type) => {
    setDownloadLoading(true);
    try {
      const params = { month: filters.month, year: filters.year };
      if (filters.companyId)    params.companyId    = filters.companyId;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      const urlMap = {
        pf:  'http://localhost:8000/api/statutory-reports/pf/download/pdf',
        esi: 'http://localhost:8000/api/statutory-reports/esi/download/pdf',
        pt:  'http://localhost:8000/api/statutory-reports/professional-tax/download/pdf'
      };
      const res = await axios.get(urlMap[type], { params, responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `${type.toUpperCase()}-Report-${filters.month}-${filters.year}.pdf`);
      document.body.appendChild(link);
      link.click(); link.remove();
    } catch (e) { console.error(e); alert('Failed to download PDF'); }
    finally { setDownloadLoading(false); }
  };

  const downloadExcel = async (reportType = null) => {
    setDownloadLoading(true);
    try {
      const params = { month: filters.month, year: filters.year };
      if (filters.companyId) params.companyId = filters.companyId;
      if (reportType) params.reportType = reportType;
      const res = await axios.get('http://localhost:8000/api/statutory-reports/download/excel', {
        params, responseType: 'blob'
      });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      const fn   = reportType
        ? `${reportType.toUpperCase()}-Report-${filters.month}-${filters.year}.xlsx`
        : `Statutory-Reports-${filters.month}-${filters.year}.xlsx`;
      link.setAttribute('download', fn);
      document.body.appendChild(link);
      link.click(); link.remove();
    } catch (e) { console.error(e); alert('Failed to download Excel'); }
    finally { setDownloadLoading(false); }
  };

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    const map = { pf: fetchPFReport, esi: fetchESIReport, tax: fetchTaxReport, pt: fetchPTReport, loan: fetchLoanReport };
    map[activeTab]?.();
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPFReport({ data: [], totals: {}, companyInfo: {} });
    setESIReport({ data: [], totals: {}, companyInfo: {} });
    setTaxReport({ data: [], totals: {}, companyInfo: {} });
    setPTReport({ data: [], totals: {}, period: [], companyInfo: {} });
    setLoanReport({ data: [], totals: {} });
    if (tab === 'pt') setFilters(prev => ({ ...prev, month: 2 }));
  };

  // ==========================================
  // SHARED COMPONENTS
  // ==========================================
  const DownloadBtn = ({ onClick, disabled, color = 'red', children }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 bg-${color}-600 text-white rounded-md text-sm font-semibold hover:bg-${color}-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200`}
    >
      {children}
    </button>
  );

  const EmptyState = () => (
    <div className="text-center py-12 text-gray-500">
      {loading ? '⏳ Loading...' : 'No data available. Please adjust filters and search.'}
    </div>
  );

  const SummaryCard = ({ label, value, color = 'gray' }) => (
    <div className={`bg-${color}-50 p-4 rounded-lg border border-${color}-200`}>
      <p className={`text-xs font-semibold text-${color}-600 uppercase tracking-wide`}>{label}</p>
      <p className={`text-2xl font-bold text-${color}-900 mt-1`}>{value}</p>
    </div>
  );

  // ==========================================
  // FILTERS
  // ==========================================
  const renderFilters = () => {
    const needsMonth     = ['pf', 'esi'].includes(activeTab);
    const needsPTMonth   = activeTab === 'pt';
    const needsQuarter   = activeTab === 'tax';
    const needsLoanFilters = activeTab === 'loan';

    return (
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

          {/* Company */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-2">Company</label>
            <select name="companyId" value={filters.companyId} onChange={handleFilterChange}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Department */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-2">Department</label>
            <select name="departmentId" value={filters.departmentId} onChange={handleFilterChange}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.departmentname}</option>)}
            </select>
          </div>

          {/* Month — PF / ESI */}
          {needsMonth && (
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">Month *</label>
              <select name="month" value={filters.month} onChange={handleFilterChange}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500">
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          )}

          {/* Month — PT (Feb / Aug only) */}
          {needsPTMonth && (
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">Period Month *</label>
              <select name="month" value={filters.month} onChange={handleFilterChange}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500">
                {ptMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <p className="text-xs text-amber-600 mt-1">⚠️ PT is calculated bi-annually</p>
            </div>
          )}

          {/* Tax — Month or Quarter */}
          {needsQuarter && (
            <>
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2">Month</label>
                <select name="month" value={filters.month} onChange={handleFilterChange}
                  disabled={filters.quarter !== ''}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                  <option value="">Select Month</option>
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2">OR Quarter</label>
                <select name="quarter" value={filters.quarter} onChange={handleFilterChange}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Quarter</option>
                  {quarters.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Year */}
          {!needsLoanFilters && (
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">Year *</label>
              <select name="year" value={filters.year} onChange={handleFilterChange}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {/* Loan filters */}
          {needsLoanFilters && (
            <>
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2">Loan Type</label>
                <select name="loanType" value={filters.loanType} onChange={handleFilterChange}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">All Types</option>
                  {loanTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select name="status" value={filters.status} onChange={handleFilterChange}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">All Status</option>
                  {loanStatuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Search button */}
          <div className="flex flex-col justify-end">
            <button onClick={handleSearch} disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition duration-200">
              {loading ? '⏳ Loading...' : '🔍 Search'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // EPF REPORT
  // ==========================================
  const renderPFReport = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">📊 EPF (Provident Fund) Report</h3>
            {pfReport.companyInfo?.name && (
              <p className="text-sm text-gray-600">Company: <span className="font-semibold">{pfReport.companyInfo.name}</span></p>
            )}
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <DownloadBtn onClick={() => downloadPDF('pf')} disabled={downloadLoading || pfReport.data.length === 0} color="red">
              📄 Download PDF
            </DownloadBtn>
            <DownloadBtn onClick={() => downloadExcel('pf')} disabled={downloadLoading || pfReport.data.length === 0} color="green">
              📊 Download Excel
            </DownloadBtn>
          </div>
        </div>

        {pfReport.totals && Object.keys(pfReport.totals).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            <SummaryCard label="Total Employees"      value={pfReport.totals.employeeCount || 0} />
            <SummaryCard label="Total Gross Wages"    value={`₹${fmt(pfReport.totals.totalGrossWages)}`} />
            <SummaryCard label="EPF Wages"            value={`₹${fmt(pfReport.totals.totalEPFWage)}`} color="blue" />
            <SummaryCard label="EPS Wages"            value={`₹${fmt(pfReport.totals.totalEPSWage)}`} color="indigo" />
            <SummaryCard label="EDLI Wages"           value={`₹${fmt(pfReport.totals.totalEDLIWage)}`} color="purple" />
            <SummaryCard label="Employee PF (12%)"    value={`₹${fmt(pfReport.totals.totalEmployeePF)}`} color="blue" />
            <SummaryCard label="Employer Contribution"value={`₹${fmt(pfReport.totals.totalEmployerContribution)}`} color="orange" />
          </div>
        )}

        {pfReport.data.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">S.No</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Staff Code</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Staff Name</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">EPF Number</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">UAN Number</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Gross Wages</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">EPF Wages</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">EPS Wages</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">EDLI Wages</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Emp PF 12%</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">EPS 8.33%</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">EPF 3.67%</th>
                  <th className="px-3 py-3 text-center font-semibold whitespace-nowrap">NCP Days</th>
                </tr>
              </thead>
              <tbody>
                {pfReport.data.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-gray-700">{index + 1}</td>
                    <td className="px-3 py-2 text-gray-700 font-semibold">{item.employee.employeeCode}</td>
                    <td className="px-3 py-2 text-gray-900 whitespace-nowrap">{item.employee.firstName}</td>
                    <td className="px-3 py-2 text-gray-700">{item.employee.epfNumber || 'N/A'}</td>
                    <td className="px-3 py-2 text-gray-700">{item.employee.uanNumber || 'N/A'}</td>
                    <td className="px-3 py-2 text-right text-gray-700">₹{fmt(item.grossWages)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">₹{fmt(item.epfWage)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">₹{fmt(item.epsWage)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">₹{fmt(item.edliWage)}</td>
                    <td className="px-3 py-2 text-right text-blue-700 font-semibold">₹{fmt(item.employeePF)}</td>
                    <td className="px-3 py-2 text-right text-orange-700">₹{fmt(item.employerEPS)}</td>
                    <td className="px-3 py-2 text-right text-orange-700">₹{fmt(item.employerEPF)}</td>
                    <td className="px-3 py-2 text-center text-red-700 font-semibold">{item.ncpDays}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-blue-50 font-bold">
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-gray-800">TOTAL ({pfReport.totals.employeeCount} employees)</td>
                  <td className="px-3 py-2 text-right">₹{fmt(pfReport.totals.totalGrossWages)}</td>
                  <td className="px-3 py-2 text-right">₹{fmt(pfReport.totals.totalEPFWage)}</td>
                  <td className="px-3 py-2 text-right">₹{fmt(pfReport.totals.totalEPSWage)}</td>
                  <td className="px-3 py-2 text-right">₹{fmt(pfReport.totals.totalEDLIWage)}</td>
                  <td className="px-3 py-2 text-right text-blue-700">₹{fmt(pfReport.totals.totalEmployeePF)}</td>
                  <td className="px-3 py-2 text-right text-orange-700">₹{fmt(pfReport.totals.totalEmployerEPS)}</td>
                  <td className="px-3 py-2 text-right text-orange-700">₹{fmt(pfReport.totals.totalEmployerEPF)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : <EmptyState />}
      </div>
    </div>
  );

  // ==========================================
  // ESI REPORT
  // ==========================================
  const renderESIReport = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">🏥 ESI (Employee State Insurance) Report</h3>
            {esiReport.companyInfo?.esiNumber && (
              <p className="text-sm text-gray-600">ESI Number: <span className="font-semibold">{esiReport.companyInfo.esiNumber}</span></p>
            )}
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <DownloadBtn onClick={() => downloadPDF('esi')} disabled={downloadLoading || esiReport.data.length === 0} color="red">
              📄 Download PDF
            </DownloadBtn>
            <DownloadBtn onClick={() => downloadExcel('esi')} disabled={downloadLoading || esiReport.data.length === 0} color="green">
              📊 Download Excel
            </DownloadBtn>
          </div>
        </div>

        {esiReport.totals && Object.keys(esiReport.totals).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <SummaryCard label="Total Employees"   value={esiReport.totals.employeeCount || 0} />
            <SummaryCard label="Total Basic Pay"   value={`₹${fmt(esiReport.totals.totalBasicPay)}`} />
            <SummaryCard label="Total SA"          value={`₹${fmt(esiReport.totals.totalSA)}`} />
            <SummaryCard label="Total Wages"       value={`₹${fmt(esiReport.totals.totalWages)}`} color="gray" />
            <SummaryCard label="Emp ESI (0.75%)"   value={`₹${fmt(esiReport.totals.totalEmployeeESI)}`} color="blue" />
            <SummaryCard label="Empr ESI (3.25%)"  value={`₹${fmt(esiReport.totals.totalEmployerESI)}`} color="orange" />
          </div>
        )}

        {esiReport.data.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-green-600 to-green-700 text-white sticky top-0">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">S.No</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Staff Code</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Staff Name</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">ESI Number</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Basic Pay</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">SA</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Total Wages</th>
                  <th className="px-3 py-3 text-center font-semibold whitespace-nowrap">LLP Days</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Emp ESI (0.75%)</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Empr ESI (3.25%)</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Total ESI</th>
                </tr>
              </thead>
              <tbody>
                {esiReport.data.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-gray-700">{index + 1}</td>
                    <td className="px-3 py-2 text-gray-700 font-semibold">{item.employee.employeeCode}</td>
                    <td className="px-3 py-2 text-gray-900 whitespace-nowrap">{item.employee.firstName}</td>
                    <td className="px-3 py-2 text-gray-700">{item.employee.esiNumber || 'N/A'}</td>
                    <td className="px-3 py-2 text-right text-gray-700">₹{fmt(item.basicPay)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">₹{fmt(item.sa)}</td>
                    <td className="px-3 py-2 text-right text-gray-800 font-semibold">₹{fmt(item.totalWages)}</td>
                    <td className="px-3 py-2 text-center text-red-700 font-semibold">{item.llpDays}</td>
                    <td className="px-3 py-2 text-right text-blue-700 font-semibold">₹{fmt(item.employeeESI)}</td>
                    <td className="px-3 py-2 text-right text-orange-700 font-semibold">₹{fmt(item.employerESI)}</td>
                    <td className="px-3 py-2 text-right text-green-700 font-bold">₹{fmt(item.totalESI)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-green-50 font-bold">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-gray-800">TOTAL ({esiReport.totals.employeeCount} employees)</td>
                  <td className="px-3 py-2 text-right">₹{fmt(esiReport.totals.totalBasicPay)}</td>
                  <td className="px-3 py-2 text-right">₹{fmt(esiReport.totals.totalSA)}</td>
                  <td className="px-3 py-2 text-right">₹{fmt(esiReport.totals.totalWages)}</td>
                  <td></td>
                  <td className="px-3 py-2 text-right text-blue-700">₹{fmt(esiReport.totals.totalEmployeeESI)}</td>
                  <td className="px-3 py-2 text-right text-orange-700">₹{fmt(esiReport.totals.totalEmployerESI)}</td>
                  <td className="px-3 py-2 text-right text-green-700">₹{fmt(esiReport.totals.totalESI)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : <EmptyState />}
      </div>
    </div>
  );

  // ==========================================
  // TDS REPORT (existing, minor update)
  // ==========================================
  const renderTaxReport = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">💰 Tax Deduction (TDS) Report</h3>
            {taxReport.companyInfo?.tanNumber && (
              <p className="text-sm text-gray-600">TAN: <span className="font-semibold">{taxReport.companyInfo.tanNumber}</span></p>
            )}
            {taxReport.period && (
              <p className="text-sm text-gray-600">Period: <span className="font-semibold">{taxReport.period}</span></p>
            )}
          </div>
          <DownloadBtn onClick={() => downloadExcel('tax')} disabled={downloadLoading || taxReport.data.length === 0} color="green">
            📊 Download Excel
          </DownloadBtn>
        </div>

        {taxReport.totals && Object.keys(taxReport.totals).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SummaryCard label="Total Employees"   value={taxReport.totals.employeeCount || 0} />
            <SummaryCard label="Total Gross"       value={`₹${fmt(taxReport.totals.totalGross)}`} />
            <SummaryCard label="Total Tax Deducted"value={`₹${fmt(taxReport.totals.totalTaxDeducted)}`} color="red" />
          </div>
        )}

        {taxReport.data.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">S.No</th>
                  <th className="px-4 py-3 text-left font-semibold">Emp Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Employee Name</th>
                  <th className="px-4 py-3 text-left font-semibold">PAN Number</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Gross</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Tax Deducted</th>
                  <th className="px-4 py-3 text-left font-semibold">Month Details</th>
                </tr>
              </thead>
              <tbody>
                {taxReport.data.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-gray-700">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-700 font-semibold">{item.employee.employeeCode}</td>
                    <td className="px-4 py-3 text-gray-900">{item.employee.firstName}</td>
                    <td className="px-4 py-3 text-gray-700">{item.employee.panNumber || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-700">{item.employee.department?.departmentName || 'N/A'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">₹{fmt(item.totalGross)}</td>
                    <td className="px-4 py-3 text-right text-red-700 font-bold">₹{fmt(item.totalTaxDeducted)}</td>
                    <td className="px-4 py-3">
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:text-blue-800 font-semibold">
                          View Months ({item.months.length})
                        </summary>
                        <div className="mt-2 bg-blue-50 p-2 rounded border border-blue-200 space-y-1">
                          {item.months.map((m, idx) => (
                            <div key={idx} className="text-xs text-gray-700">
                              <span className="font-semibold">{months.find(x => x.value === m.month)?.label} {m.year}:</span>
                              {' '}Gross ₹{fmt(m.grossPay)}, Tax ₹{fmt(m.taxDeducted)}
                            </div>
                          ))}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState />}
      </div>
    </div>
  );

  // ==========================================
  // PROFESSIONAL TAX REPORT
  // ==========================================
  const renderPTReport = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">📑 Professional Tax Report</h3>
            {ptReport.period?.length > 0 && (
              <p className="text-sm text-gray-600">
                Period: <span className="font-semibold">{ptReport.period.map(p => p.label).join(' → ')}</span>
              </p>
            )}
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <DownloadBtn onClick={() => downloadPDF('pt')} disabled={downloadLoading || ptReport.data.length === 0} color="red">
              📄 Download PDF
            </DownloadBtn>
            <DownloadBtn onClick={() => downloadExcel('pt')} disabled={downloadLoading || ptReport.data.length === 0} color="green">
              📊 Download Excel
            </DownloadBtn>
          </div>
        </div>

        {/* PT Slab legend */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-xs font-bold text-amber-800 mb-2">📋 PT Slab (6-Month Gross)</p>
          <div className="flex flex-wrap gap-3 text-xs text-amber-700">
            <span>≤ ₹20,000 → ₹0</span>
            <span>₹20,001–30,000 → ₹135</span>
            <span>₹30,001–45,000 → ₹315</span>
            <span>₹45,001–60,000 → ₹690</span>
            <span>₹60,001–75,000 → ₹1,025</span>
            <span>&gt; ₹75,000 → ₹1,250</span>
          </div>
        </div>

        {ptReport.totals && Object.keys(ptReport.totals).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SummaryCard label="Total Employees"      value={ptReport.totals.employeeCount || 0} />
            <SummaryCard label="Total 6-Month Gross"  value={`₹${fmt(ptReport.totals.totalSixMonthGross)}`} />
            <SummaryCard label="Total Professional Tax" value={`₹${fmt(ptReport.totals.totalProfTax)}`} color="purple" />
          </div>
        )}

        {ptReport.data.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gradient-to-r from-purple-600 to-purple-700 text-white sticky top-0">
                <tr>
                  <th className="px-2 py-3 text-left font-semibold whitespace-nowrap">S.No</th>
                  <th className="px-2 py-3 text-left font-semibold whitespace-nowrap">Company</th>
                  <th className="px-2 py-3 text-left font-semibold whitespace-nowrap">Staff Code</th>
                  <th className="px-2 py-3 text-left font-semibold whitespace-nowrap">Staff Name</th>
                  <th className="px-2 py-3 text-left font-semibold whitespace-nowrap">Father/Husband Name</th>
                  <th className="px-2 py-3 text-center font-semibold whitespace-nowrap">Category</th>
                  <th className="px-2 py-3 text-left font-semibold whitespace-nowrap">Designation</th>
                  <th className="px-2 py-3 text-left font-semibold whitespace-nowrap">Mobile No</th>
                  <th className="px-2 py-3 text-left font-semibold whitespace-nowrap">Email Id</th>
                  <th className="px-2 py-3 text-left font-semibold whitespace-nowrap">PAN No</th>
                  <th className="px-2 py-3 text-right font-semibold whitespace-nowrap">Actual Gross</th>
                  {/* Dynamic month columns */}
                  {ptReport.period?.map(p => (
                    <th key={p.key} className="px-2 py-3 text-right font-semibold whitespace-nowrap">{p.label}</th>
                  ))}
                  <th className="px-2 py-3 text-right font-semibold whitespace-nowrap">Gross (6M)</th>
                  <th className="px-2 py-3 text-right font-semibold whitespace-nowrap">Prof Tax</th>
                </tr>
              </thead>
              <tbody>
                {ptReport.data.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-2 py-2 text-gray-700">{index + 1}</td>
                    <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{item.company?.name || 'N/A'}</td>
                    <td className="px-2 py-2 text-gray-700 font-semibold">{item.employee.employeeCode}</td>
                    <td className="px-2 py-2 text-gray-900 whitespace-nowrap">{item.employee.firstName}</td>
                    <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{item.fatherHusbandName}</td>
                    <td className="px-2 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        item.employee.employmentType === 'PF'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.employee.employmentType || 'N/A'}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{item.employee.designation || 'N/A'}</td>
                    <td className="px-2 py-2 text-gray-700">{item.employee.mobileNumber || 'N/A'}</td>
                    <td className="px-2 py-2 text-gray-700">{item.employee.officialEmail || 'N/A'}</td>
                    <td className="px-2 py-2 text-gray-700 font-mono">{item.panNumber}</td>
                    <td className="px-2 py-2 text-right text-gray-700">₹{fmt(item.actualGross)}</td>
                    {/* Dynamic monthly gross values */}
                    {ptReport.period?.map(p => (
                      <td key={p.key} className="px-2 py-2 text-right text-gray-700">
                        ₹{fmt(item.monthlyGross[p.key] || 0)}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right text-gray-800 font-semibold">₹{fmt(item.sixMonthTotal)}</td>
                    <td className="px-2 py-2 text-right text-purple-700 font-bold">₹{fmt(item.profTax)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-purple-50 font-bold">
                <tr>
                  <td colSpan={11} className="px-2 py-2 text-gray-800">TOTAL ({ptReport.totals.employeeCount} employees)</td>
                  {ptReport.period?.map(p => <td key={p.key}></td>)}
                  <td className="px-2 py-2 text-right">₹{fmt(ptReport.totals.totalSixMonthGross)}</td>
                  <td className="px-2 py-2 text-right text-purple-700">₹{fmt(ptReport.totals.totalProfTax)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : <EmptyState />}
      </div>
    </div>
  );

  // ==========================================
  // LOAN REPORT (existing, minor update)
  // ==========================================
  const renderLoanReport = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">💳 Loan & Advance Report</h3>
          <DownloadBtn onClick={() => downloadExcel('loan')} disabled={downloadLoading || loanReport.data.length === 0} color="green">
            📊 Download Excel
          </DownloadBtn>
        </div>

        {loanReport.totals && Object.keys(loanReport.totals).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <SummaryCard label="Total Loans"       value={loanReport.totals.totalLoans || 0} />
            <SummaryCard label="Active Loans"      value={loanReport.totals.activeLoans || 0} color="green" />
            <SummaryCard label="Completed Loans"   value={loanReport.totals.completedLoans || 0} color="blue" />
            <SummaryCard label="Total Loan Amount" value={`₹${fmt(loanReport.totals.totalLoanAmount)}`} />
            <SummaryCard label="Total Paid"        value={`₹${fmt(loanReport.totals.totalPaidAmount)}`} color="amber" />
            <SummaryCard label="Total Outstanding" value={`₹${fmt(loanReport.totals.totalOutstanding)}`} color="red" />
          </div>
        )}

        {loanReport.data.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">S.No</th>
                  <th className="px-4 py-3 text-left font-semibold">Emp Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Employee Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-left font-semibold">Loan Type</th>
                  <th className="px-4 py-3 text-right font-semibold">Loan Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">Installment</th>
                  <th className="px-4 py-3 text-center font-semibold">Paid / Total</th>
                  <th className="px-4 py-3 text-right font-semibold">Paid Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">Outstanding</th>
                  <th className="px-4 py-3 text-center font-semibold">Progress</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {loanReport.data.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-gray-700">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-700 font-semibold">{item.employee.employeeCode}</td>
                    <td className="px-4 py-3 text-gray-900">{item.employee.firstName}</td>
                    <td className="px-4 py-3 text-gray-700">{item.employee.department?.departmentName || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">{item.loanType}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">₹{fmt(item.loanAmount)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">₹{fmt(item.installmentAmount)}</td>
                    <td className="px-4 py-3 text-center text-gray-700 font-semibold">{item.paidInstallments} / {item.numberOfInstallments}</td>
                    <td className="px-4 py-3 text-right text-gray-700">₹{fmt(item.paidAmount)}</td>
                    <td className="px-4 py-3 text-right text-red-700 font-bold">₹{fmt(item.outstandingAmount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                            style={{ width: `${item.completionPercentage}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-8">{item.completionPercentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'active'    ? 'bg-green-100 text-green-800' :
                        item.status === 'completed' ? 'bg-blue-100 text-blue-800'  :
                        item.status === 'pending'   ? 'bg-yellow-100 text-yellow-800' :
                                                      'bg-red-100 text-red-800'
                      }`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState />}
      </div>
    </div>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================
  const tabs = [
    { key: 'pf',   label: '📊 EPF Report' },
    { key: 'esi',  label: '🏥 ESI Report' },
    { key: 'tax',  label: '💰 Tax (TDS)' },
    { key: 'pt',   label: '📑 Professional Tax' },
    { key: 'loan', label: '💳 Loans & Advances' }
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">📋 Statutory Compliance Reports</h1>
        <p className="text-gray-600 mt-2">EPF • ESI • TDS • Professional Tax • Loans</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => handleTabChange(tab.key)}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition duration-200 ${
              activeTab === tab.key ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {renderFilters()}

      {/* Report content */}
      {activeTab === 'pf'   && renderPFReport()}
      {activeTab === 'esi'  && renderESIReport()}
      {activeTab === 'tax'  && renderTaxReport()}
      {activeTab === 'pt'   && renderPTReport()}
      {activeTab === 'loan' && renderLoanReport()}
    </div>
  );
};

export default StatutoryReports;
