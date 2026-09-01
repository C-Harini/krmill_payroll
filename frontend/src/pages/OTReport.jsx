// // // // import React, { useState, useEffect } from "react";
// // // // import { format, getDaysInMonth, parse } from "date-fns";

// // // // const OTReport = () => {
// // // //   const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
// // // //   const token = sessionStorage.getItem("token");

// // // //   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
// // // //   const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
// // // //   const [selectedCompanyId, setSelectedCompanyId] = useState("");
// // // //   const [selectedDepartments, setSelectedDepartments] = useState([]);
// // // //   const [companies, setCompanies] = useState([]);
// // // //   const [departments, setDepartments] = useState([]);
// // // //   const [reportData, setReportData] = useState([]);
// // // //   const [loading, setLoading] = useState(false);
// // // //   const [error, setError] = useState("");
// // // //   const [reportGenerated, setReportGenerated] = useState(false);
// // // //   const [currentPage, setCurrentPage] = useState(1);
// // // //   const [activeSummary, setActiveSummary] = useState(null); // "hours" | "amount" | null
// // // //   const itemsPerPage = 10;

// // // //   const fetchCompanies = async () => {
// // // //     try {
// // // //       const res = await fetch(`${BASE_URL}/api/companies`, {
// // // //         headers: { Authorization: `Bearer ${token}` },
// // // //       });
// // // //       const data = await res.json();
// // // //       const compList = Array.isArray(data) ? data : data.companies || [];
// // // //       setCompanies(compList);
// // // //       if (compList.length > 0) setSelectedCompanyId(compList[0].id);
// // // //     } catch (err) {
// // // //       setError("Failed to fetch companies");
// // // //     }
// // // //   };

// // // //   const fetchDepartments = async (companyId) => {
// // // //     if (!companyId) { setDepartments([]); setSelectedDepartments([]); return; }
// // // //     try {
// // // //       const res = await fetch(`${BASE_URL}/api/departments?companyId=${companyId}`, {
// // // //         headers: { Authorization: `Bearer ${token}` },
// // // //       });
// // // //       const data = await res.json();
// // // //       setDepartments(Array.isArray(data) ? data : data.departments || []);
// // // //       setSelectedDepartments([]);
// // // //     } catch (err) {
// // // //       setError("Failed to fetch departments");
// // // //     }
// // // //   };

// // // //   const fetchOTReport = async () => {
// // // //     setReportGenerated(true);
// // // //     setLoading(true);
// // // //     setError("");
// // // //     setActiveSummary(null);

// // // //     try {
// // // //       if (!selectedCompanyId) { setError("Please select a company"); setLoading(false); return; }
// // // //       if (selectedDepartments.length === 0) { setError("Please select at least one department"); setLoading(false); return; }

// // // //       const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
// // // //       const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${getDaysInMonth(parse(startDate, "yyyy-MM-dd", new Date()))}`;

// // // //       const promises = selectedDepartments.map((deptId) =>
// // // //         fetch(`${BASE_URL}/api/ot-hours/filter?companyId=${selectedCompanyId}&departmentId=${deptId}&startDate=${startDate}&endDate=${endDate}`, {
// // // //           headers: { Authorization: `Bearer ${token}` },
// // // //         }).then((r) => r.json())
// // // //       );

// // // //       const responses = await Promise.all(promises);
// // // //       const allOTRecords = responses.flatMap((r) => r.records || []);

// // // //       const groupedData = {};
// // // //       allOTRecords.forEach((record) => {
// // // //         const empId = record.employeeId;
// // // //         if (!groupedData[empId]) {
// // // //           groupedData[empId] = {
// // // //             employeeId: record.employeeId,
// // // //             employeeName: `${record.employee?.firstName || ""} ${record.employee?.lastName || ""}`.trim(),
// // // //             employeeCode: record.employee?.employeeCode || "N/A",
// // // //             department: record.department?.departmentName || record.department?.name || "N/A",
// // // //             departmentId: record.departmentId,
// // // //             basicSalary: record.basicSalary || 0,
// // // //             hourlyRate: record.hourlyRate || 0,
// // // //             dailyOT: {},
// // // //             totalOT: 0,
// // // //             otAmount: 0,
// // // //           };
// // // //         }
// // // //         const day = new Date(record.date).getDate();
// // // //         groupedData[empId].dailyOT[day] = record.otHours;
// // // //       });

// // // //       Object.keys(groupedData).forEach((empId) => {
// // // //         const emp = groupedData[empId];
// // // //         emp.totalOT = parseFloat(Object.values(emp.dailyOT).reduce((sum, h) => sum + Number(h), 0).toFixed(2));
// // // //         emp.otAmount = parseFloat((emp.totalOT * emp.hourlyRate).toFixed(2));
// // // //       });

// // // //       const reportArray = Object.values(groupedData).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
// // // //       setReportData(reportArray);
// // // //       setCurrentPage(1);
// // // //     } catch (err) {
// // // //       setError("Failed to generate report");
// // // //       setReportData([]);
// // // //     } finally {
// // // //       setLoading(false);
// // // //     }
// // // //   };

// // // //   const handleDepartmentToggle = (deptId) => {
// // // //     setSelectedDepartments((prev) =>
// // // //       prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
// // // //     );
// // // //   };

// // // //   useEffect(() => { fetchCompanies(); }, []);
// // // //   useEffect(() => { if (selectedCompanyId) fetchDepartments(selectedCompanyId); }, [selectedCompanyId]);

// // // //   const daysInMonth = getDaysInMonth(parse(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`, "yyyy-MM-dd", new Date()));
// // // //   const totalPages = Math.ceil(reportData.length / itemsPerPage);
// // // //   const startIdx = (currentPage - 1) * itemsPerPage;
// // // //   const paginatedData = reportData.slice(startIdx, startIdx + itemsPerPage);

// // // //   // ── Cumulative Summary Calculations ──────────────────────────
// // // //   const totalOTHours = parseFloat(reportData.reduce((sum, emp) => sum + emp.totalOT, 0).toFixed(2));
// // // //   const totalOTAmount = parseFloat(reportData.reduce((sum, emp) => sum + emp.otAmount, 0).toFixed(2));

// // // //   // Per-department breakdown for summary
// // // //   const deptSummary = reportData.reduce((acc, emp) => {
// // // //     const key = emp.department;
// // // //     if (!acc[key]) acc[key] = { department: key, totalOT: 0, otAmount: 0, employeeCount: 0 };
// // // //     acc[key].totalOT = parseFloat((acc[key].totalOT + emp.totalOT).toFixed(2));
// // // //     acc[key].otAmount = parseFloat((acc[key].otAmount + emp.otAmount).toFixed(2));
// // // //     acc[key].employeeCount += 1;
// // // //     return acc;
// // // //   }, {});
// // // //   const deptSummaryArray = Object.values(deptSummary);

// // // //   const monthLabel = reportData.length > 0
// // // //     ? format(parse(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`, "yyyy-MM-dd", new Date()), "MMMM yyyy")
// // // //     : "";

// // // //   return (
// // // //     <div className="p-6 max-w-full mx-auto">
// // // //       <h1 className="text-3xl font-bold mb-6 text-gray-800">OT Hours Report</h1>

// // // //       {error && (
// // // //         <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">{error}</div>
// // // //       )}

// // // //       {/* Filter Section */}
// // // //       <div className="bg-white shadow rounded-lg p-6 mb-6">
// // // //         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
// // // //           <div>
// // // //             <label className="block text-sm font-semibold mb-2 text-gray-700">Year <span className="text-red-500">*</span></label>
// // // //             <input type="number" min="2020" max={new Date().getFullYear() + 1} value={selectedYear}
// // // //               onChange={(e) => setSelectedYear(Number(e.target.value))}
// // // //               className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
// // // //           </div>
// // // //           <div>
// // // //             <label className="block text-sm font-semibold mb-2 text-gray-700">Month <span className="text-red-500">*</span></label>
// // // //             <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
// // // //               className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
// // // //               <option value={0}>Select Month</option>
// // // //               {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
// // // //                 <option key={i+1} value={i+1}>{m}</option>
// // // //               ))}
// // // //             </select>
// // // //           </div>
// // // //           <div>
// // // //             <label className="block text-sm font-semibold mb-2 text-gray-700">Company <span className="text-red-500">*</span></label>
// // // //             <select value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)}
// // // //               className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
// // // //               <option value="">Select Company</option>
// // // //               {companies.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
// // // //             </select>
// // // //           </div>
// // // //           <div>
// // // //             <label className="block text-sm font-semibold mb-2 text-gray-700">
// // // //               Departments <span className="text-red-500">*</span> ({selectedDepartments.length})
// // // //             </label>
// // // //           </div>
// // // //         </div>

// // // //         <div className="mb-4">
// // // //           <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
// // // //             {!selectedCompanyId ? (
// // // //               <p className="text-gray-500 text-sm">Select a company first to see departments</p>
// // // //             ) : departments.length === 0 ? (
// // // //               <p className="text-gray-500 text-sm">No departments found for this company</p>
// // // //             ) : (
// // // //               <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
// // // //                 {departments.map((dept) => (
// // // //                   <label key={dept.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
// // // //                     <input type="checkbox" checked={selectedDepartments.includes(dept.id)}
// // // //                       onChange={() => handleDepartmentToggle(dept.id)}
// // // //                       className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
// // // //                     <span className="ml-2 text-sm text-gray-700">{dept.departmentName || dept.name}</span>
// // // //                   </label>
// // // //                 ))}
// // // //               </div>
// // // //             )}
// // // //           </div>
// // // //         </div>

// // // //         <div className="flex justify-end gap-2">
// // // //           <button onClick={() => { setReportData([]); setReportGenerated(false); setActiveSummary(null); }}
// // // //             className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition">
// // // //             Clear
// // // //           </button>
// // // //           <button onClick={fetchOTReport}
// // // //             disabled={loading || !selectedCompanyId || selectedDepartments.length === 0}
// // // //             className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition">
// // // //             {loading ? "Generating..." : "Generate Report"}
// // // //           </button>
// // // //         </div>
// // // //       </div>

// // // //       {/* Report Table */}
// // // //       {reportData.length > 0 && (
// // // //         <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
// // // //           <div className="bg-gray-100 p-4 border-b">
// // // //             <h2 className="text-lg font-semibold text-gray-800">
// // // //               {monthLabel} - {reportData.length} Employee(s)
// // // //             </h2>
// // // //           </div>

// // // //           <div className="overflow-x-auto">
// // // //             <table className="w-full border-collapse text-sm">
// // // //               <thead className="bg-gray-50 sticky top-0">
// // // //                 <tr>
// // // //                   <th className="border p-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 w-12">S.No</th>
// // // //                   <th className="border p-2 text-left font-semibold text-gray-700 sticky left-12 bg-gray-50 w-20">ID</th>
// // // //                   <th className="border p-2 text-left font-semibold text-gray-700 sticky left-32 bg-gray-50 w-40">Name</th>
// // // //                   <th className="border p-2 text-left font-semibold text-gray-700 w-32">Department</th>
// // // //                   {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
// // // //                     <th key={`day-${day}`} className="border p-2 text-center font-semibold text-gray-700 bg-blue-50 w-12">
// // // //                       {day}
// // // //                     </th>
// // // //                   ))}
// // // //                   <th className="border p-2 text-center font-semibold text-gray-700 bg-green-50 w-16 sticky right-20">Total</th>
// // // //                   <th className="border p-2 text-center font-semibold text-gray-700 bg-orange-50 w-20 sticky right-0">OT Amount</th>
// // // //                 </tr>
// // // //               </thead>
// // // //               <tbody>
// // // //                 {paginatedData.map((employee, idx) => (
// // // //                   <tr key={employee.employeeId} className="hover:bg-gray-50 border-b">
// // // //                     <td className="border p-2 text-center sticky left-0 bg-white">{startIdx + idx + 1}</td>
// // // //                     <td className="border p-2 sticky left-12 bg-white text-sm">{employee.employeeCode}</td>
// // // //                     <td className="border p-2 sticky left-32 bg-white text-sm font-medium">{employee.employeeName}</td>
// // // //                     <td className="border p-2 text-sm">{employee.department}</td>
// // // //                     {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
// // // //                       <td key={`ot-${employee.employeeId}-${day}`} className="border p-2 text-center text-sm bg-blue-50">
// // // //                         {employee.dailyOT[day] ? parseFloat(employee.dailyOT[day]).toFixed(2) : "-"}
// // // //                       </td>
// // // //                     ))}
// // // //                     <td className="border p-2 text-center font-bold text-green-700 bg-green-50 sticky right-20">
// // // //                       {employee.totalOT.toFixed(2)}
// // // //                     </td>
// // // //                     <td className="border p-2 text-center font-bold text-orange-700 bg-orange-50 sticky right-0">
// // // //                       ₹ {employee.otAmount.toFixed(2)}
// // // //                     </td>
// // // //                   </tr>
// // // //                 ))}
// // // //               </tbody>
// // // //             </table>
// // // //           </div>

// // // //           {totalPages > 1 && (
// // // //             <div className="bg-gray-100 p-4 flex justify-between items-center border-t">
// // // //               <p className="text-sm text-gray-700">
// // // //                 Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, reportData.length)} of {reportData.length} records
// // // //               </p>
// // // //               <div className="flex gap-2">
// // // //                 <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}
// // // //                   className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">Previous</button>
// // // //                 {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
// // // //                   <button key={page} onClick={() => setCurrentPage(page)}
// // // //                     className={`px-3 py-1 rounded text-sm ${currentPage === page ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-800 hover:bg-gray-400"}`}>
// // // //                     {page}
// // // //                   </button>
// // // //                 ))}
// // // //                 <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}
// // // //                   className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">Next</button>
// // // //               </div>
// // // //             </div>
// // // //           )}
// // // //         </div>
// // // //       )}

// // // //       {/* ── Cumulative Summary Section ─────────────────────────── */}
// // // //       {reportData.length > 0 && (
// // // //         <div className="bg-white shadow rounded-lg overflow-hidden">
// // // //           <div className="bg-gray-100 p-4 border-b">
// // // //             <h2 className="text-lg font-semibold text-gray-800">
// // // //               Cumulative Summary — {monthLabel}
// // // //             </h2>
// // // //           </div>

// // // //           {/* Two Buttons */}
// // // //           <div className="p-4 flex gap-4">
// // // //             <button
// // // //               onClick={() => setActiveSummary(activeSummary === "hours" ? null : "hours")}
// // // //               className={`flex-1 py-4 rounded-xl border-2 font-semibold text-lg transition-all duration-200 flex flex-col items-center gap-1
// // // //                 ${activeSummary === "hours"
// // // //                   ? "bg-green-600 border-green-600 text-white shadow-lg scale-[1.02]"
// // // //                   : "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"}`}
// // // //             >
// // // //               <span className="text-2xl font-bold">{totalOTHours.toFixed(2)} hrs</span>
// // // //               <span className="text-sm font-medium opacity-80">Total OT Hours</span>
// // // //             </button>

// // // //             <button
// // // //               onClick={() => setActiveSummary(activeSummary === "amount" ? null : "amount")}
// // // //               className={`flex-1 py-4 rounded-xl border-2 font-semibold text-lg transition-all duration-200 flex flex-col items-center gap-1
// // // //                 ${activeSummary === "amount"
// // // //                   ? "bg-orange-500 border-orange-500 text-white shadow-lg scale-[1.02]"
// // // //                   : "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"}`}
// // // //             >
// // // //               <span className="text-2xl font-bold">₹ {totalOTAmount.toFixed(2)}</span>
// // // //               <span className="text-sm font-medium opacity-80">Total OT Amount</span>
// // // //             </button>
// // // //           </div>

// // // //           {/* Expanded Breakdown - Employee Wise */}
// // // //           {activeSummary && (
// // // //             <div className="px-4 pb-4">
// // // //               <div className="border border-gray-200 rounded-lg overflow-hidden">
// // // //                 <table className="w-full text-sm border-collapse">
// // // //                   <thead>
// // // //                     <tr className={`${activeSummary === "hours" ? "bg-green-600" : "bg-orange-500"} text-white`}>
// // // //                       <th className="p-3 text-left font-semibold">S.No</th>
// // // //                       <th className="p-3 text-left font-semibold">Employee Code</th>
// // // //                       <th className="p-3 text-left font-semibold">Employee Name</th>
// // // //                       <th className="p-3 text-left font-semibold">Department</th>
// // // //                       {activeSummary === "hours" ? (
// // // //                         <th className="p-3 text-center font-semibold">Total OT Hours</th>
// // // //                       ) : (
// // // //                         <th className="p-3 text-center font-semibold">OT Hours Amount</th>
// // // //                       )}
// // // //                     </tr>
// // // //                   </thead>
// // // //                   <tbody>
// // // //                     {reportData.map((emp, idx) => (
// // // //                       <tr key={emp.employeeId} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
// // // //                         <td className="p-3 text-gray-600">{idx + 1}</td>
// // // //                         <td className="p-3 text-gray-700">{emp.employeeCode}</td>
// // // //                         <td className="p-3 font-medium text-gray-800">{emp.employeeName}</td>
// // // //                         <td className="p-3 text-gray-600">{emp.department}</td>
// // // //                         {activeSummary === "hours" ? (
// // // //                           <td className="p-3 text-center font-bold text-green-700">{emp.totalOT.toFixed(2)} hrs</td>
// // // //                         ) : (
// // // //                           <td className="p-3 text-center font-bold text-orange-600">₹ {emp.otAmount.toFixed(2)}</td>
// // // //                         )}
// // // //                       </tr>
// // // //                     ))}
// // // //                   </tbody>
// // // //                   <tfoot>
// // // //                     <tr className={`${activeSummary === "hours" ? "bg-green-50 text-green-800" : "bg-orange-50 text-orange-800"} font-bold border-t-2 border-gray-300`}>
// // // //                       <td className="p-3" colSpan={4}>Grand Total</td>
// // // //                       {activeSummary === "hours" ? (
// // // //                         <td className="p-3 text-center">{totalOTHours.toFixed(2)} hrs</td>
// // // //                       ) : (
// // // //                         <td className="p-3 text-center">₹ {totalOTAmount.toFixed(2)}</td>
// // // //                       )}
// // // //                     </tr>
// // // //                   </tfoot>
// // // //                 </table>
// // // //               </div>
// // // //             </div>
// // // //           )}
// // // //         </div>
// // // //       )}

// // // //       {!loading && reportData.length === 0 && selectedDepartments.length > 0 && reportGenerated && (
// // // //         <div className="bg-white shadow rounded-lg p-8 text-center">
// // // //           <p className="text-gray-500 text-lg">No OT hours data found for the selected filters.</p>
// // // //         </div>
// // // //       )}

// // // //       {!loading && reportData.length === 0 && selectedDepartments.length === 0 && (
// // // //         <div className="bg-white shadow rounded-lg p-8 text-center">
// // // //           <p className="text-gray-500 text-lg">Select filters and click "Generate Report" to view OT hours data.</p>
// // // //         </div>
// // // //       )}
// // // //     </div>
// // // //   );
// // // // };

// // // // export default OTReport;


// // // import React, { useState, useEffect } from "react";
// // // import { format, getDaysInMonth, parse } from "date-fns";

// // // const OTReport = () => {
// // //   const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
// // //   const token = sessionStorage.getItem("token");

// // //   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
// // //   const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
// // //   const [selectedCompanyId, setSelectedCompanyId] = useState("");
// // //   const [selectedDepartments, setSelectedDepartments] = useState([]);
// // //   const [companies, setCompanies] = useState([]);
// // //   const [departments, setDepartments] = useState([]);
// // //   const [reportData, setReportData] = useState([]);
// // //   const [loading, setLoading] = useState(false);
// // //   const [error, setError] = useState("");
// // //   const [reportGenerated, setReportGenerated] = useState(false);
// // //   const [currentPage, setCurrentPage] = useState(1);
// // //   const [activeSummary, setActiveSummary] = useState(null); // "hours" | "amount" | null
// // //   const itemsPerPage = 10;

// // //   const fetchCompanies = async () => {
// // //     try {
// // //       const res = await fetch(`${BASE_URL}/api/companies`, {
// // //         headers: { Authorization: `Bearer ${token}` },
// // //       });
// // //       const data = await res.json();
// // //       const compList = Array.isArray(data) ? data : data.companies || [];
// // //       setCompanies(compList);
// // //       if (compList.length > 0) setSelectedCompanyId(compList[0].id);
// // //     } catch (err) {
// // //       setError("Failed to fetch companies");
// // //     }
// // //   };

// // //   const fetchDepartments = async (companyId) => {
// // //     if (!companyId) { setDepartments([]); setSelectedDepartments([]); return; }
// // //     try {
// // //       const res = await fetch(`${BASE_URL}/api/departments?companyId=${companyId}`, {
// // //         headers: { Authorization: `Bearer ${token}` },
// // //       });
// // //       const data = await res.json();
// // //       setDepartments(Array.isArray(data) ? data : data.departments || []);
// // //       setSelectedDepartments([]);
// // //     } catch (err) {
// // //       setError("Failed to fetch departments");
// // //     }
// // //   };

// // //   const fetchOTReport = async () => {
// // //     setReportGenerated(true);
// // //     setLoading(true);
// // //     setError("");
// // //     setActiveSummary(null);

// // //     try {
// // //       if (!selectedCompanyId) { setError("Please select a company"); setLoading(false); return; }
// // //       if (selectedDepartments.length === 0) { setError("Please select at least one department"); setLoading(false); return; }

// // //       const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
// // //       const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${getDaysInMonth(parse(startDate, "yyyy-MM-dd", new Date()))}`;

// // //       const promises = selectedDepartments.map((deptId) =>
// // //         fetch(`${BASE_URL}/api/ot-hours/filter?companyId=${selectedCompanyId}&departmentId=${deptId}&startDate=${startDate}&endDate=${endDate}`, {
// // //           headers: { Authorization: `Bearer ${token}` },
// // //         }).then((r) => r.json())
// // //       );

// // //       const responses = await Promise.all(promises);
// // //       const allOTRecords = responses.flatMap((r) => r.records || []);

// // //       const groupedData = {};
// // //       allOTRecords.forEach((record) => {
// // //         const empId = record.employeeId;
// // //         if (!groupedData[empId]) {
// // //           groupedData[empId] = {
// // //             employeeId: record.employeeId,
// // //             employeeName: `${record.employee?.firstName || ""} ${record.employee?.lastName || ""}`.trim(),
// // //             employeeCode: record.employee?.employeeCode || "N/A",
// // //             department: record.department?.departmentName || record.department?.name || "N/A",
// // //             departmentId: record.departmentId,
// // //             basicSalary: record.basicSalary || 0,
// // //             hourlyRate: record.hourlyRate || 0,
// // //             dailyOT: {},
// // //             totalOT: 0,
// // //             otAmount: 0,
// // //           };
// // //         }
// // //         const day = new Date(record.date).getDate();
// // //         groupedData[empId].dailyOT[day] = record.otHours;
// // //       });

// // //       Object.keys(groupedData).forEach((empId) => {
// // //         const emp = groupedData[empId];
// // //         emp.totalOT = parseFloat(Object.values(emp.dailyOT).reduce((sum, h) => sum + Number(h), 0).toFixed(2));
// // //         emp.otAmount = parseFloat((emp.totalOT * emp.hourlyRate).toFixed(2));
// // //       });

// // //       const reportArray = Object.values(groupedData).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
// // //       setReportData(reportArray);
// // //       setCurrentPage(1);
// // //     } catch (err) {
// // //       setError("Failed to generate report");
// // //       setReportData([]);
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   const handleDepartmentToggle = (deptId) => {
// // //     setSelectedDepartments((prev) =>
// // //       prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
// // //     );
// // //   };

// // //   useEffect(() => { fetchCompanies(); }, []);
// // //   useEffect(() => { if (selectedCompanyId) fetchDepartments(selectedCompanyId); }, [selectedCompanyId]);

// // //   const daysInMonth = getDaysInMonth(parse(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`, "yyyy-MM-dd", new Date()));
// // //   const totalPages = Math.ceil(reportData.length / itemsPerPage);
// // //   const startIdx = (currentPage - 1) * itemsPerPage;
// // //   const paginatedData = reportData.slice(startIdx, startIdx + itemsPerPage);

// // //   // ── Cumulative Summary Calculations ──────────────────────────
// // //   const totalOTHours = parseFloat(reportData.reduce((sum, emp) => sum + emp.totalOT, 0).toFixed(2));
// // //   const totalOTAmount = parseFloat(reportData.reduce((sum, emp) => sum + emp.otAmount, 0).toFixed(2));

// // //   // Per-department breakdown for summary
// // //   const deptSummary = reportData.reduce((acc, emp) => {
// // //     const key = emp.department;
// // //     if (!acc[key]) acc[key] = { department: key, totalOT: 0, otAmount: 0, employeeCount: 0 };
// // //     acc[key].totalOT = parseFloat((acc[key].totalOT + emp.totalOT).toFixed(2));
// // //     acc[key].otAmount = parseFloat((acc[key].otAmount + emp.otAmount).toFixed(2));
// // //     acc[key].employeeCount += 1;
// // //     return acc;
// // //   }, {});
// // //   const deptSummaryArray = Object.values(deptSummary);

// // //   const monthLabel = reportData.length > 0
// // //     ? format(parse(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`, "yyyy-MM-dd", new Date()), "MMMM yyyy")
// // //     : "";

// // //   return (
// // //     <div className="p-6 max-w-full mx-auto">
// // //       <h1 className="text-3xl font-bold mb-6 text-gray-800">OT Hours Report</h1>

// // //       {error && (
// // //         <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">{error}</div>
// // //       )}

// // //       {/* Filter Section */}
// // //       <div className="bg-white shadow rounded-lg p-6 mb-6">
// // //         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
// // //           <div>
// // //             <label className="block text-sm font-semibold mb-2 text-gray-700">Year <span className="text-red-500">*</span></label>
// // //             <input type="number" min="2020" max={new Date().getFullYear() + 1} value={selectedYear}
// // //               onChange={(e) => setSelectedYear(Number(e.target.value))}
// // //               className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
// // //           </div>
// // //           <div>
// // //             <label className="block text-sm font-semibold mb-2 text-gray-700">Month <span className="text-red-500">*</span></label>
// // //             <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
// // //               className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
// // //               <option value={0}>Select Month</option>
// // //               {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
// // //                 <option key={i+1} value={i+1}>{m}</option>
// // //               ))}
// // //             </select>
// // //           </div>
// // //           <div>
// // //             <label className="block text-sm font-semibold mb-2 text-gray-700">Company <span className="text-red-500">*</span></label>
// // //             <select value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)}
// // //               className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
// // //               <option value="">Select Company</option>
// // //               {companies.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
// // //             </select>
// // //           </div>
// // //           <div>
// // //             <label className="block text-sm font-semibold mb-2 text-gray-700">
// // //               Departments <span className="text-red-500">*</span> ({selectedDepartments.length})
// // //             </label>
// // //           </div>
// // //         </div>

// // //         <div className="mb-4">
// // //           <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
// // //             {!selectedCompanyId ? (
// // //               <p className="text-gray-500 text-sm">Select a company first to see departments</p>
// // //             ) : departments.length === 0 ? (
// // //               <p className="text-gray-500 text-sm">No departments found for this company</p>
// // //             ) : (
// // //               <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
// // //                 {departments.map((dept) => (
// // //                   <label key={dept.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
// // //                     <input type="checkbox" checked={selectedDepartments.includes(dept.id)}
// // //                       onChange={() => handleDepartmentToggle(dept.id)}
// // //                       className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
// // //                     <span className="ml-2 text-sm text-gray-700">{dept.departmentName || dept.name}</span>
// // //                   </label>
// // //                 ))}
// // //               </div>
// // //             )}
// // //           </div>
// // //         </div>

// // //         <div className="flex justify-end gap-2">
// // //           <button onClick={() => { setReportData([]); setReportGenerated(false); setActiveSummary(null); }}
// // //             className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition">
// // //             Clear
// // //           </button>
// // //           <button onClick={fetchOTReport}
// // //             disabled={loading || !selectedCompanyId || selectedDepartments.length === 0}
// // //             className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition">
// // //             {loading ? "Generating..." : "Generate Report"}
// // //           </button>
// // //         </div>
// // //       </div>

// // //       {/* Report Table */}
// // //       {reportData.length > 0 && (
// // //         <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
// // //           <div className="bg-gray-100 p-4 border-b">
// // //             <h2 className="text-lg font-semibold text-gray-800">
// // //               {monthLabel} - {reportData.length} Employee(s)
// // //             </h2>
// // //           </div>

// // //           <div className="overflow-x-auto">
// // //             <table className="w-full border-collapse text-sm">
// // //               <thead className="bg-gray-50 sticky top-0">
// // //                 <tr>
// // //                   <th className="border p-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 w-12">S.No</th>
// // //                   <th className="border p-2 text-left font-semibold text-gray-700 sticky left-12 bg-gray-50 w-20">ID</th>
// // //                   <th className="border p-2 text-left font-semibold text-gray-700 sticky left-32 bg-gray-50 w-40">Name</th>
// // //                   <th className="border p-2 text-left font-semibold text-gray-700 w-32">Department</th>
// // //                   {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
// // //                     <th key={`day-${day}`} className="border p-2 text-center font-semibold text-gray-700 bg-blue-50 w-12">
// // //                       {day}
// // //                     </th>
// // //                   ))}
// // //                   <th className="border p-2 text-center font-semibold text-gray-700 bg-green-50 w-16 sticky right-20">Total</th>
// // //                   <th className="border p-2 text-center font-semibold text-gray-700 bg-orange-50 w-20 sticky right-0">OT Amount</th>
// // //                 </tr>
// // //               </thead>
// // //               <tbody>
// // //                 {paginatedData.map((employee, idx) => (
// // //                   <tr key={employee.employeeId} className="hover:bg-gray-50 border-b">
// // //                     <td className="border p-2 text-center sticky left-0 bg-white">{startIdx + idx + 1}</td>
// // //                     <td className="border p-2 sticky left-12 bg-white text-sm">{employee.employeeCode}</td>
// // //                     <td className="border p-2 sticky left-32 bg-white text-sm font-medium">{employee.employeeName}</td>
// // //                     <td className="border p-2 text-sm">{employee.department}</td>
// // //                     {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
// // //                       <td key={`ot-${employee.employeeId}-${day}`} className="border p-2 text-center text-sm bg-blue-50">
// // //                         {employee.dailyOT[day] ? parseFloat(employee.dailyOT[day]).toFixed(2) : "-"}
// // //                       </td>
// // //                     ))}
// // //                     <td className="border p-2 text-center font-bold text-green-700 bg-green-50 sticky right-20">
// // //                       {employee.totalOT.toFixed(2)}
// // //                     </td>
// // //                     <td className="border p-2 text-center font-bold text-orange-700 bg-orange-50 sticky right-0">
// // //                       ₹ {employee.otAmount.toFixed(2)}
// // //                     </td>
// // //                   </tr>
// // //                 ))}
// // //               </tbody>
// // //             </table>
// // //           </div>

// // //           {totalPages > 1 && (
// // //             <div className="bg-gray-100 p-4 flex justify-between items-center border-t">
// // //               <p className="text-sm text-gray-700">
// // //                 Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, reportData.length)} of {reportData.length} records
// // //               </p>
// // //               <div className="flex gap-2">
// // //                 <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}
// // //                   className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">Previous</button>
// // //                 {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
// // //                   <button key={page} onClick={() => setCurrentPage(page)}
// // //                     className={`px-3 py-1 rounded text-sm ${currentPage === page ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-800 hover:bg-gray-400"}`}>
// // //                     {page}
// // //                   </button>
// // //                 ))}
// // //                 <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}
// // //                   className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">Next</button>
// // //               </div>
// // //             </div>
// // //           )}
// // //         </div>
// // //       )}

// // //       {/* ── Cumulative Summary Section ─────────────────────────── */}
// // //       {reportData.length > 0 && (
// // //         <div className="bg-white shadow rounded-lg overflow-hidden">
// // //           <div className="bg-gray-100 p-4 border-b">
// // //             <h2 className="text-lg font-semibold text-gray-800">
// // //               Cumulative Summary — {monthLabel}
// // //             </h2>
// // //           </div>

// // //           {/* Summary Cards */}
// // //           <div className="p-4 grid grid-cols-2 gap-4">
// // //             <div className="py-4 rounded-xl border-2 bg-green-50 border-green-300 text-green-700 flex flex-col items-center gap-1">
// // //               <span className="text-2xl font-bold">{totalOTHours.toFixed(2)} hrs</span>
// // //               <span className="text-sm font-medium opacity-80">Total OT Hours</span>
// // //             </div>
// // //             <div className="py-4 rounded-xl border-2 bg-orange-50 border-orange-300 text-orange-700 flex flex-col items-center gap-1">
// // //               <span className="text-2xl font-bold">₹ {Math.round(totalOTAmount)}</span>
// // //               <span className="text-sm font-medium opacity-80">Total OT Amount</span>
// // //             </div>
// // //           </div>

// // //           {/* Employee-wise breakdown table */}
// // //           <div className="px-4 pb-4">
// // //             <div className="border border-gray-200 rounded-lg overflow-hidden">
// // //               <table className="w-full text-sm border-collapse">
// // //                 <thead>
// // //                   <tr className="bg-blue-700 text-white">
// // //                     <th className="p-3 text-left font-semibold">S.No</th>
// // //                     <th className="p-3 text-left font-semibold">Name</th>
// // //                     <th className="p-3 text-left font-semibold">Dept</th>
// // //                     <th className="p-3 text-center font-semibold">Wages/Hr</th>
// // //                     <th className="p-3 text-center font-semibold">OT Hours</th>
// // //                     <th className="p-3 text-center font-semibold">OT Hrs Amt</th>
// // //                     <th className="p-3 text-center font-semibold">Net Wages</th>
// // //                   </tr>
// // //                 </thead>
// // //                 <tbody>
// // //                   {reportData.map((emp, idx) => {
// // //                     const wagesPerHour = parseFloat(emp.hourlyRate.toFixed(2));
// // //                     const otHrsAmt = Math.round(emp.otAmount);
// // //                     const netWages = Math.round(emp.otAmount / 10) * 10;
// // //                     return (
// // //                       <tr key={emp.employeeId} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
// // //                         <td className="p-3 text-gray-600">{idx + 1}</td>
// // //                         <td className="p-3 font-medium text-gray-800">{emp.employeeName}</td>
// // //                         <td className="p-3 text-gray-600">{emp.department}</td>
// // //                         <td className="p-3 text-center text-gray-700">{wagesPerHour.toFixed(2)}</td>
// // //                         <td className="p-3 text-center font-semibold text-green-700">{emp.totalOT.toFixed(2)}</td>
// // //                         <td className="p-3 text-center font-semibold text-orange-600">{otHrsAmt}</td>
// // //                         <td className="p-3 text-center font-bold text-blue-700">{netWages}</td>
// // //                       </tr>
// // //                     );
// // //                   })}
// // //                 </tbody>
// // //                 <tfoot>
// // //                   <tr className="bg-gray-100 font-bold border-t-2 border-gray-300 text-gray-800">
// // //                     <td className="p-3" colSpan={3}>Grand Total</td>
// // //                     <td className="p-3 text-center">—</td>
// // //                     <td className="p-3 text-center text-green-700">{totalOTHours.toFixed(2)}</td>
// // //                     <td className="p-3 text-center text-orange-600">{Math.round(totalOTAmount)}</td>
// // //                     <td className="p-3 text-center text-blue-700">
// // //                       {reportData.reduce((sum, emp) => sum + Math.round(emp.otAmount / 10) * 10, 0)}
// // //                     </td>
// // //                   </tr>
// // //                 </tfoot>
// // //               </table>
// // //             </div>
// // //           </div>
// // //         </div>
// // //       )}

// // //       {!loading && reportData.length === 0 && selectedDepartments.length > 0 && reportGenerated && (
// // //         <div className="bg-white shadow rounded-lg p-8 text-center">
// // //           <p className="text-gray-500 text-lg">No OT hours data found for the selected filters.</p>
// // //         </div>
// // //       )}

// // //       {!loading && reportData.length === 0 && selectedDepartments.length === 0 && (
// // //         <div className="bg-white shadow rounded-lg p-8 text-center">
// // //           <p className="text-gray-500 text-lg">Select filters and click "Generate Report" to view OT hours data.</p>
// // //         </div>
// // //       )}
// // //     </div>
// // //   );
// // // };

// // // export default OTReport;


// // import React, { useState, useEffect } from "react";
// // import { format, getDaysInMonth, parse } from "date-fns";

// // const OTReport = () => {
// //   const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
// //   const token = sessionStorage.getItem("token");

// //   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
// //   const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
// //   const [selectedCompanyId, setSelectedCompanyId] = useState("");
// //   const [selectedDepartments, setSelectedDepartments] = useState([]);
// //   const [companies, setCompanies] = useState([]);
// //   const [departments, setDepartments] = useState([]);
// //   const [reportData, setReportData] = useState([]);
// //   const [loading, setLoading] = useState(false);
// //   const [error, setError] = useState("");
// //   const [reportGenerated, setReportGenerated] = useState(false);
// //   const [currentPage, setCurrentPage] = useState(1);
// //   const [activeSummary, setActiveSummary] = useState(null); // "hours" | "amount" | null
// //   const itemsPerPage = 10;

// //   const fetchCompanies = async () => {
// //     try {
// //       const res = await fetch(`${BASE_URL}/api/companies`, {
// //         headers: { Authorization: `Bearer ${token}` },
// //       });
// //       const data = await res.json();
// //       const compList = Array.isArray(data) ? data : data.companies || [];
// //       setCompanies(compList);
// //       if (compList.length > 0) setSelectedCompanyId(compList[0].id);
// //     } catch (err) {
// //       setError("Failed to fetch companies");
// //     }
// //   };

// //   const fetchDepartments = async (companyId) => {
// //     if (!companyId) { setDepartments([]); setSelectedDepartments([]); return; }
// //     try {
// //       const res = await fetch(`${BASE_URL}/api/departments?companyId=${companyId}`, {
// //         headers: { Authorization: `Bearer ${token}` },
// //       });
// //       const data = await res.json();
// //       setDepartments(Array.isArray(data) ? data : data.departments || []);
// //       setSelectedDepartments([]);
// //     } catch (err) {
// //       setError("Failed to fetch departments");
// //     }
// //   };

// //   const fetchOTReport = async () => {
// //     setReportGenerated(true);
// //     setLoading(true);
// //     setError("");
// //     setActiveSummary(null);

// //     try {
// //       if (!selectedCompanyId) { setError("Please select a company"); setLoading(false); return; }
// //       if (selectedDepartments.length === 0) { setError("Please select at least one department"); setLoading(false); return; }

// //       const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
// //       const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${getDaysInMonth(parse(startDate, "yyyy-MM-dd", new Date()))}`;

// //       const promises = selectedDepartments.map((deptId) =>
// //         fetch(`${BASE_URL}/api/ot-hours/filter?companyId=${selectedCompanyId}&departmentId=${deptId}&startDate=${startDate}&endDate=${endDate}`, {
// //           headers: { Authorization: `Bearer ${token}` },
// //         }).then((r) => r.json())
// //       );

// //       const responses = await Promise.all(promises);
// //       const allOTRecords = responses.flatMap((r) => r.records || []);

// //       const groupedData = {};
// //       allOTRecords.forEach((record) => {
// //         const empId = record.employeeId;
// //         if (!groupedData[empId]) {
// //           groupedData[empId] = {
// //             employeeId: record.employeeId,
// //             employeeName: `${record.employee?.firstName || ""} ${record.employee?.lastName || ""}`.trim(),
// //             employeeCode: record.employee?.employeeCode || "N/A",
// //             department: record.department?.departmentName || record.department?.name || "N/A",
// //             departmentId: record.departmentId,
// //             basicSalary: record.basicSalary || 0,
// //             hourlyRate: record.hourlyRate || 0,
// //             dailyOT: {},
// //             totalOT: 0,
// //             otAmount: 0,
// //           };
// //         }
// //         const day = new Date(record.date).getDate();
// //         groupedData[empId].dailyOT[day] = record.otHours;
// //       });

// //       Object.keys(groupedData).forEach((empId) => {
// //         const emp = groupedData[empId];
// //         emp.totalOT = parseFloat(Object.values(emp.dailyOT).reduce((sum, h) => sum + Number(h), 0).toFixed(2));
// //         emp.otAmount = parseFloat((emp.totalOT * emp.hourlyRate).toFixed(2));
// //       });

// //       const reportArray = Object.values(groupedData).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
// //       setReportData(reportArray);
// //       setCurrentPage(1);
// //     } catch (err) {
// //       setError("Failed to generate report");
// //       setReportData([]);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const handleDepartmentToggle = (deptId) => {
// //     setSelectedDepartments((prev) =>
// //       prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
// //     );
// //   };

// //   useEffect(() => { fetchCompanies(); }, []);
// //   useEffect(() => { if (selectedCompanyId) fetchDepartments(selectedCompanyId); }, [selectedCompanyId]);

// //   const daysInMonth = getDaysInMonth(parse(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`, "yyyy-MM-dd", new Date()));
// //   const totalPages = Math.ceil(reportData.length / itemsPerPage);
// //   const startIdx = (currentPage - 1) * itemsPerPage;
// //   const paginatedData = reportData.slice(startIdx, startIdx + itemsPerPage);

// //   // ── Cumulative Summary Calculations ──────────────────────────
// //   const totalOTHours = parseFloat(reportData.reduce((sum, emp) => sum + emp.totalOT, 0).toFixed(2));
// //   const totalOTAmount = parseFloat(reportData.reduce((sum, emp) => sum + emp.otAmount, 0).toFixed(2));

// //   // Per-department breakdown for summary
// //   const deptSummary = reportData.reduce((acc, emp) => {
// //     const key = emp.department;
// //     if (!acc[key]) acc[key] = { department: key, totalOT: 0, otAmount: 0, employeeCount: 0 };
// //     acc[key].totalOT = parseFloat((acc[key].totalOT + emp.totalOT).toFixed(2));
// //     acc[key].otAmount = parseFloat((acc[key].otAmount + emp.otAmount).toFixed(2));
// //     acc[key].employeeCount += 1;
// //     return acc;
// //   }, {});
// //   const deptSummaryArray = Object.values(deptSummary);

// //   const monthLabel = reportData.length > 0
// //     ? format(parse(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`, "yyyy-MM-dd", new Date()), "MMMM yyyy")
// //     : "";

// //   return (
// //     <div className="p-6 max-w-full mx-auto">
// //       <h1 className="text-3xl font-bold mb-6 text-gray-800">OT Hours Report</h1>

// //       {error && (
// //         <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">{error}</div>
// //       )}

// //       {/* Filter Section */}
// //       <div className="bg-white shadow rounded-lg p-6 mb-6">
// //         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
// //           <div>
// //             <label className="block text-sm font-semibold mb-2 text-gray-700">Year <span className="text-red-500">*</span></label>
// //             <input type="number" min="2020" max={new Date().getFullYear() + 1} value={selectedYear}
// //               onChange={(e) => setSelectedYear(Number(e.target.value))}
// //               className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
// //           </div>
// //           <div>
// //             <label className="block text-sm font-semibold mb-2 text-gray-700">Month <span className="text-red-500">*</span></label>
// //             <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
// //               className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
// //               <option value={0}>Select Month</option>
// //               {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
// //                 <option key={i+1} value={i+1}>{m}</option>
// //               ))}
// //             </select>
// //           </div>
// //           <div>
// //             <label className="block text-sm font-semibold mb-2 text-gray-700">Company <span className="text-red-500">*</span></label>
// //             <select value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)}
// //               className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
// //               <option value="">Select Company</option>
// //               {companies.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
// //             </select>
// //           </div>
// //           <div>
// //             <label className="block text-sm font-semibold mb-2 text-gray-700">
// //               Departments <span className="text-red-500">*</span> ({selectedDepartments.length})
// //             </label>
// //           </div>
// //         </div>

// //         <div className="mb-4">
// //           <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
// //             {!selectedCompanyId ? (
// //               <p className="text-gray-500 text-sm">Select a company first to see departments</p>
// //             ) : departments.length === 0 ? (
// //               <p className="text-gray-500 text-sm">No departments found for this company</p>
// //             ) : (
// //               <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
// //                 {departments.map((dept) => (
// //                   <label key={dept.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
// //                     <input type="checkbox" checked={selectedDepartments.includes(dept.id)}
// //                       onChange={() => handleDepartmentToggle(dept.id)}
// //                       className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
// //                     <span className="ml-2 text-sm text-gray-700">{dept.departmentName || dept.name}</span>
// //                   </label>
// //                 ))}
// //               </div>
// //             )}
// //           </div>
// //         </div>

// //         <div className="flex justify-end gap-2">
// //           <button onClick={() => { setReportData([]); setReportGenerated(false); setActiveSummary(null); }}
// //             className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition">
// //             Clear
// //           </button>
// //           <button onClick={fetchOTReport}
// //             disabled={loading || !selectedCompanyId || selectedDepartments.length === 0}
// //             className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition">
// //             {loading ? "Generating..." : "Generate Report"}
// //           </button>
// //         </div>
// //       </div>

// //       {/* Report Table */}
// //       {reportData.length > 0 && (
// //         <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
// //           <div className="bg-gray-100 p-4 border-b">
// //             <h2 className="text-lg font-semibold text-gray-800">
// //               {monthLabel} - {reportData.length} Employee(s)
// //             </h2>
// //           </div>

// //           <div className="overflow-x-auto">
// //             <table className="w-full border-collapse text-sm">
// //               <thead className="bg-gray-50 sticky top-0">
// //                 <tr>
// //                   <th className="border p-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 w-12">S.No</th>
// //                   <th className="border p-2 text-left font-semibold text-gray-700 sticky left-12 bg-gray-50 w-20">ID</th>
// //                   <th className="border p-2 text-left font-semibold text-gray-700 sticky left-32 bg-gray-50 w-40">Name</th>
// //                   <th className="border p-2 text-left font-semibold text-gray-700 w-32">Department</th>
// //                   {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
// //                     <th key={`day-${day}`} className="border p-2 text-center font-semibold text-gray-700 bg-blue-50 w-12">
// //                       {day}
// //                     </th>
// //                   ))}
// //                   <th className="border p-2 text-center font-semibold text-gray-700 bg-green-50 w-16 sticky right-20">Total</th>
// //                   <th className="border p-2 text-center font-semibold text-gray-700 bg-orange-50 w-20 sticky right-0">OT Amount</th>
// //                 </tr>
// //               </thead>
// //               <tbody>
// //                 {paginatedData.map((employee, idx) => (
// //                   <tr key={employee.employeeId} className="hover:bg-gray-50 border-b">
// //                     <td className="border p-2 text-center sticky left-0 bg-white">{startIdx + idx + 1}</td>
// //                     <td className="border p-2 sticky left-12 bg-white text-sm">{employee.employeeCode}</td>
// //                     <td className="border p-2 sticky left-32 bg-white text-sm font-medium">{employee.employeeName}</td>
// //                     <td className="border p-2 text-sm">{employee.department}</td>
// //                     {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
// //                       <td key={`ot-${employee.employeeId}-${day}`} className="border p-2 text-center text-sm bg-blue-50">
// //                         {employee.dailyOT[day] ? parseFloat(employee.dailyOT[day]).toFixed(2) : "-"}
// //                       </td>
// //                     ))}
// //                     <td className="border p-2 text-center font-bold text-green-700 bg-green-50 sticky right-20">
// //                       {employee.totalOT.toFixed(2)}
// //                     </td>
// //                     <td className="border p-2 text-center font-bold text-orange-700 bg-orange-50 sticky right-0">
// //                       ₹ {employee.otAmount.toFixed(2)}
// //                     </td>
// //                   </tr>
// //                 ))}
// //               </tbody>
// //             </table>
// //           </div>

// //           {totalPages > 1 && (
// //             <div className="bg-gray-100 p-4 flex justify-between items-center border-t">
// //               <p className="text-sm text-gray-700">
// //                 Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, reportData.length)} of {reportData.length} records
// //               </p>
// //               <div className="flex gap-2">
// //                 <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}
// //                   className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">Previous</button>
// //                 {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
// //                   <button key={page} onClick={() => setCurrentPage(page)}
// //                     className={`px-3 py-1 rounded text-sm ${currentPage === page ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-800 hover:bg-gray-400"}`}>
// //                     {page}
// //                   </button>
// //                 ))}
// //                 <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}
// //                   className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">Next</button>
// //               </div>
// //             </div>
// //           )}
// //         </div>
// //       )}

// //       {/* ── Cumulative Summary Section ─────────────────────────── */}
// //       {reportData.length > 0 && (
// //         <div className="bg-white shadow rounded-lg overflow-hidden">
// //           <div className="bg-gray-100 p-4 border-b">
// //             <h2 className="text-lg font-semibold text-gray-800">
// //               Cumulative Summary — {monthLabel}
// //             </h2>
// //           </div>

// //           {/* Two Clickable Buttons */}
// //           <div className="p-4 flex gap-4">
// //             <button
// //               onClick={() => setActiveSummary(activeSummary === "hours" ? null : "hours")}
// //               className={`flex-1 py-4 rounded-xl border-2 font-semibold text-lg transition-all duration-200 flex flex-col items-center gap-1
// //                 ${activeSummary === "hours"
// //                   ? "bg-green-600 border-green-600 text-white shadow-lg scale-[1.02]"
// //                   : "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"}`}
// //             >
// //               <span className="text-2xl font-bold">{totalOTHours.toFixed(2)} hrs</span>
// //               <span className="text-sm font-medium opacity-80">Total OT Hours</span>
// //             </button>

// //             <button
// //               onClick={() => setActiveSummary(activeSummary === "amount" ? null : "amount")}
// //               className={`flex-1 py-4 rounded-xl border-2 font-semibold text-lg transition-all duration-200 flex flex-col items-center gap-1
// //                 ${activeSummary === "amount"
// //                   ? "bg-orange-500 border-orange-500 text-white shadow-lg scale-[1.02]"
// //                   : "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"}`}
// //             >
// //               <span className="text-2xl font-bold">₹ {Math.round(totalOTAmount)}</span>
// //               <span className="text-sm font-medium opacity-80">Total OT Amount</span>
// //             </button>
// //           </div>

// //           {/* Expanded Employee-wise breakdown */}
// //           {activeSummary && (
// //             <div className="px-4 pb-4">
// //               <div className="border border-gray-200 rounded-lg overflow-hidden">
// //                 <table className="w-full text-sm border-collapse">
// //                   <thead>
// //                     <tr className={`${activeSummary === "hours" ? "bg-green-600" : "bg-orange-500"} text-white`}>
// //                       <th className="p-3 text-left font-semibold">S.No</th>
// //                       <th className="p-3 text-left font-semibold">Name</th>
// //                       <th className="p-3 text-left font-semibold">Dept</th>
// //                       <th className="p-3 text-center font-semibold">Wages/Hr</th>
// //                       <th className="p-3 text-center font-semibold">OT Hours</th>
// //                       <th className="p-3 text-center font-semibold">OT Hrs Amt</th>
// //                       <th className="p-3 text-center font-semibold">Net Wages</th>
// //                     </tr>
// //                   </thead>
// //                   <tbody>
// //                     {reportData.map((emp, idx) => {
// //                       const wagesPerHour = parseFloat(emp.hourlyRate.toFixed(2));
// //                       const otHrsAmt = Math.round(emp.otAmount);
// //                       const netWages = Math.round(emp.otAmount / 10) * 10;
// //                       return (
// //                         <tr key={emp.employeeId} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
// //                           <td className="p-3 text-gray-600">{idx + 1}</td>
// //                           <td className="p-3 font-medium text-gray-800">{emp.employeeName}</td>
// //                           <td className="p-3 text-gray-600">{emp.department}</td>
// //                           <td className="p-3 text-center text-gray-700">{wagesPerHour.toFixed(2)}</td>
// //                           <td className="p-3 text-center font-semibold text-green-700">{emp.totalOT.toFixed(2)}</td>
// //                           <td className="p-3 text-center font-semibold text-orange-600">{otHrsAmt}</td>
// //                           <td className="p-3 text-center font-bold text-blue-700">{netWages}</td>
// //                         </tr>
// //                       );
// //                     })}
// //                   </tbody>
// //                   <tfoot>
// //                     <tr className={`${activeSummary === "hours" ? "bg-green-50 text-green-800" : "bg-orange-50 text-orange-800"} font-bold border-t-2 border-gray-300`}>
// //                       <td className="p-3" colSpan={3}>Grand Total</td>
// //                       <td className="p-3 text-center">—</td>
// //                       <td className="p-3 text-center">{totalOTHours.toFixed(2)}</td>
// //                       <td className="p-3 text-center">{Math.round(totalOTAmount)}</td>
// //                       <td className="p-3 text-center">
// //                         {reportData.reduce((sum, emp) => sum + Math.round(emp.otAmount / 10) * 10, 0)}
// //                       </td>
// //                     </tr>
// //                   </tfoot>
// //                 </table>
// //               </div>
// //             </div>
// //           )}
// //         </div>
// //       )}

// //       {!loading && reportData.length === 0 && selectedDepartments.length > 0 && reportGenerated && (
// //         <div className="bg-white shadow rounded-lg p-8 text-center">
// //           <p className="text-gray-500 text-lg">No OT hours data found for the selected filters.</p>
// //         </div>
// //       )}

// //       {!loading && reportData.length === 0 && selectedDepartments.length === 0 && (
// //         <div className="bg-white shadow rounded-lg p-8 text-center">
// //           <p className="text-gray-500 text-lg">Select filters and click "Generate Report" to view OT hours data.</p>
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default OTReport;


// import React, { useState, useEffect } from "react";
// import { format, getDaysInMonth, parse } from "date-fns";

// const OTReport = () => {
//   const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
//   const token = sessionStorage.getItem("token");

//   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
//   const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
//   const [selectedCompanyId, setSelectedCompanyId] = useState("");
//   const [selectedDepartments, setSelectedDepartments] = useState([]);
//   const [companies, setCompanies] = useState([]);
//   const [departments, setDepartments] = useState([]);
//   const [reportData, setReportData] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [reportGenerated, setReportGenerated] = useState(false);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [activeSummary, setActiveSummary] = useState(null); // "hours" | "amount" | null
//   const itemsPerPage = 10;

//   const fetchCompanies = async () => {
//     try {
//       const res = await fetch(`${BASE_URL}/api/companies`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       const compList = Array.isArray(data) ? data : data.companies || [];
//       setCompanies(compList);
//       if (compList.length > 0) setSelectedCompanyId(compList[0].id);
//     } catch (err) {
//       setError("Failed to fetch companies");
//     }
//   };

//   const fetchDepartments = async (companyId) => {
//     if (!companyId) { setDepartments([]); setSelectedDepartments([]); return; }
//     try {
//       const res = await fetch(`${BASE_URL}/api/departments?companyId=${companyId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       setDepartments(Array.isArray(data) ? data : data.departments || []);
//       setSelectedDepartments([]);
//     } catch (err) {
//       setError("Failed to fetch departments");
//     }
//   };

//   const fetchOTReport = async () => {
//     setReportGenerated(true);
//     setLoading(true);
//     setError("");
//     setActiveSummary(null);

//     try {
//       if (!selectedCompanyId) { setError("Please select a company"); setLoading(false); return; }
//       if (selectedDepartments.length === 0) { setError("Please select at least one department"); setLoading(false); return; }

//       const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
//       const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${getDaysInMonth(parse(startDate, "yyyy-MM-dd", new Date()))}`;

//       const promises = selectedDepartments.map((deptId) =>
//         fetch(`${BASE_URL}/api/ot-hours/filter?companyId=${selectedCompanyId}&departmentId=${deptId}&startDate=${startDate}&endDate=${endDate}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         }).then((r) => r.json())
//       );

//       const responses = await Promise.all(promises);
//       const allOTRecords = responses.flatMap((r) => r.records || []);

//       const groupedData = {};
//       allOTRecords.forEach((record) => {
//         const empId = record.employeeId;
//         if (!groupedData[empId]) {
//           groupedData[empId] = {
//             employeeId: record.employeeId,
//             employeeName: `${record.employee?.firstName || ""} ${record.employee?.lastName || ""}`.trim(),
//             employeeCode: record.employee?.employeeCode || "N/A",
//             department: record.department?.departmentName || record.department?.name || "N/A",
//             departmentId: record.departmentId,
//             basicSalary: record.basicSalary || 0,
//             hourlyRate: record.hourlyRate || 0,
//             dailyOT: {},
//             totalOT: 0,
//             otAmount: 0,
//           };
//         }
//         const day = new Date(record.date).getDate();
//         groupedData[empId].dailyOT[day] = record.otHours;
//       });

//       Object.keys(groupedData).forEach((empId) => {
//         const emp = groupedData[empId];
//         emp.totalOT = parseFloat(Object.values(emp.dailyOT).reduce((sum, h) => sum + Number(h), 0).toFixed(2));
//         emp.otAmount = parseFloat((emp.totalOT * emp.hourlyRate).toFixed(2));
//       });

//       const reportArray = Object.values(groupedData).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
//       setReportData(reportArray);
//       setCurrentPage(1);
//     } catch (err) {
//       setError("Failed to generate report");
//       setReportData([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDepartmentToggle = (deptId) => {
//     setSelectedDepartments((prev) =>
//       prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
//     );
//   };

//   useEffect(() => { fetchCompanies(); }, []);
//   useEffect(() => { if (selectedCompanyId) fetchDepartments(selectedCompanyId); }, [selectedCompanyId]);

//   const daysInMonth = getDaysInMonth(parse(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`, "yyyy-MM-dd", new Date()));
//   const totalPages = Math.ceil(reportData.length / itemsPerPage);
//   const startIdx = (currentPage - 1) * itemsPerPage;
//   const paginatedData = reportData.slice(startIdx, startIdx + itemsPerPage);

//   // ── Cumulative Summary Calculations ──────────────────────────
//   const totalOTHours = parseFloat(reportData.reduce((sum, emp) => sum + emp.totalOT, 0).toFixed(2));
//   const totalOTAmount = parseFloat(reportData.reduce((sum, emp) => sum + emp.otAmount, 0).toFixed(2));

//   // Per-department breakdown for summary
//   const deptSummary = reportData.reduce((acc, emp) => {
//     const key = emp.department;
//     if (!acc[key]) acc[key] = { department: key, totalOT: 0, otAmount: 0, employeeCount: 0 };
//     acc[key].totalOT = parseFloat((acc[key].totalOT + emp.totalOT).toFixed(2));
//     acc[key].otAmount = parseFloat((acc[key].otAmount + emp.otAmount).toFixed(2));
//     acc[key].employeeCount += 1;
//     return acc;
//   }, {});
//   const deptSummaryArray = Object.values(deptSummary);

//   const monthLabel = reportData.length > 0
//     ? format(parse(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`, "yyyy-MM-dd", new Date()), "MMMM yyyy")
//     : "";

//   return (
//     <div className="p-6 max-w-full mx-auto">
//       <h1 className="text-3xl font-bold mb-6 text-gray-800">OT Hours Report</h1>

//       {error && (
//         <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">{error}</div>
//       )}

//       {/* Filter Section */}
//       <div className="bg-white shadow rounded-lg p-6 mb-6">
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
//           <div>
//             <label className="block text-sm font-semibold mb-2 text-gray-700">Year <span className="text-red-500">*</span></label>
//             <input type="number" min="2020" max={new Date().getFullYear() + 1} value={selectedYear}
//               onChange={(e) => setSelectedYear(Number(e.target.value))}
//               className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
//           </div>
//           <div>
//             <label className="block text-sm font-semibold mb-2 text-gray-700">Month <span className="text-red-500">*</span></label>
//             <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
//               className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
//               <option value={0}>Select Month</option>
//               {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
//                 <option key={i+1} value={i+1}>{m}</option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label className="block text-sm font-semibold mb-2 text-gray-700">Company <span className="text-red-500">*</span></label>
//             <select value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)}
//               className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
//               <option value="">Select Company</option>
//               {companies.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
//             </select>
//           </div>
//           <div>
//             <label className="block text-sm font-semibold mb-2 text-gray-700">
//               Departments <span className="text-red-500">*</span> ({selectedDepartments.length})
//             </label>
//           </div>
//         </div>

//         <div className="mb-4">
//           <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
//             {!selectedCompanyId ? (
//               <p className="text-gray-500 text-sm">Select a company first to see departments</p>
//             ) : departments.length === 0 ? (
//               <p className="text-gray-500 text-sm">No departments found for this company</p>
//             ) : (
//               <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
//                 {departments.map((dept) => (
//                   <label key={dept.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
//                     <input type="checkbox" checked={selectedDepartments.includes(dept.id)}
//                       onChange={() => handleDepartmentToggle(dept.id)}
//                       className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
//                     <span className="ml-2 text-sm text-gray-700">{dept.departmentName || dept.name}</span>
//                   </label>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         <div className="flex justify-end gap-2">
//           <button onClick={() => { setReportData([]); setReportGenerated(false); setActiveSummary(null); }}
//             className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition">
//             Clear
//           </button>
//           <button onClick={fetchOTReport}
//             disabled={loading || !selectedCompanyId || selectedDepartments.length === 0}
//             className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition">
//             {loading ? "Generating..." : "Generate Report"}
//           </button>
//         </div>
//       </div>

//       {/* Report Table */}
//       {reportData.length > 0 && (
//         <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
//           <div className="bg-gray-100 p-4 border-b">
//             <h2 className="text-lg font-semibold text-gray-800">
//               {monthLabel} - {reportData.length} Employee(s)
//             </h2>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full border-collapse text-sm">
//               <thead className="bg-gray-50 sticky top-0">
//                 <tr>
//                   <th className="border p-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 w-12">S.No</th>
//                   <th className="border p-2 text-left font-semibold text-gray-700 sticky left-12 bg-gray-50 w-20">ID</th>
//                   <th className="border p-2 text-left font-semibold text-gray-700 sticky left-32 bg-gray-50 w-40">Name</th>
//                   <th className="border p-2 text-left font-semibold text-gray-700 w-32">Department</th>
//                   {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
//                     <th key={`day-${day}`} className="border p-2 text-center font-semibold text-gray-700 bg-blue-50 w-12">
//                       {day}
//                     </th>
//                   ))}
//                   <th className="border p-2 text-center font-semibold text-gray-700 bg-green-50 w-16 sticky right-20">Total</th>
//                   <th className="border p-2 text-center font-semibold text-gray-700 bg-orange-50 w-20 sticky right-0">OT Amount</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {paginatedData.map((employee, idx) => (
//                   <tr key={employee.employeeId} className="hover:bg-gray-50 border-b">
//                     <td className="border p-2 text-center sticky left-0 bg-white">{startIdx + idx + 1}</td>
//                     <td className="border p-2 sticky left-12 bg-white text-sm">{employee.employeeCode}</td>
//                     <td className="border p-2 sticky left-32 bg-white text-sm font-medium">{employee.employeeName}</td>
//                     <td className="border p-2 text-sm">{employee.department}</td>
//                     {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
//                       <td key={`ot-${employee.employeeId}-${day}`} className="border p-2 text-center text-sm bg-blue-50">
//                         {employee.dailyOT[day] ? parseFloat(employee.dailyOT[day]).toFixed(2) : "-"}
//                       </td>
//                     ))}
//                     <td className="border p-2 text-center font-bold text-green-700 bg-green-50 sticky right-20">
//                       {employee.totalOT.toFixed(2)}
//                     </td>
//                     <td className="border p-2 text-center font-bold text-orange-700 bg-orange-50 sticky right-0">
//                       ₹ {employee.otAmount.toFixed(2)}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           {totalPages > 1 && (
//             <div className="bg-gray-100 p-4 flex justify-between items-center border-t">
//               <p className="text-sm text-gray-700">
//                 Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, reportData.length)} of {reportData.length} records
//               </p>
//               <div className="flex gap-2">
//                 <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}
//                   className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">Previous</button>
//                 {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
//                   <button key={page} onClick={() => setCurrentPage(page)}
//                     className={`px-3 py-1 rounded text-sm ${currentPage === page ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-800 hover:bg-gray-400"}`}>
//                     {page}
//                   </button>
//                 ))}
//                 <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}
//                   className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">Next</button>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ── Cumulative Summary Section ─────────────────────────── */}
//       {reportData.length > 0 && (
//         <div className="bg-white shadow rounded-lg overflow-hidden">
//           <div className="bg-gray-100 p-4 border-b">
//             <h2 className="text-lg font-semibold text-gray-800">
//               Cumulative Summary — {monthLabel}
//             </h2>
//           </div>

//           {/* Two Clickable Buttons */}
//           <div className="p-4 flex gap-4">
//             <button
//               onClick={() => setActiveSummary(activeSummary === "hours" ? null : "hours")}
//               className={`flex-1 py-4 rounded-xl border-2 font-semibold text-lg transition-all duration-200 flex flex-col items-center gap-1
//                 ${activeSummary === "hours"
//                   ? "bg-green-600 border-green-600 text-white shadow-lg scale-[1.02]"
//                   : "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"}`}
//             >
//               <span className="text-2xl font-bold">{totalOTHours.toFixed(2)} hrs</span>
//               <span className="text-sm font-medium opacity-80">Total OT Hours</span>
//             </button>

//             <button
//               onClick={() => setActiveSummary(activeSummary === "amount" ? null : "amount")}
//               className={`flex-1 py-4 rounded-xl border-2 font-semibold text-lg transition-all duration-200 flex flex-col items-center gap-1
//                 ${activeSummary === "amount"
//                   ? "bg-orange-500 border-orange-500 text-white shadow-lg scale-[1.02]"
//                   : "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"}`}
//             >
//               <span className="text-2xl font-bold">₹ {Math.round(totalOTAmount)}</span>
//               <span className="text-sm font-medium opacity-80">Total OT Amount</span>
//             </button>
//           </div>

//           {/* Expanded Employee-wise breakdown */}
//           {activeSummary && (
//             <div className="px-4 pb-4">
//               <div className="border border-gray-200 rounded-lg overflow-hidden">
//                 <table className="w-full text-sm border-collapse">
//                   <thead>
//                     <tr className={`${activeSummary === "hours" ? "bg-green-600" : "bg-orange-500"} text-white`}>
//                       <th className="p-3 text-left font-semibold">S.No</th>
//                       <th className="p-3 text-left font-semibold">Name</th>
//                       <th className="p-3 text-left font-semibold">Dept</th>
//                       {activeSummary === "hours" ? (
//                         <th className="p-3 text-center font-semibold">Total OT Hours</th>
//                       ) : (
//                         <>
//                           <th className="p-3 text-center font-semibold">Wages/Hr</th>
//                           <th className="p-3 text-center font-semibold">OT Hours</th>
//                           <th className="p-3 text-center font-semibold">OT Hrs Amt</th>
//                           <th className="p-3 text-center font-semibold">Net Wages</th>
//                         </>
//                       )}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {reportData.map((emp, idx) => {
//                       const wagesPerHour = parseFloat(emp.hourlyRate.toFixed(2));
//                       const otHrsAmt = Math.round(emp.otAmount);
//                       const netWages = Math.round(emp.otAmount / 10) * 10;
//                       return (
//                         <tr key={emp.employeeId} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
//                           <td className="p-3 text-gray-600">{idx + 1}</td>
//                           <td className="p-3 font-medium text-gray-800">{emp.employeeName}</td>
//                           <td className="p-3 text-gray-600">{emp.department}</td>
//                           {activeSummary === "hours" ? (
//                             <td className="p-3 text-center font-bold text-green-700">{emp.totalOT.toFixed(2)} hrs</td>
//                           ) : (
//                             <>
//                               <td className="p-3 text-center text-gray-700">{wagesPerHour.toFixed(2)}</td>
//                               <td className="p-3 text-center font-semibold text-green-700">{emp.totalOT.toFixed(2)}</td>
//                               <td className="p-3 text-center font-semibold text-orange-600">{otHrsAmt}</td>
//                               <td className="p-3 text-center font-bold text-blue-700">{netWages}</td>
//                             </>
//                           )}
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                   <tfoot>
//                     <tr className={`${activeSummary === "hours" ? "bg-green-50 text-green-800" : "bg-orange-50 text-orange-800"} font-bold border-t-2 border-gray-300`}>
//                       <td className="p-3" colSpan={3}>Grand Total</td>
//                       {activeSummary === "hours" ? (
//                         <td className="p-3 text-center">{totalOTHours.toFixed(2)} hrs</td>
//                       ) : (
//                         <>
//                           <td className="p-3 text-center">—</td>
//                           <td className="p-3 text-center">{totalOTHours.toFixed(2)}</td>
//                           <td className="p-3 text-center">{Math.round(totalOTAmount)}</td>
//                           <td className="p-3 text-center">
//                             {reportData.reduce((sum, emp) => sum + Math.round(emp.otAmount / 10) * 10, 0)}
//                           </td>
//                         </>
//                       )}
//                     </tr>
//                   </tfoot>
//                 </table>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {!loading && reportData.length === 0 && selectedDepartments.length > 0 && reportGenerated && (
//         <div className="bg-white shadow rounded-lg p-8 text-center">
//           <p className="text-gray-500 text-lg">No OT hours data found for the selected filters.</p>
//         </div>
//       )}

//       {!loading && reportData.length === 0 && selectedDepartments.length === 0 && (
//         <div className="bg-white shadow rounded-lg p-8 text-center">
//           <p className="text-gray-500 text-lg">Select filters and click "Generate Report" to view OT hours data.</p>
//         </div>
//       )}
//     </div>
//   );
// };

// export default OTReport;


import React, { useState, useEffect } from "react";
import { format, getDaysInMonth, parse } from "date-fns";
import * as XLSX from "xlsx";

const OTReport = () => {
  const BASE_URL = import.meta.env.VITE_API_URL;
  const token = sessionStorage.getItem("token");

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportGenerated, setReportGenerated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSummary, setActiveSummary] = useState(null); // "hours" | "amount" | null
  const itemsPerPage = 10;

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${BASE_URL}/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const compList = Array.isArray(data) ? data : data.companies || [];
      setCompanies(compList);
      if (compList.length > 0) setSelectedCompanyId(compList[0].id);
    } catch (err) {
      setError("Failed to fetch companies");
    }
  };

  const fetchDepartments = async (companyId) => {
    if (!companyId) { setDepartments([]); setSelectedDepartments([]); return; }
    try {
      const res = await fetch(`${BASE_URL}/departments?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : data.data || data.departments || []);
      setSelectedDepartments([]);
    } catch (err) {
      setError("Failed to fetch departments");
    }
  };

  const fetchOTReport = async () => {
    setReportGenerated(true);
    setLoading(true);
    setError("");
    setActiveSummary(null);

    try {
      if (!selectedCompanyId) { setError("Please select a company"); setLoading(false); return; }
      if (selectedDepartments.length === 0) { setError("Please select at least one department"); setLoading(false); return; }

      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${getDaysInMonth(parse(startDate, "yyyy-MM-dd", new Date()))}`;

      const promises = selectedDepartments.map((deptId) =>
        fetch(`${BASE_URL}/ot-hours/filter?companyId=${selectedCompanyId}&departmentId=${deptId}&startDate=${startDate}&endDate=${endDate}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json())
      );

      const responses = await Promise.all(promises);
      const allOTRecords = responses.flatMap((r) => r.records || []);

      const groupedData = {};
      allOTRecords.forEach((record) => {
        const empId = record.employeeId;
        if (!groupedData[empId]) {
          groupedData[empId] = {
            employeeId: record.employeeId,
            employeeName: record.employee?.firstName || "",
            employeeCode: record.employee?.employeeCode || "N/A",
            department: record.department?.departmentname || record.department?.departmentName || record.department?.name || "N/A",
            departmentId: record.departmentId,
            basicSalary: record.basicSalary || 0,
            hourlyRate: record.hourlyRate || 0,
            dailyOT: {},
            totalOT: 0,
            otAmount: 0,
          };
        }
        const day = new Date(record.date).getDate();
        groupedData[empId].dailyOT[day] = record.otHours;
      });

      Object.keys(groupedData).forEach((empId) => {
        const emp = groupedData[empId];
        emp.totalOT = parseFloat(Object.values(emp.dailyOT).reduce((sum, h) => sum + Number(h), 0).toFixed(2));
        emp.otAmount = parseFloat((emp.totalOT * emp.hourlyRate).toFixed(2));
      });

      const reportArray = Object.values(groupedData).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
      setReportData(reportArray);
      setCurrentPage(1);
    } catch (err) {
      setError("Failed to generate report");
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentToggle = (deptId) => {
    setSelectedDepartments((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  useEffect(() => { fetchCompanies(); }, []);
  useEffect(() => { if (selectedCompanyId) fetchDepartments(selectedCompanyId); }, [selectedCompanyId]);

  const daysInMonth = getDaysInMonth(parse(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`, "yyyy-MM-dd", new Date()));
  const totalPages = Math.ceil(reportData.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedData = reportData.slice(startIdx, startIdx + itemsPerPage);

  // ── Cumulative Summary Calculations ──────────────────────────
  const totalOTHours = parseFloat(reportData.reduce((sum, emp) => sum + emp.totalOT, 0).toFixed(2));
  const totalOTAmount = parseFloat(reportData.reduce((sum, emp) => sum + emp.otAmount, 0).toFixed(2));

  // Per-department breakdown for summary
  const deptSummary = reportData.reduce((acc, emp) => {
    const key = emp.department;
    if (!acc[key]) acc[key] = { department: key, totalOT: 0, otAmount: 0, employeeCount: 0 };
    acc[key].totalOT = parseFloat((acc[key].totalOT + emp.totalOT).toFixed(2));
    acc[key].otAmount = parseFloat((acc[key].otAmount + emp.otAmount).toFixed(2));
    acc[key].employeeCount += 1;
    return acc;
  }, {});
  const deptSummaryArray = Object.values(deptSummary);

  const monthLabel = reportData.length > 0
    ? format(parse(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`, "yyyy-MM-dd", new Date()), "MMMM yyyy")
    : "";

  // ── Download OT Hours Summary (green button) ─────────────────
  const downloadOTHours = () => {
    const rows = reportData.map((emp, idx) => ({
      "S.No": idx + 1,
      "Name": emp.employeeName,
      "Department": emp.department,
      "Total OT Hours": emp.totalOT,
    }));
    rows.push({ "S.No": "", "Name": "Grand Total", "Department": "", "Total OT Hours": totalOTHours });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 6 }, { wch: 25 }, { wch: 20 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OT Hours");
    XLSX.writeFile(wb, `OT_Hours_${monthLabel.replace(" ", "_")}.xlsx`);
  };

  // ── Download OT Amount Summary (orange button) ────────────────
  const downloadOTAmount = () => {
    const rows = reportData.map((emp, idx) => ({
      "S.No": idx + 1,
      "Name": emp.employeeName,
      "Department": emp.department,
      "Wages/Hr": emp.hourlyRate,
      // "Wages/Hr": parseFloat(emp.hourlyRate.toFixed(2)),
      "OT Hours": emp.totalOT,
      "OT Hrs Amt": Math.round(emp.otAmount),
      "Net Wages": Math.round(emp.otAmount / 10) * 10,
    }));
    rows.push({
      "S.No": "", "Name": "Grand Total", "Department": "", "Wages/Hr": "",
      "OT Hours": totalOTHours,
      "OT Hrs Amt": Math.round(totalOTAmount),
      "Net Wages": reportData.reduce((sum, emp) => sum + Math.round(emp.otAmount / 10) * 10, 0),
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 6 }, { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OT Amount");
    XLSX.writeFile(wb, `OT_Amount_${monthLabel.replace(" ", "_")}.xlsx`);
  };

  return (
    <div className="p-6 max-w-full mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">OT Hours Report</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">{error}</div>
      )}

      {/* Filter Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Year <span className="text-red-500">*</span></label>
            <input type="number" min="2020" max={new Date().getFullYear() + 1} value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Month <span className="text-red-500">*</span></label>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>Select Month</option>
              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                <option key={i+1} value={i+1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Company <span className="text-red-500">*</span></label>
            <select value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select Company</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Departments <span className="text-red-500">*</span> ({selectedDepartments.length})
            </label>
          </div>
        </div>

        <div className="mb-4">
          <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
            {!selectedCompanyId ? (
              <p className="text-gray-500 text-sm">Select a company first to see departments</p>
            ) : departments.length === 0 ? (
              <p className="text-gray-500 text-sm">No departments found for this company</p>
            ) : (
              <>
                <div className="flex items-center pb-2 border-b border-gray-250 mb-2">
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded font-semibold text-blue-700">
                    <input type="checkbox"
                      checked={selectedDepartments.length === departments.length && departments.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDepartments(departments.map((d) => d.id));
                        } else {
                          setSelectedDepartments([]);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                    <span className="ml-2 text-sm">All Departments</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {departments.map((dept) => (
                    <label key={dept.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input type="checkbox" checked={selectedDepartments.includes(dept.id)}
                        onChange={() => handleDepartmentToggle(dept.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                      <span className="ml-2 text-sm text-gray-700">{dept.departmentname || dept.departmentName || dept.name}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={() => { setReportData([]); setReportGenerated(false); setActiveSummary(null); }}
            className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition">
            Clear
          </button>
          <button onClick={fetchOTReport}
            disabled={loading || !selectedCompanyId || selectedDepartments.length === 0}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition">
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Report Table */}
      {reportData.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="bg-gray-100 p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">
              {monthLabel} - {reportData.length} Employee(s)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50 sticky top-0 z-20">
                <tr>
                  <th className="border p-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-30" style={{ width: "50px", minWidth: "50px", maxWidth: "50px", left: "0px" }}>S.No</th>
                  <th className="border p-2 text-left font-semibold text-gray-700 sticky bg-gray-50 z-30" style={{ width: "80px", minWidth: "80px", maxWidth: "80px", left: "50px" }}>ID</th>
                  <th className="border p-2 text-left font-semibold text-gray-700 sticky bg-gray-50 z-30" style={{ width: "220px", minWidth: "220px", maxWidth: "220px", left: "130px" }}>Name</th>
                  <th className="border p-2 text-left font-semibold text-gray-700 bg-gray-50 z-20" style={{ width: "150px", minWidth: "150px", maxWidth: "150px" }}>Department</th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                    <th key={`day-${day}`} className="border p-2 text-center font-semibold text-gray-700 bg-blue-50 w-12">
                      {day}
                    </th>
                  ))}
                  <th className="border p-2 text-center font-semibold text-gray-700 bg-green-50 sticky z-30" style={{ width: "80px", minWidth: "80px", maxWidth: "80px", right: "100px" }}>Total</th>
                  <th className="border p-2 text-center font-semibold text-gray-700 bg-orange-50 sticky z-30" style={{ width: "100px", minWidth: "100px", maxWidth: "100px", right: "0px" }}>OT Amount</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((employee, idx) => (
                  <tr key={employee.employeeId} className="hover:bg-gray-50 border-b">
                    <td className="border p-2 text-center sticky bg-white z-10" style={{ width: "50px", minWidth: "50px", maxWidth: "50px", left: "0px" }}>{startIdx + idx + 1}</td>
                    <td className="border p-2 sticky bg-white text-sm z-10" style={{ width: "80px", minWidth: "80px", maxWidth: "80px", left: "50px" }}>{employee.employeeCode}</td>
                    <td className="border p-2 sticky bg-white text-sm font-medium z-10" style={{ width: "220px", minWidth: "220px", maxWidth: "220px", left: "130px", whiteSpace: "normal", wordBreak: "break-word" }}>{employee.employeeName}</td>
                    <td className="border p-2 text-sm" style={{ width: "150px", minWidth: "150px", maxWidth: "150px", whiteSpace: "normal", wordBreak: "break-word" }}>{employee.department}</td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                      <td key={`ot-${employee.employeeId}-${day}`} className="border p-2 text-center text-sm bg-blue-50">
                        {employee.dailyOT[day] ? parseFloat(employee.dailyOT[day]).toFixed(2) : "-"}
                      </td>
                    ))}
                    <td className="border p-2 text-center font-bold text-green-700 bg-green-50 sticky z-10" style={{ width: "80px", minWidth: "80px", maxWidth: "80px", right: "100px" }}>
                      {employee.totalOT.toFixed(2)}
                    </td>
                    <td className="border p-2 text-center font-bold text-orange-700 bg-orange-50 sticky z-10" style={{ width: "100px", minWidth: "100px", maxWidth: "100px", right: "0px" }}>
                      ₹ {Math.round(employee.otAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="bg-gray-100 p-4 flex justify-between items-center border-t">
              <p className="text-sm text-gray-700">
                Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, reportData.length)} of {reportData.length} records
              </p>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">Previous</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded text-sm ${currentPage === page ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-800 hover:bg-gray-400"}`}>
                    {page}
                  </button>
                ))}
                <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Cumulative Summary Section ─────────────────────────── */}
      {reportData.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-gray-100 p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">
              Cumulative Summary — {monthLabel}
            </h2>
          </div>

          {/* Two Clickable Buttons */}
          <div className="p-4 flex gap-4">
            <button
              onClick={() => setActiveSummary(activeSummary === "hours" ? null : "hours")}
              className={`flex-1 py-4 rounded-xl border-2 font-semibold text-lg transition-all duration-200 flex flex-col items-center gap-1
                ${activeSummary === "hours"
                  ? "bg-green-600 border-green-600 text-white shadow-lg scale-[1.02]"
                  : "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"}`}
            >
              <span className="text-2xl font-bold">{totalOTHours.toFixed(2)} hrs</span>
              <span className="text-sm font-medium opacity-80">Total OT Hours</span>
            </button>

            <button
              onClick={() => setActiveSummary(activeSummary === "amount" ? null : "amount")}
              className={`flex-1 py-4 rounded-xl border-2 font-semibold text-lg transition-all duration-200 flex flex-col items-center gap-1
                ${activeSummary === "amount"
                  ? "bg-orange-500 border-orange-500 text-white shadow-lg scale-[1.02]"
                  : "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"}`}
            >
              <span className="text-2xl font-bold">₹ {Math.round(totalOTAmount)}</span>
              <span className="text-sm font-medium opacity-80">Total OT Amount</span>
            </button>
          </div>

          {/* Expanded Employee-wise breakdown */}
          {activeSummary && (
            <div className="px-4 pb-4">
             
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className={`${activeSummary === "hours" ? "bg-green-600" : "bg-orange-500"} text-white`}>
                      <th className="p-3 text-left font-semibold">S.No</th>
                      <th className="p-3 text-left font-semibold">Name</th>
                      <th className="p-3 text-left font-semibold">Dept</th>
                      {activeSummary === "hours" ? (
                        <th className="p-3 text-center font-semibold">Total OT Hours</th>
                      ) : (
                        <>
                          <th className="p-3 text-center font-semibold">Wages/Hr</th>
                          <th className="p-3 text-center font-semibold">OT Hours</th>
                          <th className="p-3 text-center font-semibold">OT Hrs Amt</th>
                          <th className="p-3 text-center font-semibold">Net Wages</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((emp, idx) => {
                      const wagesPerHour = emp.hourlyRate;
                      // const wagesPerHour = parseFloat(emp.hourlyRate.toFixed(2));
                      const otHrsAmt = Math.round(emp.otAmount);
                      const netWages = Math.round(emp.otAmount / 10) * 10;
                      return (
                        <tr key={emp.employeeId} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="p-3 text-gray-600">{idx + 1}</td>
                          <td className="p-3 font-medium text-gray-800">{emp.employeeName}</td>
                          <td className="p-3 text-gray-600">{emp.department}</td>
                          {activeSummary === "hours" ? (
                            <td className="p-3 text-center font-bold text-green-700">{emp.totalOT.toFixed(2)} hrs</td>
                          ) : (
                            <>
                              <td className="p-3 text-center text-gray-700">{wagesPerHour.toFixed(2)}</td>
                              <td className="p-3 text-center font-semibold text-green-700">{emp.totalOT.toFixed(2)}</td>
                              <td className="p-3 text-center font-semibold text-orange-600">{otHrsAmt}</td>
                              <td className="p-3 text-center font-bold text-blue-700">{netWages}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={`${activeSummary === "hours" ? "bg-green-50 text-green-800" : "bg-orange-50 text-orange-800"} font-bold border-t-2 border-gray-300`}>
                      <td className="p-3" colSpan={3}>Grand Total</td>
                      {activeSummary === "hours" ? (
                        <td className="p-3 text-center">{totalOTHours.toFixed(2)} hrs</td>
                      ) : (
                        <>
                          <td className="p-3 text-center">—</td>
                          <td className="p-3 text-center">{totalOTHours.toFixed(2)}</td>
                          <td className="p-3 text-center">{Math.round(totalOTAmount)}</td>
                          <td className="p-3 text-center">
                            {reportData.reduce((sum, emp) => sum + Math.round(emp.otAmount / 10) * 10, 0)}
                          </td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                </table>
                
              </div>
               {/* Download Button */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={activeSummary === "hours" ? downloadOTHours : downloadOTAmount}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  ⬇ Download Excel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && reportData.length === 0 && selectedDepartments.length > 0 && reportGenerated && (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500 text-lg">No OT hours data found for the selected filters.</p>
        </div>
      )}

      {!loading && reportData.length === 0 && selectedDepartments.length === 0 && (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500 text-lg">Select filters and click "Generate Report" to view OT hours data.</p>
        </div>
      )}
    </div>
  );
};

export default OTReport;