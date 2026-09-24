// ================================================================
// pages/AttendanceReport.jsx
// Attendance report — multi-select filters, grouped by date→shift
// Columns: Sl.No, Tkt No, Emp Name, Dept, Status, IN, OUT, Hours
// Late arrivals underlined in red. Export Excel & PDF.
// ================================================================
import React, { useState, useEffect, useCallback, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiRequest } from "../utils/apiCaller";

// // ── API helper ────────────────────────────────────────────────
// const apiRequest = async (url, options = {}) => {
//   const token = localStorage.getItem("authToken");
//   const response = await fetch(url, {
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${token}`,
//     },
//     ...options,
//   });
//   if (!response.ok) {
//     const err = await response.json().catch(() => ({}));
//     throw new Error(err.message || `API Error: ${response.statusText}`);
//   }
//   return response.json();
// };

// ── Helpers ───────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];

const fmtDisplay = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const fmtTime = (datetime) => {
  if (!datetime) return "—";
  const date = new Date(datetime);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const fmtHours = (wh) => {
  if (!wh || wh === 0) return "00:00";
  const h = Math.floor(wh);
  const m = Math.round((wh - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const statusLabel = (status) =>
  ({ "Present": "P", "Present with Permission": "WP", "Present/Leave (P/L)": "P/L", "Present/Leave": "P/L", "Half Day": "P/L" }[status] || "P");

const getUniqueShifts = (groupedData) => {
  if (!groupedData) return [];
  const shiftsSet = new Set();
  Object.values(groupedData).forEach((dateGroup) => {
    Object.keys(dateGroup).forEach((sh) => {
      shiftsSet.add(sh);
    });
  });
  const defaultOrder = ["A", "B", "C", "Staff"];
  return [...shiftsSet].sort((a, b) => {
    const idxA = defaultOrder.indexOf(a);
    const idxB = defaultOrder.indexOf(b);

    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;

    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;

    return a.localeCompare(b);
  });
};

// Group rows → { dateStr: { [shiftName]: [rows...] } }
const groupData = (rows) => {
  const map = {};
  rows.forEach((r) => {
    const d = r.attendanceDate;
    if (!map[d]) map[d] = {};
    const shift = r.shiftName || "Unknown";
    if (!map[d][shift]) map[d][shift] = [];
    map[d][shift].push(r);
  });
  return map;
};

// ── Multi-select component ────────────────────────────────────
function MultiSelect({ label, options, selected, onChange, labelKey = "name", valueKey = "id" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id) => {
    const sid = String(id);
    onChange(selected.includes(sid) ? selected.filter((s) => s !== sid) : [...selected, sid]);
  };

  const toggleAll = () =>
    onChange(selected.length === options.length ? [] : options.map((o) => String(o[valueKey])));

  const displayText = () => {
    if (!selected.length) return `All ${label}`;
    if (selected.length === 1) {
      const found = options.find((o) => String(o[valueKey]) === selected[0]);
      return found ? found[labelKey] : "1 selected";
    }
    return `${selected.length} selected`;
  };

  return (
    <div style={ms.wrap} ref={ref}>
      <label style={ms.label}>{label}</label>
      <div style={ms.trigger} onClick={() => setOpen(!open)}>
        <span style={ms.triggerText}>{displayText()}</span>
        <span style={{ color: "#94a3b8", fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={ms.dropdown}>
          <div style={ms.allRow} onClick={toggleAll}>
            <input type="checkbox" readOnly
              checked={selected.length === options.length && options.length > 0}
              style={{ marginRight: 8 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Select all</span>
          </div>
          {options.map((o) => {
            const id = String(o[valueKey]);
            return (
              <div key={id} style={ms.optRow} onClick={() => toggle(id)}>
                <input type="checkbox" readOnly checked={selected.includes(id)} style={{ marginRight: 8 }} />
                <span style={{ fontSize: 12.5, color: "#334155" }}>{o[labelKey]}</span>
              </div>
            );
          })}
          {!options.length && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "#94a3b8" }}>No options</div>
          )}
        </div>
      )}
    </div>
  );
}

const ms = {
  wrap: { position: "relative", display: "flex", flexDirection: "column", gap: 3 },
  label: { fontSize: 12, fontWeight: 600, color: "#475569" },
  trigger: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", cursor: "pointer", minWidth: 170, fontSize: 13, userSelect: "none", color: "#1e293b", height: 38, boxSizing: "border-box" },
  triggerText: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 },
  dropdown: { position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, zIndex: 200, maxHeight: 240, overflowY: "auto", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", marginTop: 4 },
  allRow: { display: "flex", alignItems: "center", padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" },
  optRow: { display: "flex", alignItems: "center", padding: "7px 12px", cursor: "pointer" },
};

// ── Excel export ──────────────────────────────────────────────
const exportExcel = (grouped, companyName, from, to) => {
  const uniqueShifts = getUniqueShifts(grouped);
  const headers = ["Sl.No", "Tkt No", "Emp Name", "Department", "Status", "IN", "OUT", "Hours"];
  const csvRows = [
    `Attendance Report — ${companyName}`,
    `Period: ${fmtDisplay(from)} to ${fmtDisplay(to)}`,
    "",
    headers.join(","),
  ];
  Object.entries(grouped).forEach(([date, shifts]) => {
    csvRows.push(fmtDisplay(date));
    uniqueShifts.forEach((shift) => {
      const rows = shifts[shift] || [];
      if (!rows.length) return;
      if (shift !== "Unknown") csvRows.push(shift);
      rows.forEach((r, i) => {
        const name = r.employee?.firstName || "";
        csvRows.push([
          i + 1,
          `"${r.employee?.employeeCode || ""}"`,
          `"${name}"`,
          `"${r.workedDepartment?.departmentname || r.department?.departmentname || r.employee?.department?.departmentname || ""}"`,
          statusLabel(r.status),
          fmtTime(r.firstCheckIn),
          fmtTime(r.lastCheckOut),
          fmtHours(r.workingHours),
        ].join(","));
      });
    });
    csvRows.push("");
  });
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Attendance_Report_${from}_to_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── PDF export ────────────────────────────────────────────────
const exportPDF = (grouped, companyName, from, to) => {
  const uniqueShifts = getUniqueShifts(grouped);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let firstPage = true;

  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, 14, 11);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Attendance Report  |  ${fmtDisplay(from)} — ${fmtDisplay(to)}`, pageW - 14, 11, { align: "right" });

  let startY = 22;

  Object.entries(grouped).forEach(([date, shifts]) => {
    const hasData = uniqueShifts.some((s) => shifts[s] && shifts[s].length > 0);
    if (!hasData) return;

    if (!firstPage) { doc.addPage(); startY = 22; }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.text(fmtDisplay(date), 14, startY);
    doc.setTextColor(0, 0, 0);
    startY += 5;

    uniqueShifts.forEach((shift) => {
      const rows = shifts[shift] || [];
      if (!rows.length) return;

      if (shift !== "Unknown") {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setFillColor(219, 234, 254);
        doc.rect(14, startY - 1, pageW - 28, 5, "F");
        doc.setTextColor(30, 58, 138);
        doc.text(`SHIFT  ${shift}`, 16, startY + 2.5);
        doc.setTextColor(0, 0, 0);
        startY += 7;
      }

      const tableRows = rows.map((r, i) => {
        const name = r.employee?.firstName || "";
        return [
          i + 1,
          r.employee?.employeeCode || "",
          name,
          r.workedDepartment?.departmentname || r.department?.departmentname || r.employee?.department?.departmentname || "",
          statusLabel(r.status),
          fmtTime(r.firstCheckIn),
          fmtTime(r.lastCheckOut),
          fmtHours(r.workingHours),
        ];
      });

      autoTable(doc, {
        startY,
        head: [["Sl.No", "Tkt No", "Emp Name", "Department", "Status", "IN", "OUT", "Hours"]],
        body: tableRows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2.5, lineColor: [200, 200, 200], lineWidth: 0.2 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: 22, halign: "center" },
          2: { cellWidth: 55 },
          3: { cellWidth: 50 },
          4: { cellWidth: 18, halign: "center" },
          5: { cellWidth: 32, halign: "center" },
          6: { cellWidth: 32, halign: "center" },
          7: { cellWidth: 22, halign: "center" },
        },
        didParseCell: (data) => {
          if (data.section === "body") {
            const r = rows[data.row.index];
            if (r?.isLate) {
              data.cell.styles.textDecoration = "underline";
              data.cell.styles.textColor = [185, 28, 28];
            }
          }
        },
        margin: { left: 14, right: 14 },
      });

      startY = doc.lastAutoTable.finalY + 4;
      firstPage = false;
    });
  });

  doc.save(`Attendance_Report_${from}_to_${to}.pdf`);
};

// ================================================================
// MAIN COMPONENT
// ================================================================
export default function AttendanceReport() {
  // ── Masters ──────────────────────────────────────────────────
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employmentTypes, setEmploymentTypes] = useState([]);
  const [grades, setGrades] = useState([]);

  // ── Single-select ─────────────────────────────────────────────
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());

  // ── Multi-select (arrays of string ids) ───────────────────────
  const [selDepts, setSelDepts] = useState([]);
  const [selCategories, setSelCategories] = useState([]);
  const [selEmps, setSelEmps] = useState([]);
  const [selEmpTypes, setSelEmpTypes] = useState([]);
  const [selGrades, setSelGrades] = useState([]);

  // ── Data ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [grouped, setGrouped] = useState(null);
  const [totalRows, setTotalRows] = useState(0);

  // ── Load companies on mount ───────────────────────────────────
  useEffect(() => {
    apiRequest("/companies")
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setCompanies(list);
        if (list.length) {
          setCompanyId(String(list[0].id));
          setCompanyName(list[0].name);
        }
      })
      .catch(console.error);
  }, []);

  // ── Load masters when company changes ─────────────────────────
  useEffect(() => {
    if (!companyId) return;
    setSelDepts([]); setSelCategories([]); setSelEmps([]); setSelEmpTypes([]); setSelGrades([]);
    setDepartments([]); setCategories([]); setEmployees([]); setEmploymentTypes([]); setGrades([]);

    Promise.all([
      apiRequest(`/departments?companyId=${companyId}`),
      apiRequest(`/categories?companyId=${companyId}`),
      apiRequest(`/employees?companyId=${companyId}`),
      apiRequest(`/employment-types?companyId=${companyId}`),
      apiRequest(`/employer-grades?companyId=${companyId}`),
    ]).then(([depts, cats, emps, types, gr]) => {
      setDepartments(Array.isArray(depts) ? depts : depts.data || []);
      setCategories(Array.isArray(cats) ? cats : cats.data || []);
      setEmployees(Array.isArray(emps) ? emps : emps.data || []);
      setEmploymentTypes(Array.isArray(types) ? types : types.data || []);
      setGrades(Array.isArray(gr) ? gr : gr.data || []);
    }).catch(console.error);
  }, [companyId]);

  // ── Generate report ───────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    if (!companyId || !from || !to) {
      setError("Please select company and date range.");
      return;
    }
    setLoading(true);
    setError("");
    setGrouped(null);
    try {
      const params = new URLSearchParams({ companyId, startDate: from, endDate: to });
      if (selDepts.length) params.set("departmentIds", selDepts.join(","));
      if (selCategories.length) params.set("categoryIds", selCategories.join(","));
      if (selEmps.length) params.set("employeeIds", selEmps.join(","));
      if (selEmpTypes.length) params.set("employmentTypeIds", selEmpTypes.join(","));
      if (selGrades.length) params.set("gradeIds", selGrades.join(","));

      const data = await apiRequest(`/attendance-report?${params}`);
      const rows = data.data || [];
      setTotalRows(rows.length);
      setGrouped(groupData(rows));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, from, to, selDepts, selCategories, selEmps, selEmpTypes, selGrades]);

  // ── Employee display options ──────────────────────────────────
  const empOptions = employees
    .filter((e) => !selDepts.length || selDepts.includes(String(e.departmentId)))
    .filter((e) => !selCategories.length || selCategories.includes(String(e.categoryId)))
    .map((e) => ({
      id: e.id,
      name: e.firstName,
    }));

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <h2 style={s.title}>Attendance Report</h2>
      <p style={s.subtitle}>Daily attendance grouped by shift — use multi-select to filter</p>

      {/* ── Filters ── */}
      <div style={s.filterBar}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={s.label}>Company</label>
          <select style={s.select} value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setCompanyName(companies.find((c) => String(c.id) === e.target.value)?.name || "");
            }}>
            <option value="">Select company</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={s.label}>From date</label>
          <input type="date" style={s.input} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={s.label}>To date</label>
          <input type="date" style={s.input} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <MultiSelect label="Department" options={departments} selected={selDepts} onChange={setSelDepts} labelKey="departmentname" />
        <MultiSelect label="Category" options={categories} selected={selCategories} onChange={setSelCategories} labelKey="categoryName" />
        <MultiSelect label="Employment type" options={employmentTypes} selected={selEmpTypes} onChange={setSelEmpTypes} />
        <MultiSelect label="Grade" options={grades} selected={selGrades} onChange={setSelGrades} />
        <MultiSelect label="Employee" options={empOptions} selected={selEmps} onChange={setSelEmps} />

        <button style={s.btnPrimary} onClick={fetchReport} disabled={loading}>
          {loading ? "Fetching..." : "Generate"}
        </button>
        {grouped && (
          <>
            <button style={s.btnGreen} onClick={() => exportExcel(grouped, companyName, from, to)}>⬇ Excel</button>
            <button style={s.btnRed} onClick={() => exportPDF(grouped, companyName, from, to)}>⬇ PDF</button>
          </>
        )}
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {/* ── Legend ── */}
      {grouped && (
        <div style={s.legend}>
          <span style={s.li}><span style={s.dotG}></span> P = Present</span>
          <span style={s.li}><span style={s.dotA}></span> WP = With Permission</span>
          <span style={s.li}><span style={{ ...s.dotB, background: "#f59e0b" }}></span> P/L = Present/Leave</span>
          <span style={{ ...s.li, borderLeft: "3px solid #dc2626", paddingLeft: 8 }}>
            <span style={{ textDecoration: "underline", color: "#dc2626", fontWeight: 600 }}>Underline</span> = Late arrival
          </span>
          <span style={{ marginLeft: "auto", fontWeight: 700, color: "#1d4ed8", fontSize: 13.5 }}>
            {totalRows} Total Records
          </span>
        </div>
      )}

      {/* ── Report tables ── */}
      {grouped && Object.entries(grouped).map(([date, shifts]) => {
        const uniqueShifts = getUniqueShifts(grouped);
        const hasAny = uniqueShifts.some((sh) => shifts[sh]?.length > 0);
        if (!hasAny) return null;
        return (
          <div key={date} style={s.dateBlock}>
            <div style={s.dateHeader}>📅 {fmtDisplay(date)}</div>
            {uniqueShifts.map((shift) => {
              const rows = shifts[shift] || [];
              if (!rows.length) return null;
              return (
                <div key={shift} style={s.shiftBlock}>
                  <div style={s.shiftHeader}>{shift === "Unknown" ? "Other Shifts" : `Shift ${shift}`}</div>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr style={s.thead}>
                          <th style={{ ...s.th, width: "60px", textAlign: "center" }}>Sl.No</th>
                          <th style={{ ...s.th, width: "95px", textAlign: "center" }}>Tkt No</th>
                          <th style={{ ...s.th, width: "24%" }}>Emp Name</th>
                          <th style={{ ...s.th, width: "22%" }}>Department</th>
                          <th style={{ ...s.th, width: "75px", textAlign: "center" }}>Status</th>
                          <th style={{ ...s.th, width: "135px", textAlign: "center" }}>IN</th>
                          <th style={{ ...s.th, width: "135px", textAlign: "center" }}>OUT</th>
                          <th style={{ ...s.th, width: "95px", textAlign: "center" }}>Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => {
                          const late = r.isLate;
                          const name = r.employee?.firstName || "";
                          return (
                            <tr key={r.id} style={late ? s.lateRow : (i % 2 === 1 ? s.evenRow : s.oddRow)}>
                              <td style={{ ...s.td, textAlign: "center", fontWeight: 600, color: "#64748b", fontSize: 13 }}>{i + 1}</td>
                              <td style={{ ...s.td, textAlign: "center", fontWeight: 700, color: "#1e293b", fontSize: 13.5 }}>{r.employee?.employeeCode || "-"}</td>
                              <td style={{ ...s.td, textDecoration: late ? "underline" : "none", color: late ? "#dc2626" : "#0f172a", fontWeight: 600, fontSize: 14.5 }}>
                                {name}
                              </td>
                              <td style={{ ...s.td, color: "#334155", fontSize: 13.5, fontWeight: 500 }}>
                                {r.workedDepartment?.departmentname || r.department?.departmentname || r.employee?.department?.departmentname || "-"}
                                {r.workedDeptId && r.departmentId && String(r.workedDeptId) !== String(r.departmentId) && (
                                  <span
                                    style={{
                                      marginLeft: 6,
                                      padding: "2px 6px",
                                      fontSize: 10.5,
                                      fontWeight: 600,
                                      backgroundColor: "#fef3c7",
                                      color: "#92400e",
                                      borderRadius: 4,
                                      border: "1px solid #fde68a",
                                      display: "inline-block",
                                    }}
                                    title={`Home Dept: ${r.department?.departmentname || r.employee?.department?.departmentname || ""}`}
                                  >
                                    Worked Dept
                                  </span>
                                )}
                              </td>
                              <td style={{ ...s.td, textAlign: "center" }}><StatusChip status={r.status} /></td>
                              <td style={{ ...s.td, textAlign: "center", fontSize: 15, textDecoration: late ? "underline" : "none", color: late ? "#dc2626" : "#0f172a", fontWeight: late ? 700 : 600, fontVariantNumeric: "tabular-nums" }}>
                                {fmtTime(r.firstCheckIn)}
                              </td>
                              <td style={{ ...s.td, textAlign: "center", fontSize: 15, color: "#0f172a", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                                {fmtTime(r.lastCheckOut)}
                              </td>
                              <td style={{ ...s.td, textAlign: "center", fontWeight: 700, color: "#1e40af", fontSize: 14.5, fontVariantNumeric: "tabular-nums" }}>
                                {fmtHours(r.workingHours)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={s.tfootRow}>
                          <td colSpan={7} style={{ ...s.td, textAlign: "right", fontSize: 13, color: "#334155", fontWeight: 700 }}>
                            {shift === "Unknown" ? "Total Employees" : `Shift ${shift} Total`}
                          </td>
                          <td style={{ ...s.td, textAlign: "center", fontWeight: 800, color: "#1e40af", fontSize: 14 }}>{rows.length} emp</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {!loading && !grouped && !error && (
        <div style={s.emptyBox}>Select filters and click Generate to view the attendance report.</div>
      )}
      {loading && <div style={s.emptyBox}>Loading attendance records…</div>}
    </div>
  );
}

// ── Status chip ───────────────────────────────────────────────
function StatusChip({ status }) {
  const m = {
    "Present": { bg: "#dcfce7", color: "#15803d", label: "P" },
    "Present with Permission": { bg: "#fef9c3", color: "#854d0e", label: "WP" },
    "Present/Leave (P/L)": { bg: "#fef3c7", color: "#b45309", label: "P/L" },
    "Present/Leave": { bg: "#fef3c7", color: "#b45309", label: "P/L" },
    "Half Day": { bg: "#fef3c7", color: "#b45309", label: "P/L" },
    "Absent": { bg: "#fee2e2", color: "#b91c1c", label: "A" },
    "Leave": { bg: "#e0e7ff", color: "#3730a3", label: "L" },
    "Holiday": { bg: "#f3e8ff", color: "#6b21a8", label: "H" },
    "Week Off": { bg: "#f1f5f9", color: "#475569", label: "WO" },
  };
  const cfg = m[status] || { bg: "#f1f5f9", color: "#475569", label: status ? status.slice(0, 2).toUpperCase() : "?" };
  return (
    <span style={{ display: "inline-block", fontSize: 11.5, fontWeight: 700, padding: "3px 8px", borderRadius: 5, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = {
  page: { padding: "20px 24px", width: "100%", maxWidth: "100%", boxSizing: "border-box", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  title: { fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 },
  subtitle: { fontSize: 14, color: "#64748b", margin: "4px 0 0" },
  filterBar: { display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", padding: "16px 20px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", margin: "18px 0 16px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", width: "100%", boxSizing: "border-box" },
  label: { fontSize: 12, fontWeight: 600, color: "#475569" },
  select: { padding: "8px 12px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 6, minWidth: 170, background: "#fff", color: "#1e293b", height: 38, boxSizing: "border-box" },
  input: { padding: "7px 12px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 6, color: "#1e293b", height: 38, boxSizing: "border-box" },
  btnPrimary: { padding: "8px 20px", fontSize: 13, fontWeight: 600, background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", alignSelf: "flex-end", height: 38 },
  btnGreen: { padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", alignSelf: "flex-end", height: 38 },
  btnRed: { padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", alignSelf: "flex-end", height: 38 },
  errorBox: { padding: "12px 16px", background: "#fee2e2", color: "#991b1b", borderRadius: 8, marginBottom: 14, fontSize: 13, border: "1px solid #fca5a5" },
  legend: { display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", fontSize: 13, color: "#475569", marginBottom: 16, padding: "10px 16px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", width: "100%", boxSizing: "border-box" },
  li: { display: "flex", alignItems: "center", gap: 6 },
  dotG: { width: 10, height: 10, borderRadius: "50%", background: "#16a34a", display: "inline-block" },
  dotA: { width: 10, height: 10, borderRadius: "50%", background: "#d97706", display: "inline-block" },
  dotB: { width: 10, height: 10, borderRadius: "50%", background: "#2563eb", display: "inline-block" },
  dateBlock: { marginBottom: 24, background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", width: "100%", boxSizing: "border-box" },
  dateHeader: { fontSize: 15, fontWeight: 700, color: "#1e40af", padding: "8px 16px", background: "#eff6ff", borderRadius: 8, marginBottom: 14, borderLeft: "4px solid #2563eb", display: "inline-block" },
  shiftBlock: { marginBottom: 16 },
  shiftHeader: { fontSize: 13, fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "5px 14px", borderRadius: 6, marginBottom: 10, display: "inline-block", border: "1px solid #bfdbfe" },
  tableWrap: { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  thead: { background: "#0f172a" },
  th: { padding: "11px 12px", textAlign: "left", fontSize: 12.5, fontWeight: 700, color: "#f8fafc", borderBottom: "1px solid #1e293b", letterSpacing: "0.02em" },
  td: { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 14, verticalAlign: "middle" },
  oddRow: { background: "#ffffff" },
  evenRow: { background: "#f8fafc" },
  lateRow: { background: "#fff5f5" },
  tfootRow: { background: "#f1f5f9", borderTop: "2px solid #cbd5e1" },
  emptyBox: { padding: 48, textAlign: "center", color: "#64748b", fontSize: 14, background: "#f8fafc", borderRadius: 10, border: "1px dashed #cbd5e1", marginTop: 20 },
};
