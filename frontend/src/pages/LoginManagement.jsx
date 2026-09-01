import { useNavigate } from "react-router-dom";

import { useState } from "react";
import API from "../api";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import Particles from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const adminRoles = ["Admin", "Super Admin", "Department Admin"];

  const handleLogin = async () => {
    if (!identifier || !password) {
      return toast.error("Enter email/userNumber & password");
    }

    setLoading(true);
    try {
      const res = await API.post("auth/login", { identifier, password });
      console.log("login response", res);
      const { token } = res.data;

       sessionStorage.setItem("token", token);
      localStorage.setItem("authToken", token);
      localStorage.setItem("token", token);
      try {
        const decoded = jwtDecode(token);
        if (decoded.companyId) {
          localStorage.setItem("companyId", decoded.companyId.toString());
        } else {
          localStorage.setItem("companyId", "1");
        }
      } catch (err) {
        localStorage.setItem("companyId", "1");
      }

      setTimeout(() => {
        const role = jwtDecode(token).role;
        navigate("/dashboard");
        // navigate(adminRoles.includes(role) ? "/dashboard" : "/companies");
      }, 0);
      toast.success("Login Success");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || "Login failed");
    } finally {
      setLoading(false);
    }
  };



  const particlesInit = async (main) => {
    await loadSlim(main);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white relative overflow-hidden flex items-center justify-center">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: "2s" }}></div>

      {/* Particles Background */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          background: { color: { value: "transparent" } },
          fpsLimit: 60,
          particles: {
            number: { value: 40, density: { enable: true, value_area: 800 } },
            color: { value: ["#2563eb", "#3b82f6", "#60a5fa"] },
            shape: { type: "circle" },
            opacity: { value: 0.15, random: true },
            size: { value: 3, random: true },
            move: {
              enable: true,
              speed: 0.3,
              direction: "none",
              random: true,
              out_mode: "out",
            },
          },
          interactivity: {
            events: {
              onhover: { enable: true, mode: "repulse" },
              onclick: { enable: true, mode: "push" },
            },
          },
          detectRetina: true,
        }}
        className="absolute inset-0"
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md px-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 md:p-10">
              {/* Header */}
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 mb-4">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
                <p className="text-slate-600 text-sm">Sign in to access your payroll account</p>
              </div>

              {/* Form */}
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                {/* Email/User Number Input */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email or Employee Number
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="john@company.com or EMP001"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      disabled={loading}
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="w-full pl-11 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14z" />
                          <path fillRule="evenodd" d="M2 10a8 8 0 1114.07-1.93l1.415 1.415A10 10 0 002 10z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2.5 px-4 rounded-lg font-semibold text-white transition-all duration-200 transform ${
                    loading
                      ? "bg-gradient-to-r from-slate-400 to-slate-500 cursor-not-allowed opacity-70"
                      : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-95 shadow-lg hover:shadow-xl"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              {/* Footer Note */}
              <div className="pt-6 border-t border-slate-200 text-center">
                <p className="text-xs text-slate-600">
                  <span className="inline-block mr-1">🔒</span>
                  Your credentials are encrypted and secure
                </p>
              </div>
            </div>

        {/* Additional Info */}
        <p className="text-center text-slate-600 text-sm mt-6">
          © 2025 Payroll Management System. All rights reserved.
        </p>
      </div>
    </div>
  );
}