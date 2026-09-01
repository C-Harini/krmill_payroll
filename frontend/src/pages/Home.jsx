import React, { useState, useEffect } from "react";
import API from "../api";

const Home = () => {
  const [activeEmployeeCount, setActiveEmployeeCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const companyId = localStorage.getItem("companyId");
        
        if (!companyId) {
          console.warn("No companyId found in localStorage");
          setLoading(false);
          return;
        }

        // Fetch employee count
        try {
          const empResponse = await API.get("/employees/count/active", {
            params: { companyId }
          });
          console.log("Employee count response:", empResponse.data);
          setActiveEmployeeCount(empResponse.data.count || 0);
        } catch (empError) {
          console.error("Error fetching employee count:", empError);
        }

        // Fetch department count
        try {
          const deptResponse = await API.get("/departments/count/active", {
            params: { companyId }
          });
          console.log("Department count response:", deptResponse.data);
          setDepartmentCount(deptResponse.data.count || 0);
        } catch (deptError) {
          console.error("Error fetching department count:", deptError);
        }
      } catch (error) {
        console.error("Error in fetchCounts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800">
        Welcome to Payroll Dashboard 👋
      </h1>

      <p className="mt-4 text-gray-600">
        You are successfully logged in. Use the navigation menu on the left to
        manage companies, employees, attendance, salary, and reports.
      </p>

      {/* Simple cards (optional) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white shadow rounded-lg p-5">
          <h2 className="text-lg font-semibold text-gray-700">Employees</h2>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {loading ? "..." : activeEmployeeCount}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-5">
          <h2 className="text-lg font-semibold text-gray-700">Departments</h2>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {loading ? "..." : departmentCount}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-5">
          <h2 className="text-lg font-semibold text-gray-700">Pending Leaves</h2>
          <p className="text-2xl font-bold text-red-600 mt-2">5</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
