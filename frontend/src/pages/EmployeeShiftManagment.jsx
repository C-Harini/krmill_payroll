import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../utils/apiCaller";

const EmployeeShiftManagement = () => {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    employeeId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await apiRequest("/companies");
        setCompanies(data);
        if (data.length > 0) setSelectedCompanyId(data[0].id);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) return;
    const fetchEmployees = async () => {
      try {
        const data = await apiRequest(
          `/employees?companyId=${selectedCompanyId}`,
        );
        setEmployees(data.filter((e) => e.status === "Active"));
      } catch (err) {
        setError(err.message);
      }
    };
    fetchEmployees();
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    fetchSummary();
  }, [selectedCompanyId, filters]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        companyId: selectedCompanyId,
        month: filters.month,
        year: filters.year,
        ...(filters.employeeId && { employeeId: filters.employeeId }),
      });
      const res = await apiRequest(
        `/employee-shifts/shift-summary?${query}`,
      );
      setSummaryData(res.data.summary || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const allShiftNames = [
    ...new Set(
      summaryData.flatMap((emp) => emp.shifts.map((s) => s.shiftName)),
    ),
  ];

  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Monthly Shift Summary
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {MONTHS[filters.month - 1]} {filters.year}
            </p>
          </div>

          {/* Navigate to Shift Reports page */}
        
        </div>

        {/* Company Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Company
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full md:w-72 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">
            Filters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Month
              </label>
              <select
                value={filters.month}
                onChange={(e) => handleFilterChange("month", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Year
              </label>
              <input
                type="number"
                value={filters.year}
                onChange={(e) => handleFilterChange("year", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Employee
              </label>
              <select
                value={filters.employeeId}
                onChange={(e) =>
                  handleFilterChange("employeeId", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeCode} - {emp.firstName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Summary Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <th className="px-4 py-3 text-left font-semibold">
                    Employee
                  </th>
                  {allShiftNames.map((shift) => (
                    <th
                      key={shift}
                      className="px-4 py-3 text-center font-semibold whitespace-nowrap"
                    >
                      {shift}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold">
                    Total Days
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Work Hrs
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    OT Hrs
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={allShiftNames.length + 4}
                      className="text-center py-14 text-gray-400"
                    >
                      <svg
                        className="animate-spin h-6 w-6 mx-auto mb-2 text-blue-400"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      Loading...
                    </td>
                  </tr>
                ) : summaryData.length > 0 ? (
                  summaryData.map((emp, idx) => (
                    <tr
                      key={emp.employeeId}
                      className={`hover:bg-blue-50 transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">
                          {emp.employeeName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {emp.employeeCode}
                        </div>
                      </td>
                      {allShiftNames.map((shiftName) => {
                        const foundShift = emp.shifts.find(
                          (s) => s.shiftName === shiftName,
                        );
                        return (
                          <td
                            key={shiftName}
                            className="px-4 py-3 text-center text-gray-700"
                          >
                            {foundShift ? foundShift.totalDays : 0}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center font-bold text-blue-600">
                        {emp.totalDaysAllShifts}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {emp.totalWorkingHoursAllShifts}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {emp.totalOvertimeHoursAllShifts}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={allShiftNames.length + 4}
                      className="text-center py-14 text-gray-400"
                    >
                      <div className="text-4xl mb-2 opacity-30">📊</div>
                      No shift summary found.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Totals footer */}
              {summaryData.length > 1 && (
                <tfoot>
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td className="px-4 py-3 font-bold text-gray-700 text-sm">
                      TOTALS
                    </td>
                    {allShiftNames.map((shiftName) => (
                      <td
                        key={shiftName}
                        className="px-4 py-3 text-center font-bold text-gray-700"
                      >
                        {summaryData.reduce((s, emp) => {
                          const found = emp.shifts.find(
                            (sh) => sh.shiftName === shiftName,
                          );
                          return s + (found ? found.totalDays : 0);
                        }, 0)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center font-bold text-blue-700">
                      {summaryData.reduce(
                        (s, e) => s + (e.totalDaysAllShifts || 0),
                        0,
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-700">
                      {summaryData
                        .reduce(
                          (s, e) =>
                            s + parseFloat(e.totalWorkingHoursAllShifts || 0),
                          0,
                        )
                        .toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-700">
                      {summaryData
                        .reduce(
                          (s, e) =>
                            s + parseFloat(e.totalOvertimeHoursAllShifts || 0),
                          0,
                        )
                        .toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeShiftManagement;
