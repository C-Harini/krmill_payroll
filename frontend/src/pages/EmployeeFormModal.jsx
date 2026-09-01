import React, { useState, useEffect } from "react";

const EmployeeFormModal = ({
  employee,
  companyId,
  companyName,
  masterData,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [categories, setCategories] = useState([]);
  const [castes, setCastes] = useState([]);
  const [religions, setReligions] = useState([]);
  const [formData, setFormData] = useState({
    // Basic Info
    employeeCode: "",
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    maritalStatus: "",
    profilePhoto: "",
    categoryId: "",
    casteId: "",
    religionId: "",
    experience: "",
    isTrainee: false,
    isHostel: false,

    // Contact & Address
    personalEmail: "",
    officialEmail: "",
    mobileNumber: "",
    alternateMobile: "",
    emergencyContactName: "",
    emergencyContactNumber: "",
    emergencyContactRelationship: "",
    currentAddressLine1: "",
    currentAddressLine2: "",
    currentCity: "",
    currentState: "",
    currentPincode: "",
    currentCountry: "India",
    permanentAddressLine1: "",
    permanentAddressLine2: "",
    permanentCity: "",
    permanentState: "",
    permanentPincode: "",
    permanentCountry: "India",

    // Employment Details
    departmentId: "",
    designationId: "",
    gradeId: "",
    employmentTypeId: "",
    employeeType: "Permanent",
    workingType: "monthly",
    dateOfJoining: "",
    dateOfRejoining: "",
    confirmationDate: "",
    probationPeriod: 0,
    relievingDate: "",
    leavingReason: "",
    reportingManagerId: "",
    workLocation: "",
    employmentStatus: "Active",
    referencePersonName: "",
    referencePersonContact: "",

    // Shift & Attendance
    shiftTypeId: "",
    leavePolicyId: "",
    weeklyOff: "Sunday",
    isOvertimeApplicable: false,
    isLeaveApplicable: true,
    biometricDeviceId: "",
    biometricEnrollmentId: "",

    // Salary & Bank
    basicSalary: 0,
    providentFundNumber: "",
    bankName: "",
    bankAccountNumber: "",
    ifscCode: "",
    bankBranch: "",
    paymentMode: "Bank Transfer",
    uanNumber: "",
    epfNumber: "",
    esiNumber: "",

    // Transport & Hostel
    isTransportRequired: false,
    busId: "",
    pickupPoint: "",

    status: "Active",
  });

  const [age, setAge] = useState("");
  const [retirementDate, setRetirementDate] = useState("");
  const [ageNumber, setAgeNumber] = useState(null);
  const [adolescenceCertificate, setAdolescenceCertificate] = useState(null);

  // ── Fetch categories, castes, religions ─────────────────────
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const [categoriesRes, castesRes, religionsRes] = await Promise.all([
          fetch(`${apiUrl}/categories?companyId=${companyId}`),
          fetch(`${apiUrl}/castes?companyId=${companyId}`),
          fetch(`${apiUrl}/religions?companyId=${companyId}`),
        ]);
        if (categoriesRes.ok) { const data = await categoriesRes.json(); setCategories(Array.isArray(data) ? data : []); }
        if (castesRes.ok)     { const data = await castesRes.json();     setCastes(Array.isArray(data) ? data : []); }
        if (religionsRes.ok)  { const data = await religionsRes.json();  setReligions(Array.isArray(data) ? data : []); }
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      }
    };
    if (companyId) fetchDropdownData();
  }, [companyId]);

  // ── Load employee data when editing ─────────────────────────
  useEffect(() => {
    if (!employee) return;
    const formatDate = (date) => {
      if (!date || date === "NULL") return "";
      const d = new Date(date);
      if (isNaN(d.getTime())) return ""; // 🛡️ prevent crash
      return d.toISOString().split("T")[0];
    };
    setFormData((prev) => ({
      ...prev,
      ...employee,
      gradeId: (employee.gradeId !== null && employee.gradeId !== undefined && employee.gradeId !== 0 && employee.gradeId !== '0') 
        ? String(employee.gradeId) 
        : (employee.grade?.id ? String(employee.grade.id) : ""),
      employeeType: employee.employeeType || "Worker",
      workingType: employee.workingType ? employee.workingType.toLowerCase() : "monthly",
      employmentTypeId: employee.employmentTypeId ? String(employee.employmentTypeId) : (employee.employmentType?.id ? String(employee.employmentType.id) : ""),
      departmentId: employee.departmentId ? String(employee.departmentId) : (employee.department?.id ? String(employee.department.id) : ""),
      designationId: employee.designationId ? String(employee.designationId) : (employee.designation?.id ? String(employee.designation.id) : ""),
      categoryId: employee.categoryId ? String(employee.categoryId) : (employee.category?.id ? String(employee.category.id) : ""),
      casteId: employee.casteId ? String(employee.casteId) : (employee.caste?.id ? String(employee.caste.id) : ""),
      religionId: employee.religionId ? String(employee.religionId) : (employee.religion?.id ? String(employee.religion.id) : ""),
      shiftTypeId: employee.shiftTypeId ? String(employee.shiftTypeId) : (employee.shiftType?.id ? String(employee.shiftType.id) : ""),
      leavePolicyId: employee.leavePolicyId ? String(employee.leavePolicyId) : (employee.leavePolicy?.id ? String(employee.leavePolicy.id) : ""),
      biometricDeviceId: employee.biometricDeviceId ? String(employee.biometricDeviceId) : (employee.biometricDevice?.id ? String(employee.biometricDevice.id) : ""),
      busId: employee.busId ? String(employee.busId) : (employee.bus?.id ? String(employee.bus.id) : ""),
      reportingManagerId: employee.reportingManagerId ? String(employee.reportingManagerId) : (employee.reportingManager?.id ? String(employee.reportingManager.id) : ""),
      providentFundNumber: employee.providentFundNumber || "",
      dateOfBirth:      formatDate(employee.dateOfBirth),
      dateOfJoining:    formatDate(employee.dateOfJoining),
      dateOfRejoining:  formatDate(employee.dateOfRejoining),
      relievingDate:    formatDate(employee.relievingDate),
      confirmationDate: formatDate(employee.confirmationDate),
      // ✅ Ensure country fields are never null
      currentCountry:   employee.currentCountry   || "India",
      permanentCountry: employee.permanentCountry || "India",
      profilePhoto: employee.profilePhoto || prev.profilePhoto || null,
      adolescenceCertificate: employee.adolescenceCertificate || prev.adolescenceCertificate || null,
    }));
  }, [employee]);

  // ── Auto-calculate age & retirement on DOB change ────────────
  useEffect(() => {
    if (formData.dateOfBirth) calculateAgeAndRetirement(formData.dateOfBirth);
  }, [formData.dateOfBirth]);

  const calculateAgeAndRetirement = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
    setAge(`${calculatedAge} years`);
    setAgeNumber(calculatedAge);
    const retirement = new Date(birthDate);
    retirement.setFullYear(birthDate.getFullYear() + 58);
    setRetirementDate(retirement.toISOString().split("T")[0]);
  };

  const calculateExperience = (joiningDate, relievingDate, rejoiningDate) => {
    if (!joiningDate) return 0;
    let totalMonths = 0;
    const today = new Date();
    const start1 = new Date(joiningDate);
    const end1 = relievingDate ? new Date(relievingDate) : today;
    let years1 = end1.getFullYear() - start1.getFullYear();
    let months1 = end1.getMonth() - start1.getMonth();
    if (end1.getDate() < start1.getDate()) months1--;
    if (months1 < 0) { years1--; months1 += 12; }
    totalMonths += years1 * 12 + months1;
    if (rejoiningDate) {
      const start2 = new Date(rejoiningDate);
      let years2 = today.getFullYear() - start2.getFullYear();
      let months2 = today.getMonth() - start2.getMonth();
      if (today.getDate() < start2.getDate()) months2--;
      if (months2 < 0) { years2--; months2 += 12; }
      totalMonths += years2 * 12 + months2;
    }
    return totalMonths;
  };

  const formatExperience = (totalMonths) => {
    if (!totalMonths && totalMonths !== 0) return "";
    const months = parseInt(totalMonths) || 0;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return `${years} Year${years !== 1 ? "s" : ""} ${remainingMonths} Month${remainingMonths !== 1 ? "s" : ""}`;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updatedData = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "dateOfJoining" || name === "dateOfRejoining" || name === "relievingDate") {
        updatedData.experience = calculateExperience(
          updatedData.dateOfJoining,
          updatedData.relievingDate,
          updatedData.dateOfRejoining,
        );
      }
      return updatedData;
    });
  };

  const handleSameAsCurrentAddress = (e) => {
    if (e.target.checked) {
      setFormData((prev) => ({
        ...prev,
        permanentAddressLine1: prev.currentAddressLine1,
        permanentAddressLine2: prev.currentAddressLine2,
        permanentCity:    prev.currentCity,
        permanentState:   prev.currentState,
        permanentPincode: prev.currentPincode,
        permanentCountry: prev.currentCountry,
      }));
    }
  };

  // ── Tabs definition ──────────────────────────────────────────
  const tabs = [
    { id: 0, label: "📋 Basic Info" },
    { id: 1, label: "📞 Contact & Address" },
    { id: 2, label: "💼 Employment" },
    { id: 3, label: "⏰ Shift & Attendance" },
    { id: 4, label: "💰 Salary & Bank" },
    { id: 5, label: "🚌 Transport" },
  ];

  // ── Tab status indicators ────────────────────────────────────
  const getTabStatus = (tabId) => {
    switch (tabId) {
      case 0:
        return formData.employeeCode && formData.firstName && formData.lastName &&
               formData.dateOfBirth && formData.gender ? "✓" : "⚠️";
      case 1:
        return formData.personalEmail && formData.mobileNumber &&
               formData.currentAddressLine1 && formData.currentCity &&
               formData.currentState && formData.currentPincode &&
               formData.currentCountry ? "✓" : "⚠️";
      case 2:
        return formData.departmentId && formData.designationId &&
               formData.employmentTypeId && formData.dateOfJoining ? "✓" : "⚠️";
      default:
        return ""; // Tabs 3,4,5 have no required fields
    }
  };

  // ── Validation — only tabs 0,1,2 have required fields ───────
  const validateCurrentTab = () => {
    const ok = (v) => v !== undefined && v !== null && String(v).trim() !== "";
    switch (activeTab) {
      case 0:
        return ok(formData.employeeCode) && ok(formData.firstName) &&
               ok(formData.lastName) && ok(formData.dateOfBirth) && ok(formData.gender);
      case 1:
        return ok(formData.personalEmail) && ok(formData.mobileNumber) &&
               ok(formData.currentAddressLine1) && ok(formData.currentCity) &&
               ok(formData.currentState) && ok(formData.currentPincode) &&
               ok(formData.currentCountry);
      case 2:
        return ok(formData.departmentId) && ok(formData.designationId) &&
               ok(formData.employmentTypeId) && ok(formData.dateOfJoining);
      default:
        return true; // ✅ tabs 3, 4, 5 always pass
    }
  };

  // ── Navigation ───────────────────────────────────────────────
  const handleNextTab = () => {
    if (!validateCurrentTab()) {
      const messages = {
        0: "Please fill required fields:\n• Employee Code\n• First Name\n• Last Name\n• Date of Birth\n• Gender",
        1: "Please fill required fields:\n• Personal Email\n• Mobile Number\n• Current Address Line 1\n• City\n• State\n• Pincode\n• Country",
        2: "Please fill required fields:\n• Department\n• Designation\n• Employment Type\n• Date of Joining",
      };
      if (messages[activeTab]) window.alert(messages[activeTab]);
      return;
    }
    // ✅ Always allow moving forward if validation passes
    setActiveTab((prev) => Math.min(prev + 1, tabs.length - 1));
  };

  const handlePreviousTab = () => {
    setActiveTab((prev) => Math.max(prev - 1, 0));
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredFields = {
      "Employee Code":   formData.employeeCode,
      "First Name":      formData.firstName,
      "Last Name":       formData.lastName,
      "Date of Birth":   formData.dateOfBirth,
      "Gender":          formData.gender,
      "Personal Email":  formData.personalEmail,
      "Mobile Number":   formData.mobileNumber,
      "Current Address": formData.currentAddressLine1,
      "City":            formData.currentCity,
      "State":           formData.currentState,
      "Pincode":         formData.currentPincode,
      "Country":         formData.currentCountry,
      "Department":      formData.departmentId,
      "Designation":     formData.designationId,
      "Employment Type": formData.employmentTypeId,
      "Date of Joining": formData.dateOfJoining,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([field]) => field);

    if (missingFields.length > 0) {
      window.alert(`Please fill the following required fields:\n\n${missingFields.join("\n")}`);
      return;
    }

    if (ageNumber !== null && ageNumber < 18 && !adolescenceCertificate && !employee) {
      window.alert("Adolescence Certificate is required for employees below 18");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const url    = `${apiUrl}${employee ? `/employees/${employee.id}` : "/employees"}`;
      const method = employee ? "PUT" : "POST";
      const payload = new FormData();

      Object.entries({ ...formData, companyId }).forEach(([key, value]) => {
        if (!(value instanceof File)) {
          payload.append(key, value ?? "");
        }
      });

      ["profilePhoto", "adolescenceCertificate"].forEach((field) => {
        const file = formData[field];
        if (file instanceof File) payload.append(field, file);
      });

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to save employee");
      }

      if (onSave) onSave();
    } catch (err) {
      window.alert("Error: " + err.message);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="w-full h-full flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="text-3xl">{employee ? "✏️" : "➕"}</span>
                {employee ? "Edit Employee" : "Add New Employee"}
              </h2>
              <p className="text-blue-100 mt-1 text-sm">
                Fill in the employee details across different sections
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <span className="text-2xl">✕</span>
            </button>
          </div>
          {/* Progress Bar */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm opacity-90 font-medium">Required Fields Progress:</span>
            <div className="flex-1 h-2.5 bg-white bg-opacity-30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300 rounded-full"
                style={{
                  width: `${([0, 1, 2].filter((id) => getTabStatus(id) === "✓").length / 3) * 100}%`,
                }}
              />
            </div>
            <span className="text-sm font-bold min-w-fit bg-white bg-opacity-20 px-3 py-1 rounded-full">
              {[0, 1, 2].filter((id) => getTabStatus(id) === "✓").length}/3
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-semibold text-sm whitespace-nowrap transition-all flex items-center gap-2 border-b-4 ${
                activeTab === tab.id
                  ? "bg-white text-blue-600 border-blue-600 shadow-sm"
                  : "text-slate-600 border-transparent hover:text-blue-600 hover:bg-white hover:bg-opacity-50"
              }`}
            >
              <span>{tab.label}</span>
              {getTabStatus(tab.id) && (
                <span
                  className={`text-base ${
                    getTabStatus(tab.id) === "✓" ? "text-green-600" : "text-orange-500"
                  }`}
                >
                  {getTabStatus(tab.id)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-slate-50 to-white min-h-0">

            {/* ── TAB 0: Basic Info ─────────────────────────── */}
            {activeTab === 0 && (
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                  <input
                    type="text" value={companyName} disabled
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Employee Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" name="employeeCode" value={formData.employeeCode}
                    onChange={handleInputChange} required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" name="firstName" value={formData.firstName}
                    onChange={handleInputChange} required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Middle Name</label>
                  <input
                    type="text" name="middleName" value={formData.middleName || ""}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" name="lastName" value={formData.lastName}
                    onChange={handleInputChange} required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date" name="dateOfBirth" value={formData.dateOfBirth}
                    onChange={handleInputChange} required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Category {categories.length === 0 && <span className="text-red-500 text-xs">(Loading...)</span>}
                  </label>
                  <select
                    name="categoryId" value={formData.categoryId} onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.categoryName || cat.name || "Unnamed"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Caste {castes.length === 0 && <span className="text-red-500 text-xs">(Loading...)</span>}
                  </label>
                  <select
                    name="casteId" value={formData.casteId} onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select Caste</option>
                    {castes.map((caste) => (
                      <option key={caste.id} value={caste.id}>{caste.casteName || caste.name || "Unnamed"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Religion {religions.length === 0 && <span className="text-red-500 text-xs">(Loading...)</span>}
                  </label>
                  <select
                    name="religionId" value={formData.religionId} onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select Religion</option>
                    {religions.map((rel) => (
                      <option key={rel.id} value={rel.id}>{rel.religionName || rel.name || "Unnamed"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Age (Auto)</label>
                  <input
                    type="text" value={age} disabled
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 font-medium"
                  />
                </div>

                {/* Adolescence Certificate — only shown if age < 18 */}
                {ageNumber !== null && ageNumber < 18 && (
                  <div className="col-span-3 space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <label className="block text-sm font-semibold text-slate-700">
                      Adolescence Certificate <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Certificate Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text" name="adolescenceCertificateNumber"
                          value={formData.adolescenceCertificateNumber || ""}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Validity Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date" name="adolescenceCertificateValidity"
                          value={formData.adolescenceCertificateValidity || ""}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Upload Certificate <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="file" accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setAdolescenceCertificate(e.target.files[0])}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white"
                          required={!employee?.adolescenceCertificate}
                        />
                        {employee?.adolescenceCertificate && !adolescenceCertificate && (
                          <a
                            href={`${import.meta.env.VITE_API_URL}/uploads/${employee.adolescenceCertificate}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 underline text-xs mt-1 block"
                          >
                            View Current Certificate
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">Mandatory for employees below 18 years</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender" value={formData.gender} onChange={handleInputChange} required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                  >
                    <option value="">-- Select --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Blood Group</label>
                  <select
                    name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                  >
                    <option value="">-- Select --</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Marital Status</label>
                  <select
                    name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                  >
                    <option value="">-- Select --</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-8">
                  <input
                    type="checkbox" id="isTrainee" name="isTrainee"
                    checked={formData.isTrainee} onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600 rounded cursor-pointer focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="isTrainee" className="text-sm font-medium text-slate-700 cursor-pointer">Is Trainee</label>
                </div>
                <div className="flex items-center gap-3 pt-8">
                  <input
                    type="checkbox" id="isHostel" name="isHostel"
                    checked={formData.isHostel} onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600 rounded cursor-pointer focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="isHostel" className="text-sm font-medium text-slate-700 cursor-pointer">Is Hostel</label>
                </div>
              </div>
            )}

            {/* ── TAB 1: Contact & Address ───────────────────── */}
            {activeTab === 1 && (
              <div className="space-y-8">
                {/* Contact */}
                <div>
                  <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                    <span className="text-2xl">📞</span>
                    <h3 className="text-lg font-bold text-slate-800">Contact Information</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Personal Email <span className="text-red-500">*</span></label>
                      <input type="email" name="personalEmail" value={formData.personalEmail} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Official Email</label>
                      <input type="email" name="officialEmail" value={formData.officialEmail} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Mobile Number <span className="text-red-500">*</span></label>
                      <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Alternate Mobile</label>
                      <input type="tel" name="alternateMobile" value={formData.alternateMobile} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Emergency Contact Name</label>
                      <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Emergency Contact Number</label>
                      <input type="tel" name="emergencyContactNumber" value={formData.emergencyContactNumber} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Emergency Contact Relationship</label>
                      <input type="text" name="emergencyContactRelationship" value={formData.emergencyContactRelationship} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                  </div>
                </div>

                {/* Current Address */}
                <div>
                  <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                    <span className="text-2xl">📍</span>
                    <h3 className="text-lg font-bold text-slate-800">Current Address</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-3">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Address Line 1 <span className="text-red-500">*</span></label>
                      <input type="text" name="currentAddressLine1" value={formData.currentAddressLine1} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Address Line 2</label>
                      <input type="text" name="currentAddressLine2" value={formData.currentAddressLine2} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">City <span className="text-red-500">*</span></label>
                      <input type="text" name="currentCity" value={formData.currentCity} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">State <span className="text-red-500">*</span></label>
                      <input type="text" name="currentState" value={formData.currentState} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Pincode <span className="text-red-500">*</span></label>
                      <input type="text" name="currentPincode" value={formData.currentPincode} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Country <span className="text-red-500">*</span></label>
                      <input type="text" name="currentCountry" value={formData.currentCountry} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                  </div>
                </div>

                {/* Permanent Address */}
                <div>
                  <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                    <span className="text-2xl">🏠</span>
                    <h3 className="text-lg font-bold text-slate-800">Permanent Address</h3>
                  </div>
                  <div className="mb-4">
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                      <input type="checkbox" id="sameAsCurrentAddress" onChange={handleSameAsCurrentAddress} className="w-5 h-5 text-blue-600 rounded cursor-pointer focus:ring-2 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Same as Current Address</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-3">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Address Line 1</label>
                      <input type="text" name="permanentAddressLine1" value={formData.permanentAddressLine1} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Address Line 2</label>
                      <input type="text" name="permanentAddressLine2" value={formData.permanentAddressLine2} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">City</label>
                      <input type="text" name="permanentCity" value={formData.permanentCity} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">State</label>
                      <input type="text" name="permanentState" value={formData.permanentState} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Pincode</label>
                      <input type="text" name="permanentPincode" value={formData.permanentPincode} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Country</label>
                      <input type="text" name="permanentCountry" value={formData.permanentCountry} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: Employment ──────────────────────────── */}
            {activeTab === 2 && (
              <div className="space-y-8">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Department <span className="text-red-500">*</span></label>
                    <select name="departmentId" value={formData.departmentId || ""} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all">
                      <option value="">-- Select Department --</option>
                      {masterData.departments && masterData.departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.departmentname || dept.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Designation <span className="text-red-500">*</span></label>
                    <select name="designationId" value={formData.designationId || ""} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all">
                      <option value="">-- Select Designation --</option>
                      {masterData.designations && masterData.designations.map((desig) => <option key={desig.id} value={desig.id}>{desig.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Employee Grade</label>
                    <select name="gradeId" value={formData.gradeId || ""} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all">
                      <option value="">-- Select Grade --</option>
                      {masterData.grades && masterData.grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Employee Type <span className="text-red-500">*</span></label>
                    <select name="employeeType" value={formData.employeeType || "Worker"} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all">
                      <option value="">-- Select Employee Type --</option>
                      <option value="Staff">Staff</option>
                      <option value="Worker">Worker</option>
                      <option value="Permanent">Permanent</option>
                      <option value="Contract">Contract</option>
                      <option value="Temporary">Temporary</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Employment Type <span className="text-red-500">*</span></label>
                    <select name="employmentTypeId" value={formData.employmentTypeId || ""} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all">
                      <option value="">-- Select Employment Type --</option>
                      {masterData.employmentTypes && masterData.employmentTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Daily / Monthly (Wage Type) <span className="text-red-500">*</span></label>
                    <select name="workingType" value={formData.workingType || "monthly"} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all">
                      <option value="daily">Daily</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">PF Eligibility</label>
                    <select name="providentFundNumber" value={formData.providentFundNumber || ""} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all">
                      <option value="">-- Select PF Eligibility --</option>
                      {masterData?.pfDetails?.map((pf) => <option key={pf.id} value={pf.id}>{pf.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Joining <span className="text-red-500">*</span></label>
                    <input type="date" name="dateOfJoining" value={formData.dateOfJoining} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Rejoining</label>
                    <input type="date" name="dateOfRejoining" value={formData.dateOfRejoining || ""} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Experience</label>
                    <input type="text" value={formatExperience(formData.experience)} readOnly className="w-full border rounded-lg px-3 py-2.5 bg-gray-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Confirmation Date</label>
                    <input type="date" name="confirmationDate" value={formData.confirmationDate} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Probation Period (months)</label>
                    <input type="number" name="probationPeriod" value={formData.probationPeriod} onChange={handleInputChange} min="0" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Retirement (Auto)</label>
                    <input type="date" value={retirementDate} disabled className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 font-medium" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Relieving Date</label>
                    <input type="date" name="relievingDate" value={formData.relievingDate || ""} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Reason for Leaving</label>
                    <textarea name="leavingReason" value={formData.leavingReason || ""} onChange={handleInputChange} rows={3} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Reporting Manager</label>
                    <select name="reportingManagerId" value={formData.reportingManagerId || ""} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all">
                      <option value="">-- Select Manager --</option>
                      {masterData?.managers?.filter((mgr) => !employee || mgr.id !== employee.id).map((mgr) => {
                        const displayName = mgr.fullName || `${mgr.firstName || ""} ${mgr.lastName || ""}`.trim();
                        return <option key={mgr.id} value={mgr.id}>{displayName} ({mgr.employeeCode || "N/A"})</option>;
                      })}
                    </select>
                    {(!masterData.managers || masterData.managers.length === 0) && (
                      <p className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                        ⚠️ Add at least one employee first to assign reporting managers
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Work Location</label>
                    <input type="text" name="workLocation" value={formData.workLocation} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Employment Status <span className="text-red-500">*</span></label>
                    <select name="employmentStatus" value={formData.employmentStatus} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all">
                      <option value="Active">Active</option>
                      <option value="Resigned">Resigned</option>
                      <option value="Terminated">Terminated</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                </div>

                {/* Reference Person */}
                <div>
                  <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                    <span className="text-2xl">👤</span>
                    <h3 className="text-lg font-bold text-slate-800">Reference Person</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Reference Person Name</label>
                      <input type="text" name="referencePersonName" value={formData.referencePersonName} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Reference Person Contact</label>
                      <input type="tel" name="referencePersonContact" value={formData.referencePersonContact} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: Shift & Attendance ──────────────────── */}
            {activeTab === 3 && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Shift Type</label>
                    <select name="shiftTypeId" value={formData.shiftTypeId} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all">
                      <option value="">-- Select Shift --</option>
                      {masterData.shiftTypes.map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Leave Policy</label>
                    <select name="leavePolicyId" value={formData.leavePolicyId} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all">
                      <option value="">-- Select Policy --</option>
                      {masterData.leavePolicies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Weekly Off</label>
                    <select name="weeklyOff" value={formData.weeklyOff} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all">
                      {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">
                      <input type="checkbox" id="isOvertimeApplicable" name="isOvertimeApplicable" checked={formData.isOvertimeApplicable} onChange={handleInputChange} className="w-5 h-5 text-blue-600 rounded cursor-pointer focus:ring-2 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Is Overtime Applicable</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">
                      <input type="checkbox" id="isLeaveApplicable" name="isLeaveApplicable" checked={formData.isLeaveApplicable} onChange={handleInputChange} className="w-5 h-5 text-blue-600 rounded cursor-pointer focus:ring-2 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Is Leave Applicable</span>
                    </label>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                    <span className="text-2xl">🔐</span>
                    <h3 className="text-lg font-bold text-slate-800">Biometric Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Biometric Device</label>
                      <select name="biometricDeviceId" value={formData.biometricDeviceId} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all">
                        <option value="">-- Select Device --</option>
                        {masterData.biometricDevices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Biometric Enrollment ID</label>
                      <input type="text" name="biometricEnrollmentId" value={formData.biometricEnrollmentId} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: Salary & Bank ───────────────────────── */}
            {activeTab === 4 && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                    <span className="text-2xl">💼</span>
                    <h3 className="text-lg font-bold text-slate-800">Salary Information</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Basic Salary</label>
                      <input type="number" name="basicSalary" value={formData.basicSalary} onChange={handleInputChange} min="0" step="0.01" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                    <span className="text-2xl">🏦</span>
                    <h3 className="text-lg font-bold text-slate-800">Bank Details</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Bank Name</label>
                      <input type="text" name="bankName" value={formData.bankName} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Bank Account Number</label>
                      <input type="text" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">IFSC Code</label>
                      <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Bank Branch</label>
                      <input type="text" name="bankBranch" value={formData.bankBranch} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Mode</label>
                      <select name="paymentMode" value={formData.paymentMode} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all">
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                    <span className="text-2xl">📋</span>
                    <h3 className="text-lg font-bold text-slate-800">Statutory Information</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">UAN Number</label>
                      <input type="text" name="uanNumber" value={formData.uanNumber} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">EPF Number</label>
                      <input type="text" name="epfNumber" value={formData.epfNumber || ''} onChange={handleInputChange} placeholder="e.g. TN/12345/67890" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">ESI Number</label>
                      <input type="text" name="esiNumber" value={formData.esiNumber} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 5: Transport ───────────────────────────── */}
            {activeTab === 5 && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">
                    <input type="checkbox" id="isTransportRequired" name="isTransportRequired" checked={formData.isTransportRequired} onChange={handleInputChange} className="w-5 h-5 text-blue-600 rounded cursor-pointer focus:ring-2 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-slate-700">Is Transport Required</span>
                  </label>
                </div>
                {formData.isTransportRequired && (
                  <div>
                    <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                      <span className="text-2xl">🚌</span>
                      <h3 className="text-lg font-bold text-slate-800">Transport Details</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Bus</label>
                        <select name="busId" value={formData.busId} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all">
                          <option value="">-- Select Bus --</option>
                          {masterData.buses && masterData.buses.map((bus) => <option key={bus.id} value={bus.id}>{bus.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Pickup Point</label>
                        <input type="text" name="pickupPoint" value={formData.pickupPoint} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ── Footer Navigation ─────────────────────────────── */}
          <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-8 py-5 border-t-2 border-slate-200 flex items-center justify-between">
            <div>
              {activeTab > 0 && (
                <button
                  type="button" onClick={handlePreviousTab}
                  className="px-6 py-2.5 border-2 border-slate-400 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-all flex items-center gap-2"
                >
                  <span>←</span> Previous
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button" onClick={onClose}
                className="px-6 py-2.5 border-2 border-slate-400 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              {activeTab < tabs.length - 1 ? (
                <button
                  type="button" onClick={handleNextTab}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  Next <span>→</span>
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <span>✓</span> {employee ? "Update Employee" : "Save Employee"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeFormModal;