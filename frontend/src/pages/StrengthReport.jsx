// ============================================================
// pages/StrengthReport.jsx
// ============================================================
// Strength Report UI
// Grouped by categories with 3-shift details and bottom abstracts.
// ============================================================

import React, { useState, useCallback, useEffect } from "react";
import { apiRequest } from "../utils/apiCaller";

const SHIFT_COLS_WITH_S_OT = [
  { key: "regular", label: "100%" },
  { key: "trainee", label: "Trg" },
  { key: "conTrainee", label: "Con. Trg" },
  { key: "sOt", label: "S OT" },
  { key: "ot", label: "HRS OT" },
  { key: "otConversion", label: "CON. OT" },
  { key: "total", label: "Total" },
];

const SHIFT_COLS_WITHOUT_S_OT = [
  { key: "regular", label: "100%" },
  { key: "trainee", label: "Trg" },
  { key: "conTrainee", label: "Con. Trg" },
  { key: "ot", label: "HRS OT" },
  { key: "otConversion", label: "CON. OT" },
  { key: "total", label: "Total" },
];

const StrengthReport = () => {
  const [activeTab, setActiveTab] = useState("with_s_ot");
  const [companyId, setCompanyId] = useState("");
  const [companies, setCompanies] = useState([]);
  const [date, setDate] = useState(getYesterday());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentShiftCols =
    activeTab === "with_s_ot" ? SHIFT_COLS_WITH_S_OT : SHIFT_COLS_WITHOUT_S_OT;
  const shiftColSpan = currentShiftCols.length;
  const totalTableCols = 2 + shiftColSpan * 3 + 2;

  // ── Fetch company list on mount ──────────────────────────
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const data = await apiRequest("/companies");
        const list = Array.isArray(data) ? data : (data.data || []);
        setCompanies(list);
      } catch (err) {
        console.error("Failed to load companies:", err.message);
      }
    };
    loadCompanies();
  }, []);

  // ── Fetch report ────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    if (!companyId || !date) {
      setError("Please select company and date");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest(
        `/strength-report?companyId=${companyId}&date=${date}`,
      );
      if (res.success) {
        setReport(res.data);
      } else {
        setError(res.error || "Failed to fetch report");
      }
    } catch (err) {
      setError(err.message || "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  }, [companyId, date]);

  // ── Export to Excel ─────────────────────────────────────
  const exportExcel = useCallback(async () => {
    if (!report) return;
    try {
      const token = localStorage.getItem("authToken");
      const omitParam = activeTab === "without_s_ot" ? "&omitSOt=true" : "";
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/strength-report/export-excel?companyId=${companyId}&date=${date}${omitParam}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        activeTab === "without_s_ot"
          ? `Strength_Report_Without_SOT_${date}.xlsx`
          : `Strength_Report_${date}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  }, [report, companyId, date, activeTab]);

  // Group departments by Category Name
  const groupByCategory = (data) => {
    const groups = {};
    data.forEach((dept) => {
      const cat = dept.categoryName || "OTHERS";
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(dept);
    });
    return groups;
  };

  const groupedData = report ? groupByCategory(report.threeShiftData) : {};

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={{ ...styles.header, ...styles.noPrint }}>
        <h2 style={styles.title}>Strength Report</h2>
        <p style={styles.subtitle}>Auto-generated from daily attendance and shift allocations</p>
      </div>

      {/* Tabs */}
      <div style={{ ...styles.tabsContainer, ...styles.noPrint }} className="no-print">
        <button
          type="button"
          style={{
            ...styles.tabButton,
            ...(activeTab === "with_s_ot" ? styles.tabButtonActive : styles.tabButtonInactive),
          }}
          onClick={() => setActiveTab("with_s_ot")}
        >
          Strength Report (With S OT)
        </button>
        <button
          type="button"
          style={{
            ...styles.tabButton,
            ...(activeTab === "without_s_ot" ? styles.tabButtonActive : styles.tabButtonInactive),
          }}
          onClick={() => setActiveTab("without_s_ot")}
        >
          Strength Report (Without S OT)
        </button>
      </div>

      {/* Controls */}
      <div style={{ ...styles.controls, ...styles.noPrint }} className="no-print">
        <div style={styles.controlGroup}>
          <label style={styles.label}>Company</label>
          <select
            style={styles.select}
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="">Select Company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.label}>Date</label>
          <input
            type="date"
            style={styles.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <button
          style={styles.btnPrimary}
          onClick={fetchReport}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate"}
        </button>

        {report && (
          <>
            <button style={styles.btnSecondary} onClick={exportExcel}>
              Export Excel
            </button>
            <button style={styles.btnSecondary} onClick={() => window.print()}>
              Print / PDF
            </button>
          </>
        )}
      </div>

      {/* Error */}
      {error && <div style={{ ...styles.error, ...styles.noPrint }}>{error}</div>}

      {/* Report Table Container */}
      {report && (
        <div style={styles.reportWrapper} className="strength-report">
          {/* Company header for print */}
          <div style={styles.printHeader}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1e3a8a" }}>
              {report.companyName}
            </h3>
            <p style={{ margin: "4px 0 12px", fontSize: 13, color: "#475569", fontWeight: 600 }}>
              Strength Report {activeTab === "without_s_ot" ? "(Without S OT) " : ""}- From {formatDate(report.date)} to {formatDate(report.date)}
            </p>
          </div>

          {/* ─── Three-Shift Table ─── */}
          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                {/* Row 1: Group headers */}
                <tr>
                  <th style={{ ...styles.th, ...styles.thSticky }} rowSpan={2}>
                    Dept. Name
                  </th>
                  <th style={styles.th} rowSpan={2}>
                    Day STD
                  </th>
                  <th style={styles.thShiftA} colSpan={shiftColSpan}>
                    SHIFT I
                  </th>
                  <th style={styles.thShiftB} colSpan={shiftColSpan}>
                    SHIFT II
                  </th>
                  <th style={styles.thShiftC} colSpan={shiftColSpan}>
                    SHIFT III
                  </th>
                  <th style={styles.thOverall} colSpan={2}>
                    OVER ALL
                  </th>
                </tr>
                {/* Row 2: Sub headers */}
                <tr>
                  {[0, 1, 2].map((i) => {
                    const bgs = [styles.thSubA, styles.thSubB, styles.thSubC];
                    return currentShiftCols.map((c) => (
                      <th key={`${i}-${c.key}`} style={{ ...styles.thSub, ...bgs[i] }}>
                        {c.label}
                      </th>
                    ));
                  })}
                  <th style={styles.thOverallSub}>Con Total</th>
                  <th style={styles.thOverallSub}>Diff</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedData).map(([categoryName, depts]) => (
                  <React.Fragment key={categoryName}>
                    {/* Category Divider Row */}
                    <tr style={styles.categoryRow}>
                      <td colSpan={totalTableCols} style={styles.categoryTd}>
                        {categoryName.toUpperCase()}
                      </td>
                    </tr>

                    {/* Department Rows */}
                    {depts.map((dept) => {
                      // Render all departments regardless of employee/headcount data presence
                      return (
                        <tr key={dept.departmentId} style={styles.dataRow}>
                          <td style={styles.tdName}>{dept.departmentName}</td>
                          <td style={styles.tdCenter}>{dept.dayStd || "-"}</td>
                          {["shiftI", "shiftII", "shiftIII"].map((s) =>
                            currentShiftCols.map((c) => (
                              <td
                                key={`${dept.departmentId}-${s}-${c.key}`}
                                style={styles.tdCenter}
                              >
                                {cell(dept[s][c.key])}
                              </td>
                            )),
                          )}
                          <td style={styles.tdBold}>{cell(dept.overallTotal)}</td>
                          <td
                            style={{
                              ...styles.tdBold,
                              color: diffColor(dept.diff),
                            }}
                          >
                            {diffDisplay(dept.diff)}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}

                {/* Grand Total Row */}
                <tr style={styles.grandTotalRow}>
                  <td style={{ ...styles.tdName, fontWeight: 700, background: "#e2e8f0" }}>
                    Grand Total
                  </td>
                  <td style={styles.tdBold}>{report.grandTotal.dayStd}</td>
                  {["shiftI", "shiftII", "shiftIII"].map((s) =>
                    currentShiftCols.map((c) => (
                      <td key={`gt-${s}-${c.key}`} style={styles.tdBold}>
                        {cell(report.grandTotal[s][c.key])}
                      </td>
                    )),
                  )}
                  <td style={styles.tdBold}>
                    {report.grandTotal.overallTotal}
                  </td>
                  <td
                    style={{
                      ...styles.tdBold,
                      color: diffColor(report.grandTotal.diff),
                    }}
                  >
                    {diffDisplay(report.grandTotal.diff)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ─── Bottom Abstracts ─── */}
          <div style={styles.abstractsContainer}>
            {/* 1. Trainee/Contract Shift Abstract */}
            <div style={styles.abstractTableWrapper}>
              <table style={styles.abstractTable}>
                <thead>
                  <tr>
                    <th style={styles.thAbstractHeader} colSpan={5}>
                      TRG / CON. SHIFT ABSTRACT
                    </th>
                  </tr>
                  <tr>
                    <th style={styles.thAbstractSub}>Category</th>
                    <th style={styles.thAbstractSub}>SHIFT I</th>
                    <th style={styles.thAbstractSub}>SHIFT II</th>
                    <th style={styles.thAbstractSub}>SHIFT III</th>
                    <th style={styles.thAbstractSub}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Contract Doffer", key: "contractDoffer" },
                    { label: "Semi Contract", key: "semiContract" },
                    { label: "Rawhands", key: "rawHands" },
                    { label: "Multi Skill", key: "multiSkill" },
                  ].map((row) => {
                    const s1 = report.bottomAbstract[row.key].shiftI;
                    const s2 = report.bottomAbstract[row.key].shiftII;
                    const s3 = report.bottomAbstract[row.key].shiftIII;
                    const tot = Math.round((s1 + s2 + s3) * 10) / 10;
                    return (
                      <tr key={row.key} style={styles.dataRow}>
                        <td style={styles.tdAbstractLabel}>{row.label}</td>
                        <td style={styles.tdAbstractVal}>{cell(s1)}</td>
                        <td style={styles.tdAbstractVal}>{cell(s2)}</td>
                        <td style={styles.tdAbstractVal}>{cell(s3)}</td>
                        <td style={styles.tdAbstractValBold}>{cell(tot)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. Attendance Abstract */}
            <div style={styles.abstractTableWrapper}>
              <table style={styles.abstractTable}>
                <thead>
                  <tr>
                    <th style={styles.thAbstractHeader} colSpan={2}>
                      ATTENDANCE ABSTRACT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.tdAbstractLabel}>100% Work Load</td>
                    <td style={styles.tdAbstractValBold}>{report.attendanceAbstract.workLoad100}</td>
                  </tr>
                  <tr>
                    <td style={styles.tdAbstractLabel}>OT Conversion</td>
                    <td style={styles.tdAbstractValBold}>{report.attendanceAbstract.otConversion}</td>
                  </tr>
                  <tr>
                    <td style={styles.tdAbstractLabel}>Trg. Conversion</td>
                    <td style={styles.tdAbstractValBold}>{report.attendanceAbstract.trgConversion}</td>
                  </tr>
                  <tr style={styles.abstractTotalRow}>
                    <td style={styles.tdAbstractLabelBold}>Total</td>
                    <td style={styles.tdAbstractValExtraBold}>{report.attendanceAbstract.total}</td>
                  </tr>
                  <tr style={styles.abstractHighlightRow}>
                    <td style={styles.tdAbstractLabelBold}>Trg. Work</td>
                    <td style={styles.tdAbstractValExtraBold}>{report.attendanceAbstract.trgWork}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. Trainee Abstract */}
            <div style={styles.abstractTableWrapper}>
              <table style={styles.abstractTable}>
                <thead>
                  <tr>
                    <th style={styles.thAbstractHeader} colSpan={2}>
                      TRAINEE ABSTRACT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.tdAbstractLabel}>100% Work Load</td>
                    <td style={styles.tdAbstractValBold}>{report.traineeAbstract.workLoad100}</td>
                  </tr>
                  <tr>
                    <td style={styles.tdAbstractLabel}>Raw hands</td>
                    <td style={styles.tdAbstractValBold}>{report.traineeAbstract.rawHands}</td>
                  </tr>
                  <tr>
                    <td style={styles.tdAbstractLabel}>Multi Skill</td>
                    <td style={styles.tdAbstractValBold}>{report.traineeAbstract.multiSkill}</td>
                  </tr>
                  {report.traineeAbstract.contractDoffer > 0 && (
                    <tr>
                      <td style={styles.tdAbstractLabel}>Contract Doffer</td>
                      <td style={styles.tdAbstractValBold}>{report.traineeAbstract.contractDoffer}</td>
                    </tr>
                  )}
                  {report.traineeAbstract.semiContract > 0 && (
                    <tr>
                      <td style={styles.tdAbstractLabel}>Semi Contract</td>
                      <td style={styles.tdAbstractValBold}>{report.traineeAbstract.semiContract}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={styles.tdAbstractLabel}>OT Conversion</td>
                    <td style={styles.tdAbstractValBold}>{report.traineeAbstract.otConversion}</td>
                  </tr>
                  <tr>
                    <td style={styles.tdAbstractLabel}>Trg. Strength</td>
                    <td style={styles.tdAbstractValBold}>{report.traineeAbstract.trgStrength}</td>
                  </tr>
                  <tr style={styles.abstractTotalRow}>
                    <td style={styles.tdAbstractLabelBold}>Total</td>
                    <td style={styles.tdAbstractValExtraBold}>{report.traineeAbstract.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer (for print/view signatures) */}
          <div style={styles.footer}>
            <div style={styles.footerSignatures}>
              {[
                "PREPARED",
                "AM (Trg)",
                "M (QAT)",
                "AM(Prod)",
                "Sr.M (M)",
                "M (Ele)",
                "AM (Pers)",
                "PM",
                "GM (T)",
                "MD",
              ].map((role) => (
                <div key={role} style={styles.signBlock}>
                  <div style={styles.signLine}></div>
                  <span style={styles.signLabel}>{role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function cell(val) {
  if (val === 0 || val === null || val === undefined) return "-";
  return val;
}

function diffColor(val) {
  if (val < 0) return "#dc2626"; // red-600
  if (val > 0) return "#15803d"; // green-700
  return "#64748b"; // slate-500
}

function diffDisplay(val) {
  if (val === 0) return "-";
  if (val > 0) return `+${val}`;
  return val;
}

// ── Styles ────────────────────────────────────────────────────

const styles = {
  container: {
    padding: "24px",
    maxWidth: "100%",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    margin: "6px 0 0",
  },
  tabsContainer: {
    display: "flex",
    gap: 8,
    marginBottom: 20,
    borderBottom: "2px solid #e2e8f0",
    paddingBottom: 0,
  },
  tabButton: {
    padding: "10px 20px",
    fontSize: 13,
    borderRadius: "6px 6px 0 0",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    border: "1px solid transparent",
    marginBottom: "-2px",
  },
  tabButtonActive: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontWeight: 700,
    borderColor: "#2563eb",
    boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
  },
  tabButtonInactive: {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    fontWeight: 600,
    borderColor: "#e2e8f0",
    borderBottomColor: "transparent",
  },
  controls: {
    display: "flex",
    gap: 16,
    alignItems: "flex-end",
    flexWrap: "wrap",
    marginBottom: 24,
    padding: "16px 20px",
    background: "#f8fafc",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
  },
  controlGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
  },
  select: {
    padding: "8px 12px",
    fontSize: 13,
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    minWidth: 220,
    outline: "none",
    backgroundColor: "#fff",
  },
  input: {
    padding: "8px 12px",
    fontSize: 13,
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    outline: "none",
    backgroundColor: "#fff",
  },
  btnPrimary: {
    padding: "9px 24px",
    fontSize: 13,
    fontWeight: 600,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  btnSecondary: {
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 600,
    background: "#fff",
    color: "#334155",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  error: {
    padding: "12px 20px",
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fee2e2",
    borderRadius: 6,
    marginBottom: 20,
    fontSize: 13,
  },
  reportWrapper: {
    marginTop: 8,
  },
  printHeader: {
    textAlign: "center",
    marginBottom: 16,
  },
  tableScroll: {
    overflowX: "auto",
    marginBottom: 24,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  th: {
    padding: "8px 10px",
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    fontWeight: 700,
    fontSize: 11,
    textAlign: "center",
    color: "#334155",
  },
  thSticky: {
    position: "sticky",
    left: 0,
    zIndex: 2,
    minWidth: 180,
    textAlign: "left",
  },
  thShiftA: {
    padding: "6px 8px",
    background: "#dbeafe",
    border: "1px solid #cbd5e1",
    fontWeight: 700,
    fontSize: 11,
    textAlign: "center",
    color: "#1e40af",
  },
  thShiftB: {
    padding: "6px 8px",
    background: "#fde68a",
    border: "1px solid #cbd5e1",
    fontWeight: 700,
    fontSize: 11,
    textAlign: "center",
    color: "#92400e",
  },
  thShiftC: {
    padding: "6px 8px",
    background: "#d1fae5",
    border: "1px solid #cbd5e1",
    fontWeight: 700,
    fontSize: 11,
    textAlign: "center",
    color: "#065f46",
  },
  thSub: {
    padding: "5px 8px",
    border: "1px solid #cbd5e1",
    fontWeight: 600,
    fontSize: 10,
    textAlign: "center",
    minWidth: 50,
  },
  thSubA: {
    background: "#eff6ff",
    color: "#2563eb",
  },
  thSubB: {
    background: "#fffbeb",
    color: "#d97706",
  },
  thSubC: {
    background: "#ecfdf5",
    color: "#059669",
  },
  thOverall: {
    padding: "6px 8px",
    background: "#e9d5ff",
    border: "1px solid #cbd5e1",
    fontWeight: 700,
    fontSize: 11,
    textAlign: "center",
    color: "#6b21a8",
  },
  thOverallSub: {
    padding: "5px 8px",
    background: "#f5f3ff",
    border: "1px solid #cbd5e1",
    fontWeight: 600,
    fontSize: 10,
    textAlign: "center",
    color: "#7c3aed",
    minWidth: 60,
  },
  categoryRow: {
    background: "#f1f5f9",
    borderTop: "1px solid #cbd5e1",
    borderBottom: "1px solid #cbd5e1",
  },
  categoryTd: {
    padding: "8px 12px",
    fontWeight: "700",
    fontSize: "11px",
    color: "#334155",
    textAlign: "left",
    position: "sticky",
    left: 0,
    background: "#f1f5f9",
    zIndex: 1,
    letterSpacing: "0.05em",
  },
  dataRow: {
    borderBottom: "1px solid #f1f5f9",
    backgroundColor: "#ffffff",
  },
  tdName: {
    padding: "6px 12px",
    border: "1px solid #e2e8f0",
    textAlign: "left",
    fontWeight: 500,
    fontSize: 12,
    position: "sticky",
    left: 0,
    background: "#fff",
    zIndex: 1,
    color: "#1e293b",
  },
  tdCenter: {
    padding: "5px 8px",
    border: "1px solid #e2e8f0",
    textAlign: "center",
    fontSize: 12,
    color: "#334155",
  },
  tdBold: {
    padding: "5px 8px",
    border: "1px solid #cbd5e1",
    textAlign: "center",
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: "#f8fafc",
  },
  grandTotalRow: {
    background: "#e2e8f0",
    borderTop: "2px solid #475569",
    borderBottom: "2px solid #475569",
  },
  abstractsContainer: {
    display: "flex",
    gap: "24px",
    marginTop: "32px",
    flexWrap: "wrap",
  },
  abstractTableWrapper: {
    flex: "1 1 300px",
    minWidth: "280px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
  },
  abstractTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  },
  thAbstractHeader: {
    padding: "8px 10px",
    background: "#475569",
    color: "#ffffff",
    fontWeight: "700",
    fontSize: "11px",
    textAlign: "center",
    borderBottom: "1px solid #475569",
  },
  thAbstractSub: {
    padding: "6px 8px",
    background: "#f1f5f9",
    borderBottom: "1px solid #cbd5e1",
    borderRight: "1px solid #cbd5e1",
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
  },
  tdAbstractLabel: {
    padding: "6px 10px",
    borderBottom: "1px solid #e2e8f0",
    borderRight: "1px solid #e2e8f0",
    textAlign: "left",
    fontWeight: 500,
    color: "#334155",
  },
  tdAbstractLabelBold: {
    padding: "6px 10px",
    borderBottom: "1px solid #cbd5e1",
    borderRight: "1px solid #cbd5e1",
    textAlign: "left",
    fontWeight: "700",
    color: "#1e293b",
  },
  tdAbstractVal: {
    padding: "6px 8px",
    borderBottom: "1px solid #e2e8f0",
    borderRight: "1px solid #e2e8f0",
    textAlign: "center",
    color: "#475569",
  },
  tdAbstractValBold: {
    padding: "6px 8px",
    borderBottom: "1px solid #cbd5e1",
    borderRight: "1px solid #cbd5e1",
    textAlign: "center",
    fontWeight: "600",
    color: "#1e293b",
  },
  tdAbstractValExtraBold: {
    padding: "6px 8px",
    borderBottom: "1px solid #cbd5e1",
    borderRight: "1px solid #cbd5e1",
    textAlign: "center",
    fontWeight: "700",
    color: "#0f172a",
  },
  abstractTotalRow: {
    background: "#f8fafc",
    borderTop: "2px solid #94a3b8",
  },
  abstractHighlightRow: {
    background: "#f0f9ff",
    borderTop: "2px solid #0284c7",
    borderBottom: "1px solid #0284c7",
  },
  footer: {
    marginTop: 40,
    paddingTop: 24,
    borderTop: "1px solid #e2e8f0",
  },
  footerSignatures: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
  },
  signBlock: {
    textAlign: "center",
    minWidth: 80,
    flex: "1",
  },
  signLine: {
    width: "100%",
    borderBottom: "1px solid #cbd5e1",
    marginBottom: 6,
    height: 35,
  },
  signLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: 600,
  },
  noPrint: {},
};

// Print styles
if (typeof document !== "undefined") {
  const printStyle = document.createElement("style");
  printStyle.textContent = `
    @media print {
      /* Hide sidebar and non-report elements */
      nav, .no-print, [class*="no-print"], button, select, input {
        display: none !important;
      }
      
      /* Reset layout wrappers to allow normal page breaks and natural flow */
      html, body, #root, div[class*="h-screen"], main {
        height: auto !important;
        overflow: visible !important;
        display: block !important;
        position: static !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      
      .strength-report {
        display: block !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        position: static !important;
        zoom: 60% !important;
      }

      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      thead {
        display: table-header-group !important;
      }
      
      @page {
        size: landscape;
        margin: 5mm;
      }
    }
  `;
  document.head.appendChild(printStyle);
}

export default StrengthReport;
