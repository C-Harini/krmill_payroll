import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, X, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { apiRequest } from '../utils/apiCaller';
import { toast } from 'react-toastify';

const SalaryComponentManagement = () => {
  const [components, setComponents] = useState([]);
  const [filteredComponents, setFilteredComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [companyId, setCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loadingCompany, setLoadingCompany] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'Earning',
    calculationType: 'Fixed',
    percentage: '',
    formula: '',
    affectsGrossSalary: true,
    affectsNetSalary: true,
    isTaxable: true,
    isStatutory: false,
    displayOrder: 0,
    status: 'Active',
    companyId: null
  });

  const [editId, setEditId] = useState(null);

  const fetchUserCompany = async () => {
    setLoadingCompany(true);
    try {
      const storedCompanyId = localStorage.getItem('companyId');
      if (storedCompanyId) {
        const parsedId = parseInt(storedCompanyId);
        setCompanyId(parsedId);
        setFormData(prev => ({ ...prev, companyId: parsedId }));
        setLoadingCompany(false);
        return;
      }

      try {
        const companiesData = await apiRequest('/companies');

        if (Array.isArray(companiesData) && companiesData.length > 0) {
          setCompanies(companiesData);
          setCompanyId(companiesData[0].id);
          setFormData(prev => ({ ...prev, companyId: companiesData[0].id }));

          localStorage.setItem('companyId', companiesData[0].id.toString());
          setLoadingCompany(false);
          return;
        }
      } catch (apiError) {
        console.warn('Companies API not available:', apiError);
      }

      console.warn('No company found, using default company ID: 1');
      setCompanyId(1);
      setFormData(prev => ({ ...prev, companyId: 1 }));
      localStorage.setItem('companyId', '1');

    } catch (error) {
      console.error('Error in fetchUserCompany:', error);

      const defaultId = 1;
      setCompanyId(defaultId);
      setFormData(prev => ({ ...prev, companyId: defaultId }));
      localStorage.setItem('companyId', defaultId.toString());
    } finally {
      setLoadingCompany(false);
    }
  };

  const fetchComponents = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const data = await apiRequest(`/salary-components?companyId=${companyId}`);

      if (Array.isArray(data)) {
        setComponents(data);
        setFilteredComponents(data);
      } else {
        console.error('API returned non-array data:', data);
        setComponents([]);
        setFilteredComponents([]);
      }
    } catch (error) {
      console.error('Error fetching components:', error);
      setComponents([]);
      setFilteredComponents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCompany();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchComponents();
    }
  }, [companyId]);

  useEffect(() => {
    if (!Array.isArray(components)) {
      setFilteredComponents([]);
      return;
    }

    let filtered = [...components];

    if (searchTerm) {
      filtered = filtered.filter(comp =>
        comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'All') {
      filtered = filtered.filter(comp => comp.type === filterType);
    }

    if (filterStatus !== 'All') {
      filtered = filtered.filter(comp => comp.status === filterStatus);
    }

    setFilteredComponents(filtered);
  }, [searchTerm, filterType, filterStatus, components]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCompanyChange = (e) => {
    const newCompanyId = parseInt(e.target.value);
    setCompanyId(newCompanyId);
    setFormData(prev => ({ ...prev, companyId: newCompanyId }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: 'Earning',
      calculationType: 'Fixed',
      percentage: '',
      formula: '',
      affectsGrossSalary: true,
      affectsNetSalary: true,
      isTaxable: true,
      isStatutory: false,
      displayOrder: 0,
      status: 'Active',
      companyId: companyId
    });
    setEditMode(false);
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.companyId) {
      alert('Company ID is required');
      return;
    }

    try {
      const url = editMode
        ? `/salary-components/${editId}`
        : '/salary-components';

      const method = editMode ? 'PUT' : 'POST';

      await apiRequest(url, {
        method,
        body: JSON.stringify(formData)
      });

      toast.success(editMode ? 'Component updated successfully!' : 'Component created successfully!');
      setShowModal(false);
      resetForm();
      fetchComponents();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Operation failed');
    }
  };

  const handleEdit = (component) => {
    setFormData({
      name: component.name,
      code: component.code,
      type: component.type,
      calculationType: component.calculationType,
      percentage: component.percentage || '',
      formula: component.formula || '',
      affectsGrossSalary: component.affectsGrossSalary,
      affectsNetSalary: component.affectsNetSalary,
      isTaxable: component.isTaxable,
      isStatutory: component.isStatutory,
      displayOrder: component.displayOrder,
      status: component.status,
      companyId: component.companyId
    });
    setEditId(component.id);
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this salary component?')) {
      return;
    }

    try {
      await apiRequest(`/salary-components/${id}`, {
        method: 'DELETE'
      });

      toast.success('Component deleted successfully!');
      fetchComponents();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Delete failed');
    }
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const stats = {
    total: Array.isArray(components) ? components.length : 0,
    earnings: Array.isArray(components) ? components.filter(c => c.type === 'Earning').length : 0,
    deductions: Array.isArray(components) ? components.filter(c => c.type === 'Deduction').length : 0,
    active: Array.isArray(components) ? components.filter(c => c.status === 'Active').length : 0
  };

  if (loadingCompany) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading company information...</p>
        </div>
      </div>
    );
  }

  if (!companyId && companies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center">
          <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No company found. Please contact administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Stats */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Salary Components</h1>
              <p className="text-gray-600">Manage earnings and deductions for payroll processing</p>

              {companies.length > 1 && (
                <div className="mt-4">
                  <select
                    value={companyId}
                    onChange={handleCompanyChange}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
                  >
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
            >
              <Plus size={20} />
              Add Component
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Components */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Components</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
                </div>
                <DollarSign size={32} className="text-blue-600" />
              </div>
            </div>

            {/* Earnings */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-green-700">Earnings</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{stats.earnings}</p>
                </div>
                <TrendingUp size={32} className="text-green-600" />
              </div>
            </div>

            {/* Deductions */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-red-700">Deductions</p>
                  <p className="text-2xl font-bold text-red-900 mt-1">{stats.deductions}</p>
                </div>
                <TrendingDown size={32} className="text-red-600" />
              </div>
            </div>

            {/* Active */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-purple-700">Active</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">{stats.active}</p>
                </div>
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">✓</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-3 text-gray-400" size={20} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="All">All Types</option>
                <option value="Earning">Earnings</option>
                <option value="Deduction">Deductions</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-3 text-gray-400" size={20} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading components...</p>
            </div>
          ) : filteredComponents.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 mb-4">No salary components found</p>
              <button
                onClick={openCreateModal}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Create your first component →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Code</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Calculation</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Taxable</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredComponents.map((component, index) => (
                    <tr key={component.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold">
                          {component.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">{component.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${component.type === 'Earning'
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-red-100 text-red-700 border border-red-300'
                          }`}>
                          {component.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div>
                          {component.calculationType}
                          {component.calculationType === 'Percentage' && (
                            <div className="text-blue-600 font-bold">({component.percentage}%)</div>
                          )}
                          {component.calculationType === 'Formula' && component.formula && (
                            <div className="text-xs text-gray-600 font-mono mt-1">
                              {component.formula}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {component.isTaxable ? (
                          <span className="text-green-600 font-semibold">Yes</span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${component.status === 'Active'
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-red-100 text-red-700 border border-red-300'
                          }`}>
                          {component.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(component)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(component.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                {editMode ? 'Edit Salary Component' : 'Create Salary Component'}
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-white hover:bg-blue-800 p-1 rounded-lg transition-colors duration-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Component Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Component Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Basic Pay, HRA"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Component Code */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Component Code <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., BASIC, HRA"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Type <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="Earning">Earning</option>
                    <option value="Deduction">Deduction</option>
                  </select>
                </div>

                {/* Calculation Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Calculation Type <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="calculationType"
                    value={formData.calculationType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="Fixed">Fixed</option>
                    <option value="Percentage">Percentage</option>
                    <option value="Formula">Formula</option>
                  </select>
                </div>

                {/* Percentage Field */}
                {formData.calculationType === 'Percentage' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Percentage <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      name="percentage"
                      value={formData.percentage}
                      onChange={handleInputChange}
                      required
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="e.g., 10.00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Display Order */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Display Order</label>
                  <input
                    type="number"
                    name="displayOrder"
                    value={formData.displayOrder}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Formula Field */}
              {formData.calculationType === 'Formula' && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Formula Expression <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="formula"
                    value={formData.formula}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., basic * 0.12 or (basic + da) * 0.10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Use salary component codes in lowercase. Supported operators: +, -, *, /, ()
                    <br />
                    Example formulas: "basic * 0.12" or "(basic + da) * 0.40"
                  </p>
                </div>
              )}

              {/* Component Properties Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Component Properties</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="affectsGrossSalary"
                      checked={formData.affectsGrossSalary}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Affects Gross Salary</span>
                  </label>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="affectsNetSalary"
                      checked={formData.affectsNetSalary}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Affects Net Salary</span>
                  </label>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="isTaxable"
                      checked={formData.isTaxable}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Taxable</span>
                  </label>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="isStatutory"
                      checked={formData.isStatutory}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Statutory Component</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  {editMode ? 'Update Component' : 'Create Component'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryComponentManagement;