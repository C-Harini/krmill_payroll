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
  if (!datetime) return "00:00";
  const date = new Date(datetime);
  if (isNaN(date.getTime())) return "00:00";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).replace(/\s+/g, "");
};

const fmtHours = (wh) => {
  if (!wh || wh === 0) return "00:00";
  const h = Math.floor(wh);
  const m = Math.round((wh - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const statusLabel = (status) =>
  ({ "Present": "P", "Present with Permission": "WP", "Half Day": "HD" }[status] || "P");

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
        <span style={{ color: "#999", fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={ms.dropdown}>
          <div style={ms.allRow} onClick={toggleAll}>
            <input type="checkbox" readOnly
              checked={selected.length === options.length && options.length > 0}
              style={{ marginRight: 6 }} />
            <span style={{ fontSize: 12 }}>Select all</span>
          </div>
          {options.map((o) => {
            const id = String(o[valueKey]);
            return (
              <div key={id} style={ms.optRow} onClick={() => toggle(id)}>
                <input type="checkbox" readOnly checked={selected.includes(id)} style={{ marginRight: 6 }} />
                <span style={{ fontSize: 12 }}>{o[labelKey]}</span>
              </div>
            );
          })}
          {!options.length && (
            <div style={{ padding: "8px 10px", fontSize: 12, color: "#aaa" }}>No options</div>
          )}
        </div>
      )}
    </div>
  );
}

const ms = {
  wrap: { position: "relative", display: "flex", flexDirection: "column", gap: 3 },
  label: { fontSize: 11, fontWeight: 500, color: "#666" },
  trigger: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, background: "#fff", cursor: "pointer", minWidth: 170, fontSize: 13, userSelect: "none" },
  triggerText: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 },
  dropdown: { position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ccc", borderRadius: 4, zIndex: 200, maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.12)", marginTop: 2 },
  allRow: { display: "flex", alignItems: "center", padding: "7px 10px", cursor: "pointer", borderBottom: "1px solid #f0f0f0", background: "#f8f9fa" },
  optRow: { display: "flex", alignItems: "center", padding: "6px 10px", cursor: "pointer" },
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
          `"${r.employee?.department?.departmentname || ""}"`,
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
          r.employee?.department?.departmentname || "",
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
        styles: { fontSize: 7.5, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.2 },
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 20 },
          2: { cellWidth: 60 },
          3: { cellWidth: 45 },
          4: { cellWidth: 15, halign: "center" },
          5: { cellWidth: 25, halign: "center" },
          6: { cellWidth: 25, halign: "center" },
          7: { cellWidth: 20, halign: "center" },
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
    setSelDepts([]); setSelEmps([]); setSelEmpTypes([]); setSelGrades([]);
    setDepartments([]); setEmployees([]); setEmploymentTypes([]); setGrades([]);

    Promise.all([
      apiRequest(`/departments?companyId=${companyId}`),
      apiRequest(`/employees?companyId=${companyId}`),
      apiRequest(`/employment-types?companyId=${companyId}`),
      apiRequest(`/employer-grades?companyId=${companyId}`),
    ]).then(([depts, emps, types, gr]) => {
      setDepartments(Array.isArray(depts) ? depts : depts.data || []);
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
  }, [companyId, from, to, selDepts, selEmps, selEmpTypes, selGrades]);

  // ── Employee display options ──────────────────────────────────
  // const empOptions = employees.map((e) => ({
  //   id: e.id,
  //   name:  e.firstName,
  // }));

  const empOptions = employees
    .filter((e) => !selDepts.length || selDepts.includes(String(e.departmentId)))
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
          <span style={s.li}><span style={s.dotB}></span> HD = Half Day</span>
          <span style={{ ...s.li, borderLeft: "3px solid #dc2626", paddingLeft: 6 }}>
            <span style={{ textDecoration: "underline", color: "#dc2626" }}>Underline</span> = Late arrival
          </span>
          <span style={{ marginLeft: "auto", fontWeight: 600, color: "#1d4ed8", fontSize: 13 }}>
            {totalRows} records
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
            <div style={s.dateHeader}>{fmtDisplay(date)}</div>
            {uniqueShifts.map((shift) => {
              const rows = shifts[shift] || [];
              if (!rows.length) return null;
              return (
                <div key={shift} style={s.shiftBlock}>
                  <div style={s.shiftHeader}>{shift === "Unknown" ? "Other" : `Shift ${shift}`}</div>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr style={s.thead}>
                          <th style={{ ...s.th, width: 36, textAlign: "center" }}>Sl.No</th>
                          <th style={{ ...s.th, width: 72 }}>Tkt No</th>
                          <th style={{ ...s.th, minWidth: 150 }}>Emp Name</th>
                          <th style={{ ...s.th, minWidth: 100 }}>Department</th>
                          <th style={{ ...s.th, width: 52, textAlign: "center" }}>Status</th>
                          <th style={{ ...s.th, width: 88, textAlign: "center" }}>IN</th>
                          <th style={{ ...s.th, width: 88, textAlign: "center" }}>OUT</th>
                          <th style={{ ...s.th, width: 66, textAlign: "center" }}>Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => {
                          const late = r.isLate;
                          const name = r.employee?.firstName || "";
                          return (
                            <tr key={r.id} style={late ? s.lateRow : {}}>
                              <td style={{ ...s.td, textAlign: "center" }}>{i + 1}</td>
                              <td style={s.td}>{r.employee?.employeeCode || ""}</td>
                              <td style={{ ...s.td, textDecoration: late ? "underline" : "none", color: late ? "#dc2626" : "inherit", fontWeight: late ? 500 : 400 }}>
                                {name}
                              </td>
                              <td style={s.td}>{r.employee?.department?.departmentname || ""}</td>
                              <td style={{ ...s.td, textAlign: "center" }}><StatusChip status={r.status} /></td>
                              <td style={{ ...s.td, textAlign: "center", fontFamily: "monospace", fontSize: 11, textDecoration: late ? "underline" : "none", color: late ? "#dc2626" : "inherit", fontWeight: late ? 600 : 400 }}>
                                {fmtTime(r.firstCheckIn)}
                              </td>
                              <td style={{ ...s.td, textAlign: "center", fontFamily: "monospace", fontSize: 11 }}>{fmtTime(r.lastCheckOut)}</td>
                              <td style={{ ...s.td, textAlign: "center", fontWeight: 500 }}>{fmtHours(r.workingHours)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={s.tfootRow}>
                          <td colSpan={7} style={{ ...s.td, textAlign: "right", fontSize: 11, color: "#666" }}>
                            {shift === "Unknown" ? "Total" : `Shift ${shift} total`}
                          </td>
                          <td style={{ ...s.td, textAlign: "center", fontWeight: 600 }}>{rows.length} emp</td>
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
    "Present": { bg: "#dcfce7", color: "#166534", label: "P" },
    "Present with Permission": { bg: "#fef9c3", color: "#854d0e", label: "WP" },
    "Half Day": { bg: "#ffedd5", color: "#9a3412", label: "HD" },
  };
  const cfg = m[status] || { bg: "#f1f5f9", color: "#475569", label: "?" };
  return (
    <span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = {
  page: { padding: 20, maxWidth: "100%", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  title: { fontSize: 22, fontWeight: 600, margin: 0 },
  subtitle: { fontSize: 13, color: "#888", margin: "4px 0 0" },
  filterBar: { display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", padding: "14px 16px", background: "#f8f9fa", borderRadius: 8, border: "1px solid #e9ecef", margin: "16px 0 12px" },
  label: { fontSize: 11, fontWeight: 500, color: "#666" },
  select: { padding: "6px 10px", fontSize: 13, border: "1px solid #ccc", borderRadius: 4, minWidth: 170, background: "#fff" },
  input: { padding: "6px 10px", fontSize: 13, border: "1px solid #ccc", borderRadius: 4 },
  btnPrimary: { padding: "7px 16px", fontSize: 13, fontWeight: 500, background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", alignSelf: "flex-end" },
  btnGreen: { padding: "7px 14px", fontSize: 13, fontWeight: 500, background: "#16a34a", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", alignSelf: "flex-end" },
  btnRed: { padding: "7px 14px", fontSize: 13, fontWeight: 500, background: "#dc2626", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", alignSelf: "flex-end" },
  errorBox: { padding: "10px 14px", background: "#fee2e2", color: "#991b1b", borderRadius: 6, marginBottom: 12, fontSize: 13 },
  legend: { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", fontSize: 12, color: "#555", marginBottom: 12, padding: "8px 12px", background: "#f8f9fa", borderRadius: 6, border: "1px solid #e9ecef" },
  li: { display: "flex", alignItems: "center", gap: 5 },
  dotG: { width: 8, height: 8, borderRadius: "50%", background: "#16a34a", display: "inline-block" },
  dotA: { width: 8, height: 8, borderRadius: "50%", background: "#d97706", display: "inline-block" },
  dotB: { width: 8, height: 8, borderRadius: "50%", background: "#2563eb", display: "inline-block" },
  dateBlock: { marginBottom: 24 },
  dateHeader: { fontSize: 15, fontWeight: 700, color: "#1e3a5f", padding: "6px 12px", background: "#dbeafe", borderRadius: 6, marginBottom: 8, borderLeft: "4px solid #1d4ed8" },
  shiftBlock: { marginBottom: 14 },
  shiftHeader: { fontSize: 12, fontWeight: 600, color: "#1e40af", background: "#eff6ff", padding: "4px 10px", borderRadius: 4, marginBottom: 5, display: "inline-block", border: "1px solid #bfdbfe" },
  tableWrap: { overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 6 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  thead: { background: "#1e293b" },
  th: { padding: "7px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#f8fafc", borderBottom: "1px solid #334155", whiteSpace: "nowrap" },
  td: { padding: "6px 10px", borderBottom: "1px solid #f1f5f9", fontSize: 12, verticalAlign: "middle" },
  lateRow: { background: "#fff7f7" },
  tfootRow: { background: "#f8f9fa", borderTop: "1px solid #e5e7eb" },
  emptyBox: { padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13, background: "#f9fafb", borderRadius: 8, border: "1px dashed #e5e7eb", marginTop: 16 },
};
