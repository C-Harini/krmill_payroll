// ================================================================
// pages/HolidaySalary.jsx
// ================================================================
import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../utils/apiCaller";

const fmt = (n) =>
  n == null ? "—" : `₹ ${parseFloat(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const today = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

export default function HolidaySalary() {
  const [activeTab, setActiveTab] = useState("entry");

  // ── Filter states ─────────────────────────────────────────
  const [companies, setCompanies] = useState([]);
  const [holidayLists, setHolidayLists] = useState([]);
  const [employmentTypes, setEmploymentTypes] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [companyId, setCompanyId] = useState("");
  const [date, setDate] = useState(today());
  const [holidayListId, setHolidayListId] = useState("");
  const [employmentTypeId, setEmploymentTypeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  // ── Entry tab ─────────────────────────────────────────────
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [fetchResult, setFetchResult] = useState(null); // { isHoliday, holidays, rows, summary }

  // ── Report tab ────────────────────────────────────────────
  const [rFrom, setRFrom] = useState(firstOfMonth());
  const [rTo, setRTo] = useState(today());
  const [rCompanyId, setRCompanyId] = useState("");
  const [rDeptId, setRDeptId] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [reportError, setReportError] = useState("");

  // ── Load masters on mount ─────────────────────────────────
  useEffect(() => {
    apiRequest("/companies")
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setCompanies(list);
        setRCompanyId(list[0]?.id || "");
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!companyId) return;
    apiRequest(`/holiday-lists?companyId=${companyId}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setHolidayLists(list);
        if (list.length) setHolidayListId(list[0].id);
      })
      .catch(console.error);
    apiRequest(`/employment-types?companyId=${companyId}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setEmploymentTypes(list);
        if (list.length) setEmploymentTypeId(list[0].id);
      })
      .catch(console.error);
    apiRequest(`/departments?companyId=${companyId}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setDepartments(list);
      })
      .catch(console.error);
  }, [companyId]);

  // ── Fetch attendance ──────────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    if (!companyId || !date || !holidayListId || !employmentTypeId) {
      setFetchError("Please select Company, Date, Holiday List and Employment Type.");
      return;
    }
    setFetchLoading(true);
    setFetchError("");
    setFetchResult(null);
    try {
      const params = new URLSearchParams({
        companyId, date, holidayListId, employmentTypeId,
        ...(departmentId ? { departmentId } : {}),
      });
      const data = await apiRequest(`/holiday-salary/fetch?${params}`);
      setFetchResult(data);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setFetchLoading(false);
    }
  }, [companyId, date, holidayListId, employmentTypeId, departmentId]);

  // ── Pay single record ─────────────────────────────────────
  const markPaid = useCallback(async (id) => {
    try {
      await apiRequest(`/holiday-salary/pay/${id}`, { method: "POST" });
      setFetchResult((prev) => {
        if (!prev) return prev;
        const rows = prev.rows.map((r) =>
          r.id === id ? { ...r, status: "Paid", paidAt: new Date().toISOString() } : r
        );
        const workerRows = rows.filter((r) => r.isWorker);
        const summary = {
          ...prev.summary,
          paid: workerRows.filter((r) => r.status === "Paid").length,
          pending: workerRows.filter((r) => r.status === "Pending").length,
        };
        return { ...prev, rows, summary };
      });
    } catch (err) {
      alert("Failed to mark as paid: " + err.message);
    }
  }, []);

  // ── Pay all pending ───────────────────────────────────────
  const payAllPending = useCallback(async () => {
    if (!fetchResult) return;
    const ids = fetchResult.rows
      .filter((r) => r.isWorker && r.status === "Pending")
      .map((r) => r.id);
    if (!ids.length) return;
    try {
      await apiRequest("/holiday-salary/pay-all", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      setFetchResult((prev) => {
        const rows = prev.rows.map((r) =>
          ids.includes(r.id) ? { ...r, status: "Paid", paidAt: new Date().toISOString() } : r
        );
        const workerRows = rows.filter((r) => r.isWorker);
        return {
          ...prev,
          rows,
          summary: {
            ...prev.summary,
            paid: workerRows.filter((r) => r.status === "Paid").length,
            pending: 0,
          },
        };
      });
    } catch (err) {
      alert("Failed: " + err.message);
    }
  }, [fetchResult]);

  // ── Generate report ───────────────────────────────────────
  const generateReport = useCallback(async () => {
    if (!rCompanyId || !rFrom || !rTo) {
      setReportError("Please select company and date range.");
      return;
    }
    setReportLoading(true);
    setReportError("");
    setReportResult(null);
    try {
      const params = new URLSearchParams({
        companyId: rCompanyId, from: rFrom, to: rTo,
        ...(rDeptId ? { departmentId: rDeptId } : {}),
      });
      const data = await apiRequest(`/holiday-salary/report?${params}`);
      setReportResult(data);
    } catch (err) {
      setReportError(err.message);
    } finally {
      setReportLoading(false);
    }
  }, [rCompanyId, rFrom, rTo, rDeptId]);

  // ── Derived ───────────────────────────────────────────────
  const isWorker = fetchResult?.summary?.isWorker ?? false;
  const workerRows = fetchResult?.rows.filter((r) => r.isWorker) ?? [];

  // ── Group rows by holiday for rendering ──────────────────
  const groupedByHoliday = React.useMemo(() => {
    if (!fetchResult?.rows.length) return [];
    const map = {};
    fetchResult.rows.forEach((r) => {
      const key = `${r.holidayId}`;
      if (!map[key]) map[key] = { holidayId: r.holidayId, holidayName: r.holidayName, rows: [] };
      map[key].rows.push(r);
    });
    return Object.values(map);
  }, [fetchResult]);

  const statusBadge = (status) => {
    if (!status) return null;
    const s = { Fully_paid: [styles.badgeBlue, "Fully paid"], partial: [styles.badgeAmber, "Partial"], unpaid: [styles.badgeRed, "Unpaid"], attendance_only: [styles.badgeGray, "Att. only"] };
    const [style, label] = s[status] || [styles.badgeGray, status];
    return <span style={style}>{label}</span>;
  };

  // ─────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <h2 style={styles.title}>Holiday Salary</h2>
      <p style={styles.subtitle}>Manage and pay salary for employees who worked on national holidays</p>

      {/* ── Tabs ── */}
      <div style={styles.tabs}>
        {["entry", "report"].map((t) => (
          <div
            key={t}
            style={{ ...styles.tab, ...(activeTab === t ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(t)}
          >
            {t === "entry" ? "Holiday salary entry" : "Month-wise report"}
          </div>
        ))}
      </div>

      {/* ════════════ TAB 1: ENTRY ════════════ */}
      {activeTab === "entry" && (
        <div>
          {/* Filter bar */}
          <div style={styles.filterBar}>
            <div style={styles.fg}>
              <label style={styles.label}>Company</label>
              <select style={styles.select} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">Select company</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={styles.fg}>
              <label style={styles.label}>Date (holiday)</label>
              <input type="date" style={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div style={styles.fg}>
              <label style={styles.label}>Holiday list</label>
              <select style={styles.select} value={holidayListId} onChange={(e) => setHolidayListId(e.target.value)}>
                <option value="">Select list</option>
                {holidayLists.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div style={styles.fg}>
              <label style={styles.label}>Employment type</label>
              <select style={styles.select} value={employmentTypeId} onChange={(e) => setEmploymentTypeId(e.target.value)}>
                <option value="">Select type</option>
                {employmentTypes.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div style={styles.fg}>
              <label style={styles.label}>Department</label>
              <select style={styles.select} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">All departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.departmentname}</option>)}
              </select>
            </div>
            <button style={styles.btnPrimary} onClick={fetchAttendance} disabled={fetchLoading}>
              {fetchLoading ? "Fetching..." : "Fetch employees"}
            </button>
          </div>

          {fetchError && <div style={styles.errorBox}>{fetchError}</div>}

          {/* Not a holiday notice */}
          {fetchResult && !fetchResult.isHoliday && (
            <div style={styles.warningBox}>
              The selected date is not a national holiday in the chosen holiday list.
            </div>
          )}

          {/* Holiday banner */}
          {fetchResult?.isHoliday && (
            <div style={styles.infoBanner}>
              <span style={styles.infoDot}></span>
              <span>
                {fetchResult.holidays.map((h) => h.name).join(" · ")} &nbsp;·&nbsp;{" "}
                {date} &nbsp;·&nbsp; National Holiday
              </span>
            </div>
          )}

          {/* Summary cards — workers only */}
          {fetchResult?.isHoliday && isWorker && (
            <div style={styles.summaryRow}>
              <MetricCard label="Workers present" value={fetchResult.summary.totalPresent} color="#185FA5" />
              <MetricCard label="Half day" value={fetchResult.summary.halfDay} color="#BA7517" />
              <MetricCard label="Total holiday pay" value={fmt(fetchResult.summary.totalPay)} color="#BA7517" />
              <MetricCard label="Paid" value={fetchResult.summary.paid} color="#3B6D11" />
              <MetricCard label="Pending" value={fetchResult.summary.pending} color="#A32D2D" />
            </div>
          )}

          {/* Summary cards — non-workers */}
          {fetchResult?.isHoliday && !isWorker && (
            <>
              <div style={styles.attNotice}>
                Attendance view only — salary figures are not applicable for this employment type.
              </div>
              <div style={styles.summaryRow}>
                <MetricCard label="Employees present" value={fetchResult.summary.totalPresent} color="#185FA5" />
                <MetricCard label="Half day" value={fetchResult.summary.halfDay} color="#BA7517" />
              </div>
            </>
          )}

          {/* Tables — grouped by holiday */}
          {fetchResult?.isHoliday && fetchResult.rows.length > 0 &&
            groupedByHoliday.map((group) => (
              <div key={group.holidayId}>
                <div style={styles.sectionHead}>
                  <div>
                    <div style={styles.sectionTitle}>{group.holidayName} — {date}</div>
                    <div style={styles.sectionMeta}>
                      {isWorker
                        ? "Per-day rate from EmployeeSalaryComponent (BASIC) · Half-day = rate ÷ 2"
                        : "Attendance record only"}
                    </div>
                  </div>
                  <span style={isWorker ? styles.badgeBlue : styles.badgeGray}>
                    {isWorker ? "Worker" : (employmentTypes.find((e) => String(e.id) === String(employmentTypeId))?.name || "Non-worker")}
                  </span>
                </div>

                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.thead}>
                        <th style={styles.th}>Employee</th>
                        <th style={styles.th}>Dept</th>
                        <th style={styles.th}>Shift</th>
                        <th style={styles.th}>Status</th>
                        {isWorker ? (
                          <>
                            <th style={styles.th}>Basic / day</th>
                            <th style={styles.th}>Holiday pay</th>
                            <th style={styles.th}>Action</th>
                          </>
                        ) : (
                          <>
                            <th style={styles.th}>Check-in</th>
                            <th style={styles.th}>Check-out</th>
                            <th style={styles.th}>Working hrs</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.id} style={styles.dataRow}>
                          <td style={styles.td}>
                            <div style={styles.empName}>{row.employeeName}</div>
                            <div style={styles.empCode}>{row.employeeCode}</div>
                          </td>
                          <td style={styles.td}>{row.departmentName}</td>
                          <td style={styles.td}>
                            <ShiftChip shift={row.shiftName} />
                          </td>
                          <td style={styles.td}>
                            <AttChip status={row.attendanceStatus} />
                          </td>
                          {isWorker ? (
                            <>
                              <td style={styles.td}>
                                {row.basicAmount != null ? fmt(row.basicAmount) : <span style={styles.naText}>No salary data</span>}
                              </td>
                              <td style={{ ...styles.td, fontWeight: 500 }}>
                                {row.holidayPay != null
                                  ? <>
                                      {fmt(row.holidayPay)}
                                      {row.attendanceStatus === "Half Day" && <span style={styles.halfNote}> (½)</span>}
                                    </>
                                  : <span style={styles.naText}>—</span>}
                              </td>
                              <td style={styles.td}>
                                {row.status === "Paid" ? (
                                  <span style={styles.paidTag}>✓ Paid</span>
                                ) : (
                                  <button style={styles.payBtn} onClick={() => markPaid(row.id)}>
                                    Pay now
                                  </button>
                                )}
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={styles.td}>{row.firstCheckIn ? new Date(row.firstCheckIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                              <td style={styles.td}>{row.lastCheckOut ? new Date(row.lastCheckOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                              <td style={styles.td}>{row.workingHours != null ? `${row.workingHours} hrs` : "—"}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    {isWorker && (
                      <tfoot>
                        <tr style={styles.tfootRow}>
                          <td colSpan={5} style={{ ...styles.td, textAlign: "right", fontSize: 11, color: "#888" }}>Subtotal</td>
                          <td style={{ ...styles.td, fontWeight: 600 }}>
                            {fmt(group.rows.reduce((s, r) => s + (r.holidayPay || 0), 0))}
                          </td>
                          <td style={styles.td}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            ))}

          {/* Grand footer — workers only */}
          {fetchResult?.isHoliday && isWorker && fetchResult.rows.length > 0 && (
            <div style={styles.grandFooter}>
              <span style={styles.grandLabel}>Grand total payable</span>
              <span style={styles.grandVal}>{fmt(fetchResult.summary.totalPay)}</span>
              {fetchResult.summary.pending > 0 && (
                <button style={styles.btnPrimary} onClick={payAllPending}>Pay all pending</button>
              )}
            </div>
          )}

          {/* No results */}
          {fetchResult?.isHoliday && fetchResult.rows.length === 0 && (
            <div style={styles.emptyBox}>No employees found for the selected filters on this holiday.</div>
          )}
        </div>
      )}

      {/* ════════════ TAB 2: REPORT ════════════ */}
      {activeTab === "report" && (
        <div>
          <div style={styles.filterBar}>
            <div style={styles.fg}>
              <label style={styles.label}>Company</label>
              <select style={styles.select} value={rCompanyId} onChange={(e) => setRCompanyId(e.target.value)}>
                <option value="">Select company</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={styles.fg}>
              <label style={styles.label}>From date</label>
              <input type="date" style={styles.input} value={rFrom} onChange={(e) => setRFrom(e.target.value)} />
            </div>
            <div style={styles.fg}>
              <label style={styles.label}>To date</label>
              <input type="date" style={styles.input} value={rTo} onChange={(e) => setRTo(e.target.value)} />
            </div>
            <div style={styles.fg}>
              <label style={styles.label}>Department</label>
              <select style={styles.select} value={rDeptId} onChange={(e) => setRDeptId(e.target.value)}>
                <option value="">All departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.departmentname}</option>)}
              </select>
            </div>
            <button style={styles.btnPrimary} onClick={generateReport} disabled={reportLoading}>
              {reportLoading ? "Generating..." : "Generate"}
            </button>
          </div>

          {reportError && <div style={styles.errorBox}>{reportError}</div>}

          {reportResult && (
            <>
              <div style={styles.summaryRow}>
                <MetricCard label="Holidays in range" value={reportResult.summary.totalHolidays} color="#185FA5" />
                <MetricCard label="Total paid (workers)" value={fmt(reportResult.summary.totalPaid)} color="#3B6D11" />
                <MetricCard label="Total pending" value={fmt(reportResult.summary.totalPending)} color="#A32D2D" />
                <MetricCard label="Workers covered" value={reportResult.summary.workersCovered} color="#888" />
              </div>

              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thead}>
                      <th style={styles.th}>Holiday</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Emp. type</th>
                      <th style={styles.th}>Present</th>
                      <th style={styles.th}>Half day</th>
                      <th style={styles.th}>Total pay</th>
                      <th style={styles.th}>Paid</th>
                      <th style={styles.th}>Pending</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportResult.groups.map((g, i) => (
                      <tr key={i} style={styles.dataRow}>
                        <td style={{ ...styles.td, fontWeight: 500 }}>{g.holidayName}</td>
                        <td style={styles.td}>{new Date(g.holidayDate + "T00:00:00").toLocaleDateString("en-IN")}</td>
                        <td style={styles.td}>
                          <span style={g.isWorker ? styles.badgeBlue : styles.badgeGray}>{g.employmentTypeName}</span>
                        </td>
                        <td style={styles.tdCenter}>{g.present}</td>
                        <td style={styles.tdCenter}>{g.halfDay || "—"}</td>
                        <td style={styles.td}>{g.isWorker ? fmt(g.totalPay) : <span style={styles.naText}>—</span>}</td>
                        <td style={{ ...styles.td, color: "#3B6D11", fontWeight: 500 }}>{g.isWorker ? fmt(g.paidAmount) : <span style={styles.naText}>—</span>}</td>
                        <td style={{ ...styles.td, color: g.pendingAmount > 0 ? "#A32D2D" : "#888", fontWeight: 500 }}>{g.isWorker ? fmt(g.pendingAmount) : <span style={styles.naText}>—</span>}</td>
                        <td style={styles.td}>{statusBadge(g.payStatus)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {reportResult.groups.length > 0 && (
                    <tfoot>
                      <tr style={styles.tfootRow}>
                        <td colSpan={5} style={{ ...styles.td, textAlign: "right", fontSize: 11, color: "#888" }}>Worker totals</td>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{fmt(reportResult.summary.totalPaid + reportResult.summary.totalPending)}</td>
                        <td style={{ ...styles.td, fontWeight: 600, color: "#3B6D11" }}>{fmt(reportResult.summary.totalPaid)}</td>
                        <td style={{ ...styles.td, fontWeight: 600, color: "#A32D2D" }}>{fmt(reportResult.summary.totalPending)}</td>
                        <td style={styles.td}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              <p style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
                Non-worker types: attendance count only, no salary tracked.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────
function MetricCard({ label, value, color }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={{ ...styles.metricVal, color }}>{value}</div>
    </div>
  );
}

function ShiftChip({ shift }) {
  const map = { A: { bg: "#E6F1FB", color: "#185FA5" }, B: { bg: "#FAEEDA", color: "#BA7517" }, C: { bg: "#EAF3DE", color: "#3B6D11" }, Staff: { bg: "#F1EFE8", color: "#5F5E5A" } };
  const s = map[shift] || { bg: "#F1EFE8", color: "#5F5E5A" };
  return <span style={{ ...styles.chip, background: s.bg, color: s.color }}>{shift || "—"}</span>;
}

function AttChip({ status }) {
  if (status === "Half Day") return <span style={{ ...styles.chip, background: "#FAEEDA", color: "#854F0B" }}>Half Day</span>;
  return <span style={{ ...styles.chip, background: "#EAF3DE", color: "#27500A" }}>Present</span>;
}

// ── Styles ─────────────────────────────────────────────────
const styles = {
  page: { padding: 20, maxWidth: "100%", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  title: { fontSize: 22, fontWeight: 600, margin: 0 },
  subtitle: { fontSize: 13, color: "#888", margin: "4px 0 0" },
  tabs: { display: "flex", borderBottom: "1px solid #e5e7eb", margin: "14px 0 16px" },
  tab: { padding: "9px 20px", fontSize: 13, cursor: "pointer", color: "#888", borderBottom: "2px solid transparent", marginBottom: -1 },
  tabActive: { color: "#1e293b", fontWeight: 600, borderBottomColor: "#185FA5" },
  filterBar: { display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", padding: "14px 16px", background: "#f8f9fa", borderRadius: 8, border: "1px solid #e9ecef", marginBottom: 14 },
  fg: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 11, fontWeight: 500, color: "#666" },
  select: { padding: "6px 10px", fontSize: 13, border: "1px solid #ccc", borderRadius: 4, minWidth: 160, background: "#fff" },
  input: { padding: "6px 10px", fontSize: 13, border: "1px solid #ccc", borderRadius: 4 },
  btnPrimary: { padding: "7px 16px", fontSize: 13, fontWeight: 500, background: "#185FA5", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", alignSelf: "flex-end" },
  errorBox: { padding: "10px 14px", background: "#fee2e2", color: "#991b1b", borderRadius: 6, marginBottom: 12, fontSize: 13 },
  warningBox: { padding: "10px 14px", background: "#fef9c3", color: "#854d0e", borderRadius: 6, marginBottom: 12, fontSize: 13 },
  infoBanner: { display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: 6, marginBottom: 12, fontSize: 12, color: "#1e40af" },
  infoDot: { width: 7, height: 7, borderRadius: "50%", background: "#185FA5", flexShrink: 0, display: "inline-block" },
  attNotice: { padding: "9px 14px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6, marginBottom: 12, fontSize: 12, color: "#475569" },
  summaryRow: { display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  metric: { flex: 1, minWidth: 120, background: "#f8f9fa", borderRadius: 6, padding: "10px 14px" },
  metricLabel: { fontSize: 11, color: "#888", marginBottom: 3 },
  metricVal: { fontSize: 20, fontWeight: 600 },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", margin: "14px 0 8px", paddingBottom: 7, borderBottom: "1px solid #e5e7eb" },
  sectionTitle: { fontSize: 13, fontWeight: 600 },
  sectionMeta: { fontSize: 11, color: "#888", marginTop: 2 },
  tableWrap: { overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 14 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  thead: { background: "#f8f9fa" },
  th: { padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "#666", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" },
  td: { padding: "8px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" },
  tdCenter: { padding: "8px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "center" },
  dataRow: {},
  tfootRow: { background: "#f8f9fa", borderTop: "1px solid #e5e7eb" },
  empName: { fontWeight: 500, fontSize: 12 },
  empCode: { fontSize: 11, color: "#888" },
  chip: { display: "inline-block", fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 500 },
  payBtn: { fontSize: 11, padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 500, border: "none", background: "#dcfce7", color: "#166534", whiteSpace: "nowrap" },
  paidTag: { fontSize: 11, padding: "4px 12px", borderRadius: 4, fontWeight: 500, background: "#dbeafe", color: "#1e40af", display: "inline-block" },
  naText: { color: "#aaa", fontSize: 11 },
  halfNote: { fontSize: 10, color: "#888" },
  grandFooter: { background: "#f8f9fa", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 20, marginTop: 4 },
  grandLabel: { fontSize: 13, color: "#666" },
  grandVal: { fontSize: 20, fontWeight: 600 },
  emptyBox: { padding: "24px", textAlign: "center", color: "#888", fontSize: 13 },
  badgeBlue: { fontSize: 11, padding: "2px 10px", borderRadius: 4, fontWeight: 500, background: "#dbeafe", color: "#1e40af" },
  badgeAmber: { fontSize: 11, padding: "2px 10px", borderRadius: 4, fontWeight: 500, background: "#fef9c3", color: "#854d0e" },
  badgeRed: { fontSize: 11, padding: "2px 10px", borderRadius: 4, fontWeight: 500, background: "#fee2e2", color: "#991b1b" },
  badgeGray: { fontSize: 11, padding: "2px 10px", borderRadius: 4, fontWeight: 500, background: "#f1f5f9", color: "#475569" },
};
