import React, { useEffect, useState } from "react";
import { apiRequest } from "../utils/apiCaller";


const EmployeeLoanManagement = () => {
  const [records, setRecords] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    companyId: "",
    departmentId: "",
    employeeId: "",
    loanType: "advance",
    loanAmount: "",
    interestRate: 0,
    sanctionDate: "",
    startDate: "",
    numberOfInstallments: "",
    installmentAmount: "",
    reason: "",
    remarks: "",
  });

  // ================= FETCH DATA =================

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/employee-loans");
      setRecords(data.loans || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    const data = await apiRequest("/companies");
    setCompanies(data || []);
  };

  const fetchDepartments = async (companyId) => {
    if (!companyId) return;
    const data = await apiRequest(`/departments?companyId=${companyId}`);
    setDepartments(data?.data || []);
  };

  const fetchEmployees = async (companyId, departmentId) => {
    if (!companyId || !departmentId) return;
    const data = await apiRequest(
      `/employees?companyId=${companyId}&departmentId=${departmentId}`,
    );
    setEmployees(data || []);
  };

  useEffect(() => {
    fetchLoans();
    fetchCompanies();
  }, []);

  // ================= HANDLE CHANGE =================

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "companyId") {
      setFormData({
        ...formData,
        companyId: value,
        departmentId: "",
        employeeId: "",
      });
      fetchDepartments(value);
      return;
    }

    if (name === "departmentId") {
      setFormData({
        ...formData,
        departmentId: value,
        employeeId: "",
      });
      fetchEmployees(formData.companyId, value);
      return;
    }

    const updatedData = { ...formData, [name]: value };

    // Auto calculate installment
    if (
      (name === "loanAmount" || name === "numberOfInstallments") &&
      updatedData.loanAmount &&
      updatedData.numberOfInstallments
    ) {
      updatedData.installmentAmount =
        (
          parseFloat(updatedData.loanAmount) /
          parseInt(updatedData.numberOfInstallments)
        ).toFixed(2) || "";
    }

    setFormData(updatedData);
  };

  // ================= SUBMIT =================

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...formData,
        loanAmount: Number(formData.loanAmount),
        interestRate: Number(formData.interestRate),
        numberOfInstallments: Number(formData.numberOfInstallments),
        installmentAmount: Number(formData.installmentAmount),
      };

      const url = editingId
        ? `/employee-loans/${editingId}`
        : `/employee-loans`;

      const method = editingId ? "PUT" : "POST";

      await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });

      alert(editingId ? "Updated Successfully ✅" : "Created Successfully ✅");

      setShowForm(false);
      setEditingId(null);
      fetchLoans();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ================= APPROVE =================

  const handleApprove = async (id) => {
    await apiRequest(`/employee-loans/${id}/approve`, {
      method: "PUT",
    });

    fetchLoans();
  };

  // ================= DELETE =================

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this loan?")) return;

    await apiRequest(`/employee-loans/${id}`, {
      method: "DELETE",
    });

    fetchLoans();
  };

  // ================= EDIT =================

  const handleEdit = (loan) => {
    setShowForm(true);
    setEditingId(loan.id);
    setFormData({ ...loan });
    fetchDepartments(loan.companyId);
    fetchEmployees(loan.companyId, loan.departmentId);
  };

  // ================= UI =================

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Advance Loan Management</h2>

      <button
        onClick={() => {
          setShowForm(true);
          setEditingId(null);
        }}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        + Add Loan
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 mt-4 shadow-lg rounded-xl border"
        >
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Advance Loan" : "Create Advance Loan"}
          </h3>

          {error && <p className="text-red-600 mb-3">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Company *
              </label>
              <select
                name="companyId"
                value={formData.companyId}
                onChange={handleChange}
                className="w-full border rounded-lg p-2"
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
              <label className="block text-sm font-medium mb-1">
                Department *
              </label>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleChange}
                className="w-full border rounded-lg p-2"
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
              <label className="block text-sm font-medium mb-1">
                Employee *
              </label>
              <select
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                className="w-full border rounded-lg p-2"
                disabled={!formData.departmentId}
              >
                <option value="">Select Employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.employeeCode} - {e.firstName} {e.lastName || ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Loan Type */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Loan Type
              </label>
              <select
                name="loanType"
                value={formData.loanType}
                onChange={handleChange}
                className="w-full border rounded-lg p-2"
              >
               
                <option>Advance</option>
              </select>
            </div>

            {/* Loan Amount */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Loan Amount *
              </label>
              <input
                type="number"
                name="loanAmount"
                value={formData.loanAmount}
                onChange={handleChange}
                className="w-full border rounded-lg p-2"
                placeholder="Enter total loan amount"
              />
            </div>

            {/* Installments */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Number of Installments *
              </label>
              <input
                type="number"
                name="numberOfInstallments"
                value={formData.numberOfInstallments}
                onChange={handleChange}
                className="w-full border rounded-lg p-2"
                placeholder="Example: 10 months"
              />
            </div>

            {/* EMI (Auto Calculated) */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Monthly Installment (Auto Calculated)
              </label>
              <input
                type="number"
                value={formData.installmentAmount}
                className="w-full border rounded-lg p-2 bg-gray-100 cursor-not-allowed"
                readOnly
              />
            </div>

            {/* Sanction Date */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Sanction Date *
              </label>
              <input
                type="date"
                name="sanctionDate"
                value={formData.sanctionDate}
                onChange={handleChange}
                className="w-full border rounded-lg p-2"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Deduction Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full border rounded-lg p-2"
              />
            </div>

            {/* Reason */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Reason</label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="w-full border rounded-lg p-2"
                rows="3"
              />
            </div>
          </div>

          {/* EMI Info Box */}
          {formData.installmentAmount && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              ₹ {formData.installmentAmount} will be deducted every month for{" "}
              {formData.numberOfInstallments} months.
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-6 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
          >
            {saving ? "Saving..." : editingId ? "Update Loan" : "Create Loan"}
          </button>
        </form>
      )}

      {/* TABLE */}
      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <p className="p-4">Loading...</p>
        ) : (
          <table className="w-full text-sm text-left border-collapse">
            {/* HEADER */}
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Installments</th>
                <th className="px-6 py-3 text-center">Paid</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>

            {/* BODY */}
            <tbody className="divide-y">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {r.employee ? `${r.employee.employeeCode || ""} - ${r.employee.firstName || ""} ${r.employee.lastName || ""}` : "-"}
                  </td>

                  <td className="px-6 py-4 text-right">
                    ₹ {Number(r.loanAmount).toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-center">
                    {r.numberOfInstallments}
                  </td>

                  <td className="px-6 py-4 text-center">
                    {r.paidInstallments || 0}
                  </td>

                  {/* STATUS BADGE */}
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold
                  ${
                    r.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : r.status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : r.status === "completed"
                          ? "bg-blue-100 text-blue-700"
                         : r.status==="active" ? "bg-green-200 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                    >
                      {r.status}
                    </span>
                  </td>

                  {/* ACTION BUTTONS */}
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(r)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-3 py-1 rounded"
                      >
                        Edit
                      </button>

                      {r.status === "pending" && (
                        <button
                          onClick={() => handleApprove(r.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
                        >
                          Approve
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(r.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default EmployeeLoanManagement;
