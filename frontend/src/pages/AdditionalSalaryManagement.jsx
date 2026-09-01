import React, { useEffect, useState } from "react";
import { apiRequest } from "../utils/apiCaller";



const AdditionalSalaryManagement = () => {
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const token = localStorage.getItem("authToken");

  // ---------------- STATES ----------------
  const [records, setRecords] = useState([]);

  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [salaryComponents, setSalaryComponents] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    companyId: "",
    departmentId: "",
    employeeId: "",
    salaryMonth: "",
    salaryComponentId: "",
    ticketNo: "AUTO",
    days: "",
    amount: "",
  });

  const generateTicketNo = () => {
    return "TKT" + Date.now();
  };

  // ---------------- FETCH FUNCTIONS ----------------
  const fetchCompanies = async () => {
    try {
      const data = await apiRequest(`/companies`);
        console.log("Companies API Response:", data);
      setCompanies(data || []);
    } catch (err) {
      console.error("Error fetching companies:", err.message);
    }
  };

  const fetchDepartments = async (companyId) => {
    try {
      if (!companyId) return;
      const data = await apiRequest(`/departments?companyId=${companyId}`);
      setDepartments(data?.data || []);
    } catch (err) {
      console.error("Error fetching departments:", err.message);
      setDepartments([]);
    }
  };

  const fetchEmployees = async (companyId, departmentId) => {
    try {
      if (!companyId || !departmentId) return;
      const data = await apiRequest(`/employees?companyId=${companyId}&departmentId=${departmentId}`);
      setEmployees(data || []);
    } catch (err) {
      console.error("Error fetching employees:", err.message);
      setEmployees([]);
    }
  };

  const fetchSalaryComponents = async (companyId) => {
    try {
      if (!companyId) return;
      const data = await apiRequest(`/salary-components?companyId=${companyId}`);
      setSalaryComponents(data || []);
    } catch (err) {
      console.error("Error fetching salary components:", err.message);
      setSalaryComponents([]);
    }
  };

  const fetchAdditionalSalaries = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/additional-salaries`);
      setRecords(data.records || []);
    } catch (err) {
      console.error("Error fetching additional salaries:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- INIT LOAD ----------------
  useEffect(() => {
    fetchCompanies();
    fetchAdditionalSalaries();
  }, []);

  // ---------------- FORM HANDLERS ----------------
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Company change -> reset dependent dropdowns
    if (name === "companyId") {
      setFormData((prev) => ({
        ...prev,
        companyId: value,
        departmentId: "",
        employeeId: "",
        salaryComponentId: "",
        ticketNo: generateTicketNo(),
      }));

      setDepartments([]);
      setEmployees([]);
      setSalaryComponents([]);

      fetchDepartments(value);
      fetchSalaryComponents(value);
      return;
    }

    // Department change -> reset employee
    if (name === "departmentId") {
      setFormData((prev) => ({
        ...prev,
        departmentId: value,
        employeeId: "",
      }));

      setEmployees([]);
      fetchEmployees(formData.companyId, value);
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---------------- SUBMIT ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (
        !formData.companyId ||
        !formData.departmentId ||
        !formData.employeeId ||
        !formData.salaryMonth ||
        !formData.salaryComponentId
      ) {
        setError("Please fill all required fields.");
        setSaving(false);
        return;
      }

      const payload = {
        companyId: formData.companyId,
        departmentId: formData.departmentId,
        employeeId: formData.employeeId,
        salaryMonth: formData.salaryMonth,
        salaryComponentId: formData.salaryComponentId,
        days: formData.days ? Number(formData.days) : 0,
        amount: formData.amount ? Number(formData.amount) : 0,
      };

      const url = editingId
        ? `/additional-salaries/${editingId}`
        : `/additional-salaries`;

      const method = editingId ? "PUT" : "POST";

      await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });

      alert(editingId ? "Updated successfully ✅" : "Created successfully ✅");

      // reset
      setFormData({
        companyId: "",
        departmentId: "",
        employeeId: "",
        salaryMonth: "",
        salaryComponentId: "",
        ticketNo: "AUTO",
        days: "",
        amount: "",
      });

      setEditingId(null);
      setDepartments([]);
      setEmployees([]);
      setSalaryComponents([]);
      setShowForm(false);

      fetchAdditionalSalaries();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ---------------- EDIT ----------------
  const handleEdit = (record) => {
    setShowForm(true);
    setEditingId(record.id);

    setFormData({
      companyId: record.companyId || "",
      departmentId: record.departmentId || "",
      employeeId: record.employeeId || "",
      salaryMonth: record.salaryMonth || "",
      salaryComponentId: record.salaryComponentId || "",
      ticketNo: record.ticketNo || "AUTO",
      days: record.days || "",
      amount: record.amount || "",
    });

    fetchDepartments(record.companyId);
    fetchEmployees(record.companyId, record.departmentId);
    fetchSalaryComponents(record.companyId);
  };

  // ---------------- DELETE ----------------
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;

    try {
      await apiRequest(`/additional-salaries/${id}`, {
        method: "DELETE",
      });

      alert("Deleted successfully ✅");
      fetchAdditionalSalaries();
    } catch (err) {
      alert(err.message);
    }
  };

  // ---------------- CANCEL ----------------
  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setError("");

    setFormData({
      companyId: "",
      departmentId: "",
      employeeId: "",
      salaryMonth: "",
      salaryComponentId: "",
      ticketNo: "AUTO",
      days: "",
      amount: "",
    });

    setDepartments([]);
    setEmployees([]);
    setSalaryComponents([]);
  };

  // ---------------- UI ----------------
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Additional Salary</h2>

      {/* Top Buttons */}
      <div className="mb-4 flex gap-3">
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData((prev) => ({
              ...prev,
              ticketNo: generateTicketNo(),
            }));
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Additional Salary
        </button>

        {showForm && (
          <button
            onClick={handleCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        )}
      </div>

      {/* FORM */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md rounded p-4 mb-6 border"
        >
          <h3 className="text-lg font-semibold mb-3">
            {editingId ? "Edit Additional Salary" : "Create Additional Salary"}
          </h3>

          {error && <p className="text-red-600 mb-3">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Company */}
            <div>
              <label className="block font-medium">Company *</label>
              <select
                name="companyId"
                value={formData.companyId}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              >
                <option value="">Select Company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="block font-medium">Department *</label>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                disabled={!formData.companyId}
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.departmentname}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee */}
            <div>
              <label className="block font-medium">Employee *</label>
              <select
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                disabled={!formData.departmentId}
              >
                <option value="">Select Employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.employeeCode} - {e.firstName}
                  </option>
                ))}
              </select>
            </div>

            {/* Salary Month */}
            <div>
              <label className="block font-medium">Salary Month *</label>
              <input
                type="month"
                name="salaryMonth"
                value={formData.salaryMonth}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>

            {/* Head (Salary Component) */}
            <div>
              <label className="block font-medium">Head (Salary Component) *</label>
              <select
                name="salaryComponentId"
                value={formData.salaryComponentId}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                disabled={!formData.companyId}
              >
                <option value="">Select Component</option>
                {salaryComponents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Ticket No */}
            <div>
              <label className="block font-medium">Ticket No</label>
              <input
                type="text"
                name="ticketNo"
                value={formData.ticketNo}
                className="w-full border p-2 rounded bg-gray-100"
                readOnly
              />
            </div>

            {/* Days */}
            <div>
              <label className="block font-medium">Days</label>
              <input
                type="number"
                name="days"
                value={formData.days}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                min="0"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block font-medium">Amount</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                min="0"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            {saving
              ? "Saving..."
              : editingId
              ? "Update Additional Salary"
              : "Save Additional Salary"}
          </button>
        </form>
      )}

      {/* TABLE */}
      <div className="bg-white shadow-md rounded border p-4">
        <h3 className="text-lg font-semibold mb-3">Additional Salary List</h3>

        {loading ? (
          <p>Loading...</p>
        ) : records.length === 0 ? (
          <p>No additional salary records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Ticket No</th>
                  <th className="border p-2 text-left">Company</th>
                  <th className="border p-2 text-left">Department</th>
                  <th className="border p-2 text-left">Employee</th>
                  <th className="border p-2 text-left">Salary Month</th>
                  <th className="border p-2 text-left">Head</th>
                  <th className="border p-2 text-left">Days</th>
                  <th className="border p-2 text-left">Amount</th>
                  <th className="border p-2 text-left">Status</th>
                  <th className="border p-2 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="border p-2">{r.id}</td>
                    <td className="border p-2">{r.company?.name || "-"}</td>
                    <td className="border p-2">{r.department?.name || "-"}</td>
                    <td className="border p-2">
                      {r.employee
                        ? `${r.employee.employeeCode} - ${r.employee.firstName}`
                        : "-"}
                    </td>
                    <td className="border p-2">{r.salaryMonth}</td>
                    <td className="border p-2">
                      {r.salaryComponent?.name || "-"}
                    </td>
                    <td className="border p-2">{r.days}</td>
                    <td className="border p-2">{r.amount}</td>
                    <td className="border p-2">{r.status || "Active"}</td>

                    <td className="border p-2 flex gap-2">
                      <button
                        onClick={() => handleEdit(r)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(r.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdditionalSalaryManagement;
