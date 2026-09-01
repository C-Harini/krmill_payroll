import React, { useState, useEffect } from 'react';
import LeaveRequestModal from './LeaveRequestModal';
import LeaveRequestDetailModal from './LeaveRequestDetailModal';
import { jwtDecode } from "jwt-decode";
import { apiRequest } from '../utils/apiCaller';




// const apiRequest = async (url, options = {}) => {
//     const token = sessionStorage.getItem('token');
//     const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

//     const defaultOptions = { 
//         headers: { 
//             'Content-Type': 'application/json', 
//             'Authorization': `Bearer ${token}` 
//         } 
//     };
//     const response = await fetch(`${baseURL}${url}`, { ...defaultOptions, ...options });
//     if (!response.ok) {
//         const err = await response.json();
//         throw new Error(err.message || `API Error: ${response.statusText}`);
//     }
//     return response.json();
// };




const LeaveRequestManagement = () => {
    // State
    // const [employeeId, setEmployeeId] = useState(1); // TODO: Get from auth context
    // const [companyId, setCompanyId] = useState(1); // TODO: Get from auth context

    
    const [leaveSummary, setLeaveSummary] = useState(null);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [teamCalendar, setTeamCalendar] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [statusFilter, setStatusFilter] = useState('All');
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [editRequestData, setEditRequestData] = useState(null);


    const token = sessionStorage.getItem("token");
    let employeeId = null;
    let companyId = null;
    
    if (token) {
        try {
            const decoded = jwtDecode(token);
            employeeId = decoded.employeeId || decoded.id;
            companyId = decoded.companyId;
        } catch (err) {
            console.error("Error decoding token:", err);
        }
    }

// if (!token) {
//   return (
//     <div className="flex items-center justify-center min-h-screen">
//       <p className="text-slate-600 text-lg">User not logged in</p>
//     </div>
//   );
// }


const fetchDashboardData = async () => {
  setLoading(true);
  setError(null);

  try {
    const requestsData = await apiRequest(`/leave-requests`);

    console.log("Leave API response:", requestsData);

    // ✅ handle both response formats
    const list = Array.isArray(requestsData)
      ? requestsData
      : requestsData.leaveRequests || [];

    setLeaveRequests(list);
  } catch (err) {
    console.error("Fetch error:", err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};


    // Fetch data
    useEffect(() => {
        fetchDashboardData();
    },[]);



    // Handlers
    const handleApplyLeave = () => {
        setIsApplyModalOpen(true);
    };

  const handleViewDetails = async (request) => {
    try {
        
        setSelectedRequest(request); // set the complete request object
        //console.log(request);
        setIsDetailModalOpen(true);
    } catch (err) {
        console.error('Error fetching leave request:', err);
        alert('Error fetching leave request');
    }
};


    const handleCancelRequest = async (requestId) => {
        if (!window.confirm('Are you sure you want to cancel this leave request?')) return;

        try {
            await apiRequest(`/leave-requests/${requestId}/cancel`, {
                method: 'POST',
                body: JSON.stringify({
                    cancelledBy: employeeId,
                    cancellationReason: 'Cancelled by employee'
                })
            });
            
            alert('Leave request cancelled successfully');
            fetchDashboardData();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleLeaveSubmitted = () => {
        setIsApplyModalOpen(false);
        setEditRequestData(null);
        fetchDashboardData();
    };

    const handleEditRequest = (request) => {
        setEditRequestData(request);
    };

    const handleDeleteRequest = async (requestId) => {
        if (!window.confirm('Are you sure you want to delete this draft?')) return;

        try {
            await apiRequest(`/leave-requests/${requestId}`, {
                method: 'DELETE',
                body: JSON.stringify({
                    deletedBy: employeeId
                })
            });
            
            alert('Draft deleted successfully');
            fetchDashboardData();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    // Filter requests
    const filteredRequests = leaveRequests.filter(req => {
        if (req.status === 'Cancelled') return false;
        if (statusFilter === 'All') return true;
        return req.status === statusFilter;
    });

    // Calculate status counts
    const statusCounts = {
        All: leaveRequests.filter(r => r.status !== 'Cancelled').length,
        Draft: leaveRequests.filter(r => r.status === 'Draft').length,
        Pending: leaveRequests.filter(r => r.status === 'Pending').length,
        Approved: leaveRequests.filter(r => r.status === 'Approved').length,
        Rejected: leaveRequests.filter(r => r.status === 'Rejected').length
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-2">
                        <span>🏖️</span> My Leaves
                    </h1>
                    <button 
                        onClick={handleApplyLeave}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    >
                        + Apply Leave
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg shadow-sm">
                        {error}
                    </div>
                )}

                {/* Leave Balance Cards */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">
                        Leave Balance ({new Date().getFullYear()})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {leaveSummary?.summary?.map((item, index) => (
                            <div key={index} className="bg-white rounded-xl shadow-md p-6 border-t-4 border-blue-500 hover:shadow-lg transition-shadow duration-200">
                                <div className="text-3xl mb-3">
                                    {item.leaveType.name.includes('Casual') ? '📅' :
                                     item.leaveType.name.includes('Sick') ? '🤒' :
                                     item.leaveType.name.includes('Earned') ? '🏠' : '🏖️'}
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg mb-3">{item.leaveType.name}</h3>
                                <div className="mb-4">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-3xl font-bold text-blue-600">{item.available}</span>
                                        <span className="text-sm text-slate-500">/ {item.allocated}</span>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Available Days</p>
                                </div>
                                {item.pending > 0 && (
                                    <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded">
                                        <p className="text-xs text-amber-700 font-semibold">
                                            {item.pending} days pending approval
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Leave Requests Section */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">My Leave Requests</h2>
                    
                    {/* Status Filter Buttons */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        {Object.entries(statusCounts).map(([status, count]) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                                    statusFilter === status
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                                        : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-blue-400'
                                }`}
                            >
                                {status} {count > 0 && `(${count})`}
                            </button>
                        ))}
                    </div>

                    {/* Requests Table */}
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                        <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold">Dates</th>
                                        <th className="px-6 py-4 text-center text-sm font-semibold">Days</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold">Reason</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                                        <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRequests.length > 0 ? (
                                        filteredRequests.map((request, index) => (
                                            <tr 
                                                key={request.id}
                                                className={`border-b border-slate-200 hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                                            >
                                                <td className="px-6 py-4 text-sm">
                                                    <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                                        {request.LeaveType?.name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-700">
                                                    <div>
                                                        {new Date(request.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(request.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </div>
                                                    {request.leaveCategory === 'Half Day' && (
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            ({request.halfDayType})
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-slate-900">
                                                    {request.totalDays}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-700">
                                                    <div className="max-w-xs truncate">
                                                        {request.reason?.substring(0, 50)}
                                                        {request.reason?.length > 50 && '...'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                                        request.status === 'Approved'
                                                            ? 'bg-green-100 text-green-700 border border-green-300'
                                                            : request.status === 'Rejected'
                                                            ? 'bg-red-100 text-red-700 border border-red-300'
                                                            : request.status === 'Pending'
                                                            ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                                                    }`}>
                                                        {request.status === 'Approved' && '✓'}
                                                        {request.status === 'Rejected' && '✕'}
                                                        {request.status === 'Pending' && '⏳'}
                                                        {' '}{request.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={() => handleViewDetails(request)}
                                                            title="View Details"
                                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                                                        >
                                                            👁️
                                                        </button>
                                                        {request.status === 'Draft' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleEditRequest(request)}
                                                                    title="Edit Draft"
                                                                    className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors duration-200"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteRequest(request.id)}
                                                                    title="Delete Draft"
                                                                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </>
                                                        )}
                                                        {(request.status === 'Pending' || request.status === 'Approved') && (
                                                            <button 
                                                                onClick={() => handleCancelRequest(request.id)}
                                                                title="Cancel"
                                                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                                                            >
                                                                ❌
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                                No leave requests found for this status
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Team Calendar */}
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">
                        📅 Team Calendar - Who's on Leave This Week?
                    </h2>
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        {teamCalendar.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {teamCalendar.map(leave => (
                                    <div 
                                        key={leave.id} 
                                        className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg hover:shadow-md transition-shadow duration-200"
                                    >
                                        <p className="text-sm font-semibold text-blue-600 mb-2">
                                            {new Date(leave.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </p>
                                        <p className="font-bold text-slate-900">
                                            {leave.Employee?.firstName}
                                        </p>
                                        <p className="text-xs text-slate-600 mt-1">
                                            {leave.LeaveType?.name}
                                        </p>
                                        {leave.status === 'Pending' && (
                                            <span className="inline-block mt-2 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold">
                                                Pending
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-slate-500 text-lg">No team members on leave this week</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {(isApplyModalOpen || editRequestData) && (
                <LeaveRequestModal
                    employeeId={employeeId}
                    companyId={companyId}
                    editData={editRequestData}
                    onClose={() => {
                        setIsApplyModalOpen(false);
                        setEditRequestData(null);
                    }}
                    onSubmit={handleLeaveSubmitted}
                />
            )}

            {isDetailModalOpen && selectedRequest && (
                <LeaveRequestDetailModal
                    requestId={selectedRequest.id}
                    onClose={() => {
                        setIsDetailModalOpen(false);
                        setSelectedRequest(null);
                    }}
                    onUpdate={fetchDashboardData}
                />
            )}
        </div>
    );
};

export default LeaveRequestManagement;