import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { toast } from "react-toastify";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [devResetLink, setDevResetLink] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      return toast.error("Please enter your email address");
    }

    setLoading(true);
    setDevResetLink("");
    try {
      const res = await API.post("auth/forgot-password", { email });
      toast.success(res.data.msg || "Password reset link sent!");
      
      // If we are in dev mode, the backend might send back the resetLink
      if (res.data.resetLink) {
        setDevResetLink(res.data.resetLink);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white relative overflow-hidden flex items-center justify-center w-full">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: "2s" }}></div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 md:p-10">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 8a6 6 0 11-12 0 6 6 0 0112 0zm-2 2h-4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Forgot Password</h1>
            <p className="text-slate-600 text-sm">Enter your email address to receive a password reset link</p>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  type="email"
                  placeholder="john@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all disabled:opacity-50"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 px-4 rounded-lg font-semibold text-white transition-all duration-200 transform ${
                loading
                  ? "bg-gradient-to-r from-slate-400 to-slate-500 cursor-not-allowed opacity-70"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-95 shadow-lg"
              }`}
            >
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>
          </form>

          {/* Dev Mode Reset Link Info */}
          {devResetLink && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <p className="font-semibold mb-1">🛠️ Development Reset Link:</p>
              <a 
                href={devResetLink} 
                target="_blank" 
                rel="noreferrer" 
                className="underline break-all text-blue-600 hover:text-blue-800"
              >
                {devResetLink}
              </a>
              <p className="mt-2 text-xs text-amber-600 font-medium">Click this link directly to reset the password.</p>
            </div>
          )}

          {/* Back to Login */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
