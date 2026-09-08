// ============================================================
// pages/StrengthReportOld.jsx
// ============================================================
// Strength Report — matches the PDF layout exactly:
//
// Header:  Company Name | "Strength Report From DD-MM-YYYY to DD-MM-YYYY"
//
// Table columns:
//   Deptname | [Shift A: Strength | S OT | H OT] | [Shift B: Strength | S OT | H OT] | [Shift C: Strength | S OT | H OT] | Req | STR | H.OT
//
// Rows:
//   - Category header rows (PREPARATORY, SPINNING, AUTOCONER, Others, etc.)
//   - Department rows (regular + trainee depts mixed per slno order)
//   - Category sub-total row
//   - Grand Total row
//
// Signature row at bottom: PREPARED | AM (Trg) | M (QAT) | AM(Prod) |
//                           Sr.M (M) | M (Ele) | AM (Pers) | PM | GM (T) | MANAGING DIRECTOR
// ============================================================

import React, { useState, useCallback, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiRequest } from "../utils/apiCaller";

// ── Helpers ───────────────────────────────────────────────────
function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function cv(val) {
  // Display 0 / null / undefined as blank (matching PDF where empty cells are blank)
  if (val === 0 || val === null || val === undefined || val === "-") return "";
  return val;
}

function cvN(val) {
  // For S OT count — show blank when 0
  if (!val || val === 0) return "";
  return val;
}

function rnd(v) {
  return Math.round((v || 0) * 10) / 10;
}

function hasData(dept) {
  return true;
}

function computeCatTotal(depts) {
  const acc = {
    req: 0,
    shiftA: { strength: 0, sotCount: 0, hotHours: 0 },
    shiftB: { strength: 0, sotCount: 0, hotHours: 0 },
    shiftC: { strength: 0, sotCount: 0, hotHours: 0 },
    totalStrength: 0,
    totalHot: 0,
  };
  (depts || []).forEach((d) => {
    if (!hasData(d)) return;
    acc.req += d.req || 0;
    ["shiftA", "shiftB", "shiftC"].forEach((s) => {
      acc[s].strength += d[s]?.strength || 0;
      acc[s].sotCount += d[s]?.sotCount || 0;
      acc[s].hotHours += d[s]?.hotHours || 0;
    });
    acc.totalStrength += d.totalStrength || 0;
    acc.totalHot += d.totalHot || 0;
  });
  ["shiftA", "shiftB", "shiftC"].forEach((s) => {
    acc[s].strength = rnd(acc[s].strength);
    acc[s].hotHours = rnd(acc[s].hotHours);
  });
  acc.req = rnd(acc.req);
  acc.totalStrength = rnd(acc.totalStrength);
  acc.totalHot = rnd(acc.totalHot);
  return acc;
}

// ── Component ──────────────────────────────────────────────────
const StrengthReportOld = () => {
  const [companyId, setCompanyId] = useState("");
  const [companies, setCompanies] = useState([]);
  const [date, setDate] = useState(getYesterday());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dateLabel = fmtDate(date);

  // Load companies on mount
  useEffect(() => {
    apiRequest("/companies")
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setCompanies(list);
        if (list.length > 0 && !companyId) {
          setCompanyId(list[0].id);
        }
      })
      .catch((err) => console.error("Failed to load companies:", err.message));
  }, []);

  // Fetch report
  const fetchReport = useCallback(async () => {
    if (!companyId || !date) {
      setError("Please select a company and date.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest(
        `/strength-report-old?companyId=${companyId}&date=${date}`
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

  // Auto-fetch report on company/date change
  useEffect(() => {
    if (companyId && date) {
      fetchReport();
    }
  }, [companyId, date, fetchReport]);

  // Export Excel
  const exportExcel = useCallback(async () => {
    if (!report) return;
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/strength-report-old/export-excel?companyId=${companyId}&date=${date}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to export Excel");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `strength_report_${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  }, [report, companyId, date]);

  // Export PDF
  const exportPDF = useCallback(() => {
    if (!report) return;
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();

      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageW, 16, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(report.companyName || "Strength Report", 14, 10);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Strength Report  From ${dateLabel}  to  ${dateLabel}`, pageW - 14, 10, { align: "right" });

      const headerRow1 = [
        { content: "Deptname", rowSpan: 2, styles: { halign: "left", valign: "middle", fontStyle: "bold" } },
        { content: "A", colSpan: 3, styles: { halign: "center", fontStyle: "bold", fillColor: [239, 246, 255], textColor: [30, 64, 175] } },
        { content: "B", colSpan: 3, styles: { halign: "center", fontStyle: "bold", fillColor: [254, 242, 242], textColor: [153, 27, 27] } },
        { content: "C", colSpan: 3, styles: { halign: "center", fontStyle: "bold", fillColor: [240, 253, 244], textColor: [22, 101, 52] } },
        { content: "Req", rowSpan: 2, styles: { halign: "center", valign: "middle", fontStyle: "bold", fillColor: [248, 250, 252] } },
        { content: "STR", rowSpan: 2, styles: { halign: "center", valign: "middle", fontStyle: "bold", fillColor: [248, 250, 252] } },
        { content: "H.OT", rowSpan: 2, styles: { halign: "center", valign: "middle", fontStyle: "bold", fillColor: [248, 250, 252] } },
      ];

      const headerRow2 = [
        { content: "Strength", styles: { halign: "center", fontSize: 6.5, fillColor: [239, 246, 255] } },
        { content: "S OT", styles: { halign: "center", fontSize: 6.5, fillColor: [239, 246, 255] } },
        { content: "H OT", styles: { halign: "center", fontSize: 6.5, fillColor: [239, 246, 255] } },
        { content: "Strength", styles: { halign: "center", fontSize: 6.5, fillColor: [254, 242, 242] } },
        { content: "S OT", styles: { halign: "center", fontSize: 6.5, fillColor: [254, 242, 242] } },
        { content: "H OT", styles: { halign: "center", fontSize: 6.5, fillColor: [254, 242, 242] } },
        { content: "Strength", styles: { halign: "center", fontSize: 6.5, fillColor: [240, 253, 244] } },
        { content: "S OT", styles: { halign: "center", fontSize: 6.5, fillColor: [240, 253, 244] } },
        { content: "H OT", styles: { halign: "center", fontSize: 6.5, fillColor: [240, 253, 244] } },
      ];

      const bodyRows = [];
      (report.categoryGroups || []).forEach((group) => {
        bodyRows.push([
          { content: group.categoryName.toUpperCase(), colSpan: 13, styles: { fontStyle: "bold", fillColor: [226, 232, 240], fontSize: 7, halign: "left" } },
        ]);

        const visibleDepts = group.departments || [];
        visibleDepts.forEach((dept) => {
          bodyRows.push([
            { content: dept.departmentName, styles: { fontStyle: "bold", halign: "left" } },
            { content: String(cv(dept.shiftA.strength)), styles: { halign: "center" } },
            { content: String(cvN(dept.shiftA.sotCount)), styles: { halign: "center" } },
            { content: String(cv(dept.shiftA.hotHours)), styles: { halign: "center" } },
            { content: String(cv(dept.shiftB.strength)), styles: { halign: "center" } },
            { content: String(cvN(dept.shiftB.sotCount)), styles: { halign: "center" } },
            { content: String(cv(dept.shiftB.hotHours)), styles: { halign: "center" } },
            { content: String(cv(dept.shiftC.strength)), styles: { halign: "center" } },
            { content: String(cvN(dept.shiftC.sotCount)), styles: { halign: "center" } },
            { content: String(cv(dept.shiftC.hotHours)), styles: { halign: "center" } },
            { content: String(cv(dept.req)), styles: { halign: "center", fontStyle: "bold" } },
            { content: String(cv(dept.totalStrength)), styles: { halign: "center", fontStyle: "bold" } },
            { content: String(cv(dept.totalHot)), styles: { halign: "center", fontStyle: "bold" } },
          ]);
        });

        const catTotal = computeCatTotal(visibleDepts);
        bodyRows.push([
          { content: `TOTAL ${group.categoryName.toUpperCase()}`, styles: { fontStyle: "bold", fillColor: [241, 245, 249], halign: "left" } },
          { content: String(cv(catTotal.shiftA.strength)), styles: { fontStyle: "bold", fillColor: [241, 245, 249], halign: "center" } },
          { content: String(cvN(catTotal.shiftA.sotCount)), styles: { fontStyle: "bold", fillColor: [241, 245, 249], halign: "center" } },
          { content: String(cv(catTotal.shiftA.hotHours)), styles: { fontStyle: "bold", fillColor: [241, 245, 249], halign: "center" } },
          { content: String(cv(catTotal.shiftB.strength)), styles: { fontStyle: "bold", fillColor: [241, 245, 249], halign: "center" } },
          { content: String(cvN(catTotal.shiftB.sotCount)), styles: { fontStyle: "bold", fillColor: [241, 245, 249], halign: "center" } },
          { content: String(cv(catTotal.shiftB.hotHours)), styles: { fontStyle: "bold", fillColor: [241, 245, 249], halign: "center" } },
          { content: String(cv(catTotal.shiftC.strength)), styles: { fontStyle: "bold", fillColor: [241, 245, 249], halign: "center" } },
          { content: String(cvN(catTotal.shiftC.sotCount)), styles: { fontStyle: "bold", fillColor: [241, 245, 249], halign: "center" } },
          { content: String(cv(catTotal.shiftC.hotHours)), styles: { fontStyle: "bold", fillColor: [241, 245, 249], halign: "center" } },
          { content: String(cv(catTotal.req)), styles: { fontStyle: "bold", fillColor: [241, 245, 249], halign: "center" } },
          { content: String(cv(catTotal.totalStrength)), styles: { fontStyle: "bold", fillColor: [241, 245, 249], halign: "center" } },
          { content: String(cv(catTotal.totalHot)), styles: { fontStyle: "bold", fillColor: [241, 245, 249], halign: "center" } },
        ]);
      });

      // Grand total
      bodyRows.push([
        { content: "GRAND TOTAL", styles: { fontStyle: "bold", fillColor: [226, 232, 240], halign: "left" } },
        { content: String(cv(report.grandTotal.shiftA.strength)), styles: { fontStyle: "bold", fillColor: [226, 232, 240], halign: "center" } },
        { content: String(cvN(report.grandTotal.shiftA.sotCount)), styles: { fontStyle: "bold", fillColor: [226, 232, 240], halign: "center" } },
        { content: String(cv(report.grandTotal.shiftA.hotHours)), styles: { fontStyle: "bold", fillColor: [226, 232, 240], halign: "center" } },
        { content: String(cv(report.grandTotal.shiftB.strength)), styles: { fontStyle: "bold", fillColor: [226, 232, 240], halign: "center" } },
        { content: String(cvN(report.grandTotal.shiftB.sotCount)), styles: { fontStyle: "bold", fillColor: [226, 232, 240], halign: "center" } },
        { content: String(cv(report.grandTotal.shiftB.hotHours)), styles: { fontStyle: "bold", fillColor: [226, 232, 240], halign: "center" } },
        { content: String(cv(report.grandTotal.shiftC.strength)), styles: { fontStyle: "bold", fillColor: [226, 232, 240], halign: "center" } },
        { content: String(cvN(report.grandTotal.shiftC.sotCount)), styles: { fontStyle: "bold", fillColor: [226, 232, 240], halign: "center" } },
        { content: String(cv(report.grandTotal.shiftC.hotHours)), styles: { fontStyle: "bold", fillColor: [226, 232, 240], halign: "center" } },
        { content: String(cv(report.grandTotal.req)), styles: { fontStyle: "bold", fillColor: [226, 232, 240], halign: "center" } },
        { content: String(cv(report.grandTotal.totalStrength)), styles: { fontStyle: "bold", fillColor: [226, 232, 240], halign: "center" } },
        { content: String(cv(report.grandTotal.totalHot)), styles: { fontStyle: "bold", fillColor: [226, 232, 240], halign: "center" } },
      ]);

      autoTable(doc, {
        startY: 20,
        head: [headerRow1, headerRow2],
        body: bodyRows,
        theme: "grid",
        styles: { fontSize: 6.5, cellPadding: 0.8, lineColor: [203, 213, 225], lineWidth: 0.1, valign: "middle" },
        headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" },
        margin: { left: 8, right: 8 },
        didDrawPage: (data) => {
          doc.setFontSize(7);
          doc.setTextColor(100);
          doc.text(`Page ${data.pageNumber}`, pageW - 14, doc.internal.pageSize.getHeight() - 5, { align: "right" });
        },
      });

      let sigY = doc.lastAutoTable.finalY + 8;
      if (sigY > doc.internal.pageSize.getHeight() - 14) {
        doc.addPage();
        sigY = 16;
      }

      const sigRoles = ["PREPARED", "AM (Trg)", "M (QAT)", "AM(Prod)", "Sr.M (M)", "M (Ele)", "AM (Pers)", "PM", "GM (T)", "MANAGING DIRECTOR"];
      const sigSpacing = (pageW - 20) / sigRoles.length;
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);

      sigRoles.forEach((role, i) => {
        const x = 10 + i * sigSpacing;
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.3);
        doc.line(x, sigY, x + sigSpacing - 4, sigY);
        doc.text(role, x + (sigSpacing - 4) / 2, sigY + 3.5, { align: "center" });
      });

      doc.save(`strength_report_${date}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to download PDF: " + err.message);
    }
  }, [report, dateLabel, date]);

  return (
    <div style={S.container}>
      {/* ── Controls ── */}
      <div style={{ ...S.controls, ...S.noPrint }}>
        <h2 style={S.pageTitle}>Strength Report</h2>
        <div style={S.controlRow}>
          <div style={S.controlGroup}>
            <label style={S.label}>Company</label>
            <select
              style={S.select}
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

          <div style={S.controlGroup}>
            <label style={S.label}>Date</label>
            <input
              type="date"
              style={S.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <button style={S.btnPrimary} onClick={fetchReport} disabled={loading}>
            {loading ? "Generating…" : "Generate"}
          </button>

          {report && (
            <>
              <button style={S.btnSecondary} onClick={exportExcel}>
                📊 Download Excel
              </button>
              <button style={S.btnSecondary} onClick={exportPDF}>
                📄 Download PDF
              </button>
              <button style={S.btnSecondary} onClick={() => window.print()}>
                🖨️ Print
              </button>
            </>
          )}
        </div>
        {error && <div style={S.error}>{error}</div>}
      </div>

      {/* ── Report ── */}
      {report && (
        <div style={S.reportWrapper} className="strength-report-print">
          {/* Company + Date header */}
          <div style={S.reportHeader}>
            <div style={S.companyName}>{report.companyName}</div>
            <div style={S.reportSubtitle}>
              Strength Report&nbsp;&nbsp;From {dateLabel}&nbsp;&nbsp;to&nbsp;&nbsp;{dateLabel}
            </div>
          </div>

          {/* Main Table */}
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                {/* Row 1: Shift group headers */}
                <tr>
                  <th style={{ ...S.thBase, ...S.thDept }} rowSpan={2}>
                    Deptname
                  </th>
                  <th style={{ ...S.thBase, ...S.thShiftA }} colSpan={3}>
                    A
                  </th>
                  <th style={{ ...S.thBase, ...S.thShiftB }} colSpan={3}>
                    B
                  </th>
                  <th style={{ ...S.thBase, ...S.thShiftC }} colSpan={3}>
                    C
                  </th>
                  <th style={{ ...S.thBase, ...S.thOverall }} rowSpan={2}>
                    Req
                  </th>
                  <th style={{ ...S.thBase, ...S.thOverall }} rowSpan={2}>
                    STR
                  </th>
                  <th style={{ ...S.thBase, ...S.thOverall }} rowSpan={2}>
                    H.OT
                  </th>
                </tr>
                {/* Row 2: Sub-column headers */}
                <tr>
                  {[S.thSubA, S.thSubB, S.thSubC].map((style, si) =>
                    ["Strength", "S OT", "H OT"].map((label) => (
                      <th
                        key={`${si}-${label}`}
                        style={{ ...S.thBase, ...S.thSub, ...style }}
                      >
                        {label}
                      </th>
                    ))
                  )}
                </tr>
              </thead>

              <tbody>
                {report.categoryGroups.map((group) => {
                  const catTotal = computeCatTotal(group.departments);
                  const visibleDepts = group.departments.filter(hasData);

                  return (
                    <React.Fragment key={group.categoryName}>
                      {/* Category header */}
                      <tr style={S.catRow}>
                        <td colSpan={13} style={S.catCell}>
                          {group.categoryName.toUpperCase()}
                        </td>
                      </tr>

                      {/* Department rows */}
                      {visibleDepts.map((dept) => (
                        <tr key={dept.departmentId} style={S.dataRow}>
                          <td style={S.tdDept}>{dept.departmentName}</td>
                          {/* Shift A */}
                          <td style={S.tdNum}>{cv(dept.shiftA.strength)}</td>
                          <td style={S.tdNum}>{cvN(dept.shiftA.sotCount)}</td>
                          <td style={S.tdNum}>{cv(dept.shiftA.hotHours)}</td>
                          {/* Shift B */}
                          <td style={S.tdNum}>{cv(dept.shiftB.strength)}</td>
                          <td style={S.tdNum}>{cvN(dept.shiftB.sotCount)}</td>
                          <td style={S.tdNum}>{cv(dept.shiftB.hotHours)}</td>
                          {/* Shift C */}
                          <td style={S.tdNum}>{cv(dept.shiftC.strength)}</td>
                          <td style={S.tdNum}>{cvN(dept.shiftC.sotCount)}</td>
                          <td style={S.tdNum}>{cv(dept.shiftC.hotHours)}</td>
                          {/* Totals */}
                          <td style={S.tdReq}>{dept.req || ""}</td>
                          <td style={S.tdTotal}>{cv(dept.totalStrength)}</td>
                          <td style={S.tdTotal}>{cv(dept.totalHot)}</td>
                        </tr>
                      ))}

                      {/* Category Sub-total */}
                      {visibleDepts.length > 1 && (
                        <tr style={S.catTotalRow}>
                          <td style={{ ...S.tdDept, ...S.catTotalLabel }}>
                            &nbsp;
                          </td>
                          <td style={S.tdCatTotal}>{cv(catTotal.shiftA.strength)}</td>
                          <td style={S.tdCatTotal}>{cvN(catTotal.shiftA.sotCount)}</td>
                          <td style={S.tdCatTotal}>{cv(catTotal.shiftA.hotHours)}</td>
                          <td style={S.tdCatTotal}>{cv(catTotal.shiftB.strength)}</td>
                          <td style={S.tdCatTotal}>{cvN(catTotal.shiftB.sotCount)}</td>
                          <td style={S.tdCatTotal}>{cv(catTotal.shiftB.hotHours)}</td>
                          <td style={S.tdCatTotal}>{cv(catTotal.shiftC.strength)}</td>
                          <td style={S.tdCatTotal}>{cvN(catTotal.shiftC.sotCount)}</td>
                          <td style={S.tdCatTotal}>{cv(catTotal.shiftC.hotHours)}</td>
                          <td style={S.tdCatTotal}>{catTotal.req || ""}</td>
                          <td style={S.tdCatTotal}>{cv(catTotal.totalStrength)}</td>
                          <td style={S.tdCatTotal}>{cv(catTotal.totalHot)}</td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Grand Total */}
                <tr style={S.grandTotalRow}>
                  <td style={{ ...S.tdDept, ...S.grandTotalLabel }}>
                    Grand Total
                  </td>
                  <td style={S.tdGrand}>{cv(report.grandTotal.shiftA.strength)}</td>
                  <td style={S.tdGrand}>{cvN(report.grandTotal.shiftA.sotCount)}</td>
                  <td style={S.tdGrand}>{cv(report.grandTotal.shiftA.hotHours)}</td>
                  <td style={S.tdGrand}>{cv(report.grandTotal.shiftB.strength)}</td>
                  <td style={S.tdGrand}>{cvN(report.grandTotal.shiftB.sotCount)}</td>
                  <td style={S.tdGrand}>{cv(report.grandTotal.shiftB.hotHours)}</td>
                  <td style={S.tdGrand}>{cv(report.grandTotal.shiftC.strength)}</td>
                  <td style={S.tdGrand}>{cvN(report.grandTotal.shiftC.sotCount)}</td>
                  <td style={S.tdGrand}>{cv(report.grandTotal.shiftC.hotHours)}</td>
                  <td style={S.tdGrand}>{report.grandTotal.req}</td>
                  <td style={S.tdGrand}>{cv(report.grandTotal.totalStrength)}</td>
                  <td style={S.tdGrand}>{cv(report.grandTotal.totalHot)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signature Row */}
          <div style={S.sigContainer}>
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
              "MANAGING DIRECTOR",
            ].map((role) => (
              <div key={role} style={S.sigBlock}>
                <div style={S.sigLine} />
                <span style={S.sigLabel}>{role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────
const BORDER = "1px solid #cbd5e1";
const BORDER_DARK = "1px solid #94a3b8";

const S = {
  container: {
    padding: "20px 24px",
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    color: "#1e293b",
    background: "#fff",
    maxWidth: "100%",
  },

  // Controls
  noPrint: {},
  controls: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: "0 0 12px",
    color: "#0f172a",
  },
  controlRow: {
    display: "flex",
    gap: 14,
    alignItems: "flex-end",
    flexWrap: "wrap",
    padding: "14px 18px",
    background: "#f8fafc",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
  },
  controlGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  select: {
    padding: "7px 11px",
    fontSize: 13,
    border: "1px solid #cbd5e1",
    borderRadius: 5,
    minWidth: 210,
    background: "#fff",
    outline: "none",
  },
  input: {
    padding: "7px 11px",
    fontSize: 13,
    border: "1px solid #cbd5e1",
    borderRadius: 5,
    background: "#fff",
    outline: "none",
  },
  btnPrimary: {
    padding: "8px 22px",
    fontSize: 13,
    fontWeight: 600,
    background: "#1e3a8a",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "7px 16px",
    fontSize: 13,
    fontWeight: 600,
    background: "#fff",
    color: "#334155",
    border: "1px solid #cbd5e1",
    borderRadius: 5,
    cursor: "pointer",
  },
  error: {
    marginTop: 10,
    padding: "10px 16px",
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fee2e2",
    borderRadius: 6,
    fontSize: 13,
  },

  // Report Wrapper
  reportWrapper: {
    marginTop: 4,
  },

  // Report Header (matches PDF: company name + subtitle)
  reportHeader: {
    textAlign: "center",
    marginBottom: 10,
    padding: "10px 0 4px",
  },
  companyName: {
    fontSize: 15,
    fontWeight: 700,
    color: "#1e3a8a",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  reportSubtitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
    marginTop: 3,
  },

  // Table
  tableWrap: {
    overflowX: "auto",
    border: BORDER_DARK,
    borderRadius: 4,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  // Header cells
  thBase: {
    padding: "5px 7px",
    border: BORDER,
    fontWeight: 700,
    fontSize: 11,
    textAlign: "center",
    verticalAlign: "middle",
  },
  thDept: {
    background: "#f1f5f9",
    color: "#334155",
    minWidth: 190,
    textAlign: "left",
    paddingLeft: 10,
    position: "sticky",
    left: 0,
    zIndex: 2,
  },
  thShiftA: {
    background: "#dbeafe",
    color: "#1e40af",
  },
  thShiftB: {
    background: "#fde68a",
    color: "#92400e",
  },
  thShiftC: {
    background: "#d1fae5",
    color: "#065f46",
  },
  thOverall: {
    background: "#e9d5ff",
    color: "#6b21a8",
    minWidth: 56,
  },
  thSub: {
    fontWeight: 600,
    fontSize: 10,
    minWidth: 58,
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

  // Category rows
  catRow: {
    background: "#e2e8f0",
  },
  catCell: {
    padding: "6px 10px",
    fontWeight: 700,
    fontSize: 11,
    color: "#1e293b",
    textAlign: "left",
    letterSpacing: "0.05em",
    borderTop: BORDER_DARK,
    borderBottom: BORDER,
  },

  // Data rows
  dataRow: {
    background: "#fff",
    borderBottom: "1px solid #f1f5f9",
  },
  tdDept: {
    padding: "4px 10px",
    border: BORDER,
    textAlign: "left",
    fontSize: 12,
    fontWeight: 500,
    color: "#1e293b",
    position: "sticky",
    left: 0,
    background: "#fff",
    zIndex: 1,
    minWidth: 190,
  },
  tdNum: {
    padding: "4px 7px",
    border: BORDER,
    textAlign: "center",
    fontSize: 12,
    color: "#334155",
  },
  tdReq: {
    padding: "4px 7px",
    border: BORDER,
    textAlign: "center",
    fontSize: 12,
    color: "#6b21a8",
    fontWeight: 600,
    background: "#faf5ff",
  },
  tdTotal: {
    padding: "4px 7px",
    border: BORDER,
    textAlign: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "#1e293b",
    background: "#f5f3ff",
  },

  // Category sub-total row
  catTotalRow: {
    background: "#f8fafc",
    borderTop: BORDER_DARK,
  },
  catTotalLabel: {
    fontWeight: 700,
    background: "#f1f5f9",
  },
  tdCatTotal: {
    padding: "4px 7px",
    border: BORDER,
    textAlign: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "#1e293b",
    background: "#f1f5f9",
  },

  // Grand Total
  grandTotalRow: {
    background: "#e2e8f0",
    borderTop: "2px solid #475569",
    borderBottom: "2px solid #475569",
  },
  grandTotalLabel: {
    fontWeight: 700,
    fontSize: 12,
    background: "#e2e8f0",
  },
  tdGrand: {
    padding: "5px 7px",
    border: BORDER_DARK,
    textAlign: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "#0f172a",
    background: "#e2e8f0",
  },

  // Signature area
  sigContainer: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 36,
    paddingTop: 20,
    borderTop: "1px solid #e2e8f0",
  },
  sigBlock: {
    textAlign: "center",
    flex: "1",
    minWidth: 70,
  },
  sigLine: {
    borderBottom: "1px solid #94a3b8",
    height: 32,
    marginBottom: 5,
    width: "100%",
  },
  sigLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#475569",
    whiteSpace: "nowrap",
  },
};

// Print CSS
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
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
      
      .strength-report-print {
        display: block !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        position: static !important;
        zoom: 80% !important;
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
        margin: 6mm;
      }
    }
  `;
  document.head.appendChild(style);
}

export default StrengthReportOld;