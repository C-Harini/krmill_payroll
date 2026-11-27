import React from "react";
import { Link } from "react-router-dom";

const WorkloadPlaceholder = ({ title, category = "Module", description }) => {
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs font-medium text-slate-500">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              to="/workload-dashboard/workload/master"
              className="hover:text-blue-600 transition"
            >
              Dashboard
            </Link>
          </li>
          <li>/</li>
          <li className="text-slate-600">{category}</li>
          <li>/</li>
          <li className="text-blue-700 font-semibold">{title}</li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <span className="text-2xl">🚧</span> {title}
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          HR2 Workload Management Module &bull; {category}
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-8 max-w-3xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-2xl flex-shrink-0">
            ⏳
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Under Development &bull; Phase 2 Target
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {title} is Coming Soon
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              {description ||
                `This screen is queued for implementation in the next phase of the HR2 Workload Management Module. Currently, Phase 1 focuses exclusively on the Workload Master template.`}
            </p>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Planned Functionality for this page:
              </h3>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>Departmental & designation linkage</li>
                <li>Real-time workload calculation & entry sheets</li>
                <li>Production unit & operator allocation grids</li>
                <li>Exportable departmental summary reports</li>
              </ul>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/workload-dashboard/workload/master"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-all shadow-sm flex items-center gap-2"
              >
                <span>⬅️</span>
                <span>Return to Workload Master</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkloadPlaceholder;
