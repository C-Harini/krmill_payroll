import { useState, useEffect } from 'react';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState({ name: '', acronym: '', status: 'Active' });

  const API_URL = 'http://localhost:3001/departments';

  const fetchDepartments = async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentDepartment({ name: '', acronym: '', status: 'Active' });
    setIsModalOpen(true);
  };

  const openEditModal = (dept) => {
    setIsEditing(true);
    setCurrentDepartment(dept);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentDepartment({ name: '', acronym: '', status: 'Active' });
  };

  const handleSave = async () => {
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `${API_URL}/${currentDepartment.id}` : API_URL;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentDepartment),
      });
      if (!res.ok) throw new Error('Failed to save');
      await fetchDepartments();
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchDepartments();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
          <h2 className="font-bold text-lg mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-3 mb-2">
          <span className="text-3xl">🏢</span> Department Management
        </h1>
        <p className="text-slate-600">Manage and organize all departments</p>
      </div>

      {/* Add Department Button */}
      <div className="mb-6 flex justify-between items-center">
        <div></div>
        <button 
          onClick={openAddModal}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
          </svg>
          Add New Department
        </button>
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <th className="px-6 py-4 text-left text-sm font-semibold">ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Acronym</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.length > 0 ? (
                departments.map((dept, index) => (
                  <tr key={dept.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">{dept.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">{dept.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-mono text-xs">{dept.acronym}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        dept.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {dept.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openEditModal(dept)}
                          className="px-4 py-2 bg-blue-100 text-blue-600 hover:bg-blue-200 font-semibold rounded-lg transition-colors text-sm flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(dept.id)}
                          className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 font-semibold rounded-lg transition-colors text-sm flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="text-slate-500">
                      <svg className="w-12 h-12 mx-auto mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-lg font-medium">No departments found</p>
                      <p className="text-sm mt-1">Click "Add New Department" to create one</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 rounded-t-xl">
              <h2 className="text-xl font-bold">
                {isEditing ? '✏️ Edit Department' : '➕ Add New Department'}
              </h2>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Department Name Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter department name"
                  value={currentDepartment.name}
                  onChange={(e) => setCurrentDepartment({ ...currentDepartment, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Acronym Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Acronym <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter acronym"
                  value={currentDepartment.acronym}
                  onChange={(e) => setCurrentDepartment({ ...currentDepartment, acronym: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase"
                />
              </div>

              {/* Status Select */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select 
                  value={currentDepartment.status} 
                  onChange={(e) => setCurrentDepartment({ ...currentDepartment, status: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 rounded-b-xl border-t border-slate-200 flex gap-3">
              <button 
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95"
              >
                {isEditing ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}