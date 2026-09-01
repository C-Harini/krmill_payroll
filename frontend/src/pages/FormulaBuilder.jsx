import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Search, Filter, X,
  Calculator, Eye, Play, Save, Users, Briefcase
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiRequest } from '../utils/apiCaller';

const FormulaBuilder = () => {
  const [formulas, setFormulas] = useState([]);
  const [filteredFormulas, setFilteredFormulas] = useState([]);
  const [components, setComponents] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [employeeTypes, setEmployeeTypes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [loadingDesignations, setLoadingDesignations] = useState(false);
  const [loadingEmployeeTypes, setLoadingEmployeeTypes] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [companyId, setCompanyId] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  const [expression, setExpression] = useState([]);
  const [expressionString, setExpressionString] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    formulaType: 'Simple',
    formulaExpression: '',
    formulaJson: {},
    variables: [],
    targetComponentId: null,
    applicableDesignations: [],
    applicableEmployeeTypes: [],
    isActive: true,
    validFrom: '',
    validTo: '',
    priority: 0,
    companyId: null
  });

  const [editId, setEditId] = useState(null);

  const operators = [
    { symbol: '+', label: 'Add', type: 'operator' },
    { symbol: '-', label: 'Subtract', type: 'operator' },
    { symbol: '*', label: 'Multiply', type: 'operator' },
    { symbol: '/', label: 'Divide', type: 'operator' },
    { symbol: '(', label: 'Open Parenthesis', type: 'operator' },
    { symbol: ')', label: 'Close Parenthesis', type: 'operator' },
  ];

  const comparisons = [
    { symbol: '>', label: 'Greater Than', type: 'comparison' },
    { symbol: '<', label: 'Less Than', type: 'comparison' },
    { symbol: '>=', label: 'Greater or Equal', type: 'comparison' },
    { symbol: '<=', label: 'Less or Equal', type: 'comparison' },
    { symbol: '==', label: 'Equal', type: 'comparison' },
    { symbol: '!=', label: 'Not Equal', type: 'comparison' },
  ];

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchFormulas();
      fetchComponents();
      fetchDesignations();
      fetchEmployeeTypes();
    }
  }, [companyId]);

  useEffect(() => {
    let filtered = Array.isArray(formulas) ? [...formulas] : [];

    if (searchTerm) {
      filtered = filtered.filter(formula =>
        formula.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formula.formulaExpression?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'All') {
      filtered = filtered.filter(formula => formula.formulaType === filterType);
    }

    if (filterStatus !== 'All') {
      filtered = filtered.filter(formula =>
        filterStatus === 'Active' ? formula.isActive : !formula.isActive
      );
    }

    setFilteredFormulas(filtered);
  }, [searchTerm, filterType, filterStatus, formulas]);

  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    setError(null);
    try {
      const data = await apiRequest('/companies');
      const companyList = Array.isArray(data) ? data : [];
      setCompanies(companyList);

      const storedCompanyId = localStorage.getItem('companyId');
      if (storedCompanyId && companyList.some(c => c.id === parseInt(storedCompanyId))) {
        const parsedId = parseInt(storedCompanyId);
        setCompanyId(parsedId);
        setFormData(prev => ({ ...prev, companyId: parsedId }));
      } else if (companyList.length > 0) {
        const firstCompanyId = companyList[0].id;
        setCompanyId(firstCompanyId);
        setFormData(prev => ({ ...prev, companyId: firstCompanyId }));
      } else {
        const defaultId = storedCompanyId ? parseInt(storedCompanyId) : 1;
        setCompanyId(defaultId);
        setFormData(prev => ({ ...prev, companyId: defaultId }));
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      const storedCompanyId = localStorage.getItem('companyId');
      const defaultId = storedCompanyId ? parseInt(storedCompanyId) : 1;
      setCompanyId(defaultId);
      setFormData(prev => ({ ...prev, companyId: defaultId }));
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchFormulas = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const data = await apiRequest(`/formulas?companyId=${companyId}`);
      setFormulas(Array.isArray(data) ? data : []);
      setFilteredFormulas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching formulas:', err);
      setFormulas([]);
      setFilteredFormulas([]);
      toast.error('Failed to fetch formulas');
    } finally {
      setLoading(false);
    }
  };

  const fetchComponents = async () => {
    if (!companyId) return;

    setLoadingComponents(true);
    try {
      const data = await apiRequest(`/formulas/components/${companyId}`);
      setComponents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching components:', err);
      setComponents([]);
    } finally {
      setLoadingComponents(false);
    }
  };

  const fetchDesignations = async () => {
    if (!companyId) return;

    setLoadingDesignations(true);
    try {
      const data = await apiRequest(`/formulas/designations/${companyId}`);
      setDesignations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching designations:', err);
      setDesignations([]);
    } finally {
      setLoadingDesignations(false);
    }
  };

  const fetchEmployeeTypes = async () => {
    if (!companyId) return;

    setLoadingEmployeeTypes(true);
    try {
      const data = await apiRequest(`/formulas/employee-types/${companyId}`);
      setEmployeeTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching employee types:', err);
      setEmployeeTypes([]);
    } finally {
      setLoadingEmployeeTypes(false);
    }
  };

  const handleCompanyChange = (e) => {
    const newCompanyId = parseInt(e.target.value);
    setCompanyId(newCompanyId);
    setFormData(prev => ({ ...prev, companyId: newCompanyId }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMultiSelectChange = (e, field) => {
    const options = e.target.options;
    const values = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        values.push(parseInt(options[i].value));
      }
    }
    setFormData(prev => ({ ...prev, [field]: values }));
  };

  const addToExpression = (item) => {
    const newExpression = [...expression, item];
    setExpression(newExpression);
    updateExpressionString(newExpression);
  };

  const removeFromExpression = (index) => {
    const newExpression = expression.filter((_, i) => i !== index);
    setExpression(newExpression);
    updateExpressionString(newExpression);
  };

  const clearExpression = () => {
    setExpression([]);
    setExpressionString('');
  };

  const updateExpressionString = (expr) => {
    const str = expr.map(item => {
      if (item.type === 'component') return item.name;
      if (item.type === 'operator' || item.type === 'comparison') return item.symbol;
      if (item.type === 'number') return item.value;
      return '';
    }).join(' ');
    setExpressionString(str);
    setFormData(prev => ({ ...prev, formulaExpression: str }));
  };

  const addNumber = () => {
    const value = prompt('Enter a number:');
    if (value && !isNaN(value)) {
      addToExpression({ type: 'number', value: parseFloat(value) });
    }
  };

  const buildFormulaJson = (expr) => {
    return {
      type: 'expression',
      elements: expr
    };
  };

  const extractVariables = (expr) => {
    return [...new Set(expr.filter(item => item.type === 'component').map(item => item.name))];
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      formulaType: 'Simple',
      formulaExpression: '',
      formulaJson: {},
      variables: [],
      targetComponentId: null,
      applicableDesignations: [],
      applicableEmployeeTypes: [],
      isActive: true,
      validFrom: '',
      validTo: '',
      priority: 0,
      companyId: companyId
    });
    setExpression([]);
    setExpressionString('');
    setTestResult(null);
    setEditMode(false);
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !expressionString) {
      toast.warn('Please provide formula name and build the formula');
      return;
    }

    const formulaData = {
      ...formData,
      formulaExpression: expressionString,
      formulaJson: buildFormulaJson(expression),
      variables: extractVariables(expression),
      companyId: companyId
    };

    try {
      const url = editMode ? `/formulas/${editId}` : '/formulas';
      const method = editMode ? 'PUT' : 'POST';

      await apiRequest(url, {
        method,
        body: JSON.stringify(formulaData)
      });

      toast.success(editMode ? 'Formula updated successfully!' : 'Formula created successfully!');
      setShowModal(false);
      resetForm();
      fetchFormulas();
    } catch (err) {
      console.error('Error saving formula:', err);
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleEdit = (formula) => {
    setFormData({
      name: formula.name,
      description: formula.description || '',
      formulaType: formula.formulaType,
      formulaExpression: formula.formulaExpression,
      formulaJson: formula.formulaJson,
      variables: formula.variables || [],
      targetComponentId: formula.targetComponentId,
      applicableDesignations: formula.applicableDesignations || [],
      applicableEmployeeTypes: formula.applicableEmployeeTypes || [],
      isActive: formula.isActive,
      validFrom: formula.validFrom ? formula.validFrom.split('T')[0] : '',
      validTo: formula.validTo ? formula.validTo.split('T')[0] : '',
      priority: formula.priority,
      companyId: formula.companyId
    });
    setExpressionString(formula.formulaExpression);
    setExpression(formula.formulaJson?.elements || []);
    setEditId(formula.id);
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this formula?')) {
      return;
    }

    try {
      await apiRequest(`/formulas/${id}`, { method: 'DELETE' });
      toast.success('Formula deleted successfully!');
      fetchFormulas();
    } catch (err) {
      console.error('Error deleting formula:', err);
      toast.error(err.message || 'Delete failed');
    }
  };

  const getDesignationNames = (designationIds) => {
    if (!designationIds || designationIds.length === 0) return 'All';
    return designations
      .filter(d => designationIds.includes(d.id))
      .map(d => d.name)
      .join(', ') || 'All';
  };

  const getEmployeeTypeNames = (typeIds) => {
    if (!typeIds || typeIds.length === 0) return 'All';
    return employeeTypes
      .filter(t => typeIds.includes(t.id))
      .map(t => t.name)
      .join(', ') || 'All';
  };

  const handleView = (formula) => {
    const designationText = getDesignationNames(formula.applicableDesignations);
    const employeeTypeText = getEmployeeTypeNames(formula.applicableEmployeeTypes);
    const targetName = formula.targetComponent?.name || 'None';

    alert(`Formula: ${formula.name}\n\nExpression: ${formula.formulaExpression}\n\nType: ${formula.formulaType}\n\nTarget: ${targetName}\n\nDesignations: ${designationText}\n\nEmployee Types: ${employeeTypeText}`);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const stats = {
    total: formulas.length,
    simple: formulas.filter(f => f.formulaType === 'Simple').length,
    conditional: formulas.filter(f => f.formulaType === 'Conditional').length,
    active: formulas.filter(f => f.isActive).length
  };

  if (loadingCompanies) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center text-gray-700">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-4 animate-spin"></div>
          <p className="text-base">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Company Selector */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-center gap-4">
            <label className="text-base font-semibold text-gray-900 min-w-max">
              Select Company:
            </label>
            <select
              value={companyId || ''}
              onChange={handleCompanyChange}
              className="flex-1 px-4 py-2 text-sm border-2 border-gray-300 rounded-lg outline-none cursor-pointer bg-white hover:border-gray-400 focus:border-purple-500"
            >
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Header & Stats */}
        <div className="bg-white rounded-2xl p-8 mb-6 shadow-lg">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent mb-2">
                Formula Builder
              </h1>
              <p className="text-gray-600 text-base">
                Build and manage salary calculation formulas
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg font-semibold hover:shadow-lg transition duration-200"
            >
              <Plus size={20} />
              Create Formula
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-5 flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">
                  Total Formulas
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {stats.total}
                </p>
              </div>
              <Calculator size={32} className="text-blue-500" />
            </div>

            <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-5 flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-green-900 uppercase tracking-wide mb-1">
                  Simple
                </p>
                <p className="text-3xl font-bold text-green-900">
                  {stats.simple}
                </p>
              </div>
              <span className="text-3xl font-bold text-green-600">+</span>
            </div>

            <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg p-5 flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-1">
                  Conditional
                </p>
                <p className="text-3xl font-bold text-amber-900">
                  {stats.conditional}
                </p>
              </div>
              <span className="text-3xl font-bold text-amber-600">?</span>
            </div>

            <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg p-5 flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-purple-900 uppercase tracking-wide mb-1">
                  Active
                </p>
                <p className="text-3xl font-bold text-purple-900">
                  {stats.active}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                ✓
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search formulas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg text-sm outline-none focus:border-purple-500"
              />
            </div>

            <div className="relative">
              <Filter size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg text-sm outline-none cursor-pointer focus:border-purple-500"
              >
                <option value="All">All Types</option>
                <option value="Simple">Simple</option>
                <option value="Conditional">Conditional</option>
                <option value="Complex">Complex</option>
              </select>
            </div>

            <div className="relative">
              <Filter size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg text-sm outline-none cursor-pointer focus:border-purple-500"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Formulas Table */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-purple-600 rounded-full mx-auto mb-4 animate-spin"></div>
              <p className="text-gray-600">Loading formulas...</p>
            </div>
          ) : filteredFormulas.length === 0 ? (
            <div className="text-center py-12">
              <Calculator size={48} className="text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No formulas found</p>
              <button
                onClick={openCreateModal}
                className="text-purple-600 bg-none border-none text-base font-semibold cursor-pointer"
              >
                Create your first formula
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="px-4 py-3 text-left font-semibold text-gray-800">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-800">Expression</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-800">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-800">Target Component</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-800">Designations</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-800">Employee Types</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-800">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-800">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFormulas.map(formula => (
                    <tr key={formula.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">{formula.name}</td>
                      <td className="px-4 py-3 font-mono text-sm">{formula.formulaExpression}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${formula.formulaType === 'Simple' ? 'bg-green-100 text-green-800' :
                            formula.formulaType === 'Conditional' ? 'bg-amber-100 text-amber-800' :
                              'bg-indigo-100 text-indigo-800'
                          }`}>
                          {formula.formulaType}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formula.targetComponent?.name || 'None'}</td>
                      <td className="px-4 py-3 text-sm">
                        {formula.applicableDesignations && formula.applicableDesignations.length > 0
                          ? getDesignationNames(formula.applicableDesignations)
                          : 'All'
                        }
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formula.applicableEmployeeTypes && formula.applicableEmployeeTypes.length > 0
                          ? getEmployeeTypeNames(formula.applicableEmployeeTypes)
                          : 'All'
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${formula.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {formula.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleView(formula)}
                            className="bg-none border-none cursor-pointer text-gray-600 hover:text-gray-800 transition"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(formula)}
                            className="bg-none border-none cursor-pointer text-gray-600 hover:text-gray-800 transition"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(formula.id)}
                            className="bg-none border-none cursor-pointer text-gray-600 hover:text-red-600 transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editMode ? 'Edit Formula' : 'Create New Formula'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="bg-none border-none cursor-pointer text-gray-600 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Formula Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Formula Type
                </label>
                <select
                  name="formulaType"
                  value={formData.formulaType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Simple">Simple</option>
                  <option value="Conditional">Conditional</option>
                  <option value="Complex">Complex</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Target Component
                </label>
                <select
                  name="targetComponentId"
                  value={formData.targetComponentId || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  {components.map(component => (
                    <option key={component.id} value={component.id}>
                      {component.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Applicable Designations
                </label>
                <select
                  multiple
                  value={formData.applicableDesignations}
                  onChange={(e) => handleMultiSelectChange(e, 'applicableDesignations')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent h-24"
                >
                  {designations.map(designation => (
                    <option key={designation.id} value={designation.id}>
                      {designation.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  Leave empty to apply to all designations
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Applicable Employee Types
                </label>
                <select
                  multiple
                  value={formData.applicableEmployeeTypes}
                  onChange={(e) => handleMultiSelectChange(e, 'applicableEmployeeTypes')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent h-24"
                >
                  {employeeTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  Leave empty to apply to all employee types
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Formula Expression
                </label>
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {components.map(component => (
                      <button
                        key={component.id}
                        type="button"
                        onClick={() => addToExpression({ type: 'component', name: component.name })}
                        className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-semibold rounded hover:bg-indigo-200 transition"
                      >
                        {component.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {operators.map(op => (
                      <button
                        key={op.symbol}
                        type="button"
                        onClick={() => addToExpression(op)}
                        className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded hover:bg-green-200 transition"
                      >
                        {op.symbol}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={addNumber}
                      className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded hover:bg-amber-200 transition"
                    >
                      Number
                    </button>
                  </div>
                </div>

                <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 min-h-16 flex items-center justify-between">
                  <div>
                    {expression.length === 0 ? (
                      <span className="text-gray-400 text-sm">Click components and operators to build formula</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {expression.map((item, index) => (
                          <span
                            key={index}
                            className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer flex items-center gap-1 ${item.type === 'component' ? 'bg-blue-100 text-blue-800' :
                                item.type === 'operator' ? 'bg-green-100 text-green-800' :
                                  'bg-amber-100 text-amber-800'
                              }`}
                            onClick={() => removeFromExpression(index)}
                          >
                            {item.type === 'component' ? item.name :
                              item.type === 'operator' || item.type === 'comparison' ? item.symbol :
                                item.value}
                            <X size={12} />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {expression.length > 0 && (
                    <button
                      type="button"
                      onClick={clearExpression}
                      className="bg-none border-none cursor-pointer text-gray-600 hover:text-gray-800"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Priority
                </label>
                <input
                  type="number"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Lower number = higher priority
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Valid From
                </label>
                <input
                  type="date"
                  name="validFrom"
                  value={formData.validFrom}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Valid To
                </label>
                <input
                  type="date"
                  name="validTo"
                  value={formData.validTo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2 mb-6">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="rounded cursor-pointer"
                />
                <label className="text-sm font-semibold text-gray-800 cursor-pointer">
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition"
                >
                  {editMode ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormulaBuilder;