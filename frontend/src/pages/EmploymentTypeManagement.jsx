import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/apiCaller';



const employmentTypesOptions = [

    { id: "full-time", name: 'Full-time', status: 'Active' },
    { id: "part-time", name: 'Part-time', status: 'Active' },
    { id: "contract", name: 'Contract', status: 'Inactive' },
    {id: "staff", name: 'Staff', status: 'Active' },
    {id:"worker", name: 'Worker', status: 'Inactive' },

];
const EmploymentTypeManagement = () => {
    // --- State Management ---
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [employmentTypes, setEmploymentTypes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmploymentType, setEditingEmploymentType] = useState(null);
    const [formData, setFormData] = useState({ name: '', status: 'Active' });

    // --- Effects ---
    // Fetch all companies on component mount
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const data = await apiRequest('/companies');
                setCompanies(data);
                if (data.length > 0) {
                    setSelectedCompanyId(data[0].id); // Auto-select the first company
                }
            } catch (err) {
                setError('Failed to fetch companies.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    // Fetch employment types whenever the selected company changes
    useEffect(() => {
        if (!selectedCompanyId) return;

        const fetchEmploymentTypes = async () => {
            setLoading(true);
            try {
                const data = await apiRequest(`/employment-types?companyId=${selectedCompanyId}`);
                setEmploymentTypes(data);
                setError(null);
            } catch (err) {
                setError('Failed to fetch employment types.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchEmploymentTypes();
    }, [selectedCompanyId]);

    // --- Event Handlers ---
    const handleCompanyChange = (e) => {
        setSelectedCompanyId(e.target.value);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const openAddModal = () => {
        setEditingEmploymentType(null);
        setFormData({ name: '', status: 'Active' });
        setIsModalOpen(true);
    };

    const openEditModal = (employmentType) => {
        setEditingEmploymentType(employmentType);
        setFormData({ 
            name: employmentType.name, 
            status: employmentType.status 
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingEmploymentType(null);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const payload = { ...formData, companyId: selectedCompanyId };

        try {
            if (editingEmploymentType) {
                // Update existing employment type
                await apiRequest(`/employment-types/${editingEmploymentType.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
            } else {
                // Create new employment type
                await apiRequest('/employment-types', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            }
            // Refetch employment types for the current company
            const data = await apiRequest(`/employment-types?companyId=${selectedCompanyId}`);
            setEmploymentTypes(data);
            closeModal();
        } catch (err) {
            setError(editingEmploymentType ? 'Failed to update employment type.' : 'Failed to create employment type.');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this employment type?')) return;

        try {
            await apiRequest(`/employment-types/${id}`, { method: 'DELETE' });
            setEmploymentTypes(employmentTypes.filter(type => type.id !== id));
        } catch (err) {
            setError('Failed to delete employment type.');
            console.error(err);
        }
    };

    // --- Derived Data ---
    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    const filteredEmploymentTypes = employmentTypes.filter(type =>
        type.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- Render ---
    if (loading && companies.length === 0) return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-2">
              <span>💼</span> Employment Type Management
            </h1>
          </div>

          {/* Company Selector */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <label
              htmlFor="company-select"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Select Company:
            </label>
            <select
              id="company-select"
              value={selectedCompanyId}
              onChange={handleCompanyChange}
              className="w-full md:w-80 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg shadow-sm">
              {error}
            </div>
          )}

          {/* Search and Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search Employment Types..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full px-4 py-2 pl-10 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <button
              onClick={openAddModal}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              + Add Employment Type
            </button>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Type Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Employee Count
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <span className="ml-3 text-slate-600">
                            Loading employment types...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredEmploymentTypes.length > 0 ? (
                    filteredEmploymentTypes.map((type, index) => (
                      <tr
                        key={type.id}
                        className={`border-b border-slate-200 hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                      >
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {type.id}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                         
                          {type?.name?.split(" ")?.map(word => word?.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              type.status === "Active"
                                ? "bg-green-100 text-green-700 border border-green-300"
                                : "bg-red-100 text-red-700 border border-red-300"
                            }`}
                          >
                            {type.status === "Active" ? "✓" : "✕"} {type.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            0
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(type)}
                              title="Edit"
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(type.id)}
                              title="Delete"
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-8 text-center text-slate-500"
                      >
                        No employment types found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white sticky top-0 z-10">
                <button
                  onClick={closeModal}
                  aria-label="Close"
                  className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full text-red-500 hover:text-red-700 text-3xl font-bold transition-all"
                >
                  ×
                </button>
                <h2 className="text-2xl font-bold">
                  {editingEmploymentType
                    ? "✏️ Edit Employment Type"
                    : "➕ Add New Employment Type"}
                </h2>
              </div>

              {/* Modal Content */}
              <form onSubmit={handleFormSubmit} className="p-8">
                {/* Company Field */}
                <div className="mb-6">
                  <label
                    htmlFor="company-name"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Company
                  </label>
                  <input
                    type="text"
                    id="company-name"
                    value={selectedCompany?.name || ""}
                    disabled
                    className="w-full px-4 py-2 bg-slate-100 border-2 border-slate-300 rounded-lg text-slate-600 cursor-not-allowed"
                  />
                </div>

                {/* Type Name Field */}
                <div className="mb-6">
                  <label
                    htmlFor="type-name"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Type Name <span className="text-red-500">*</span>
                  </label>
                  {/* <select
                    id="type-name"
                    name="type-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Full-time, Part-time, Contract"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                  >
                    <option value="">-- Select Employment Type --</option>
                    {employmentTypesOptions.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select> */}
                  <input
                    type="text"
                    id="type-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700"
                    placeholder="e.g., Full-time, Part-time, Contract"
                  />
                </div>

                {/* Status Radio Group */}
                <div className="mb-8">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Status
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="Active"
                        checked={formData.status === "Active"}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="ml-2 text-slate-700 font-medium">
                        Active
                      </span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="Inactive"
                        checked={formData.status === "Inactive"}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="ml-2 text-slate-700 font-medium">
                        Inactive
                      </span>
                    </label>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    {editingEmploymentType ? "Update Type" : "Save Type"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
};

export default EmploymentTypeManagement;