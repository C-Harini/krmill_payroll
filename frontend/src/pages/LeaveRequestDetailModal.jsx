import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/apiCaller';

const LeaveRequestDetailModal = ({ requestId, onClose, onUpdate, isApprover = true, approverId = null }) => {
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [comments, setComments] = useState('');

    useEffect(() => {
        fetchRequestDetails();
    }, [requestId]);

    



    const fetchRequestDetails = async () => {
        setLoading(true);
        try {
            const data = await apiRequest(`/leave-requests/${requestId}`);
            setRequest(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!approverId) {
    alert('Approver not identified. Please login again.');
    return;
        }
        if (!window.confirm('Are you sure you want to approve this leave request?')) return;

        setActionLoading(true);
        try {
            await apiRequest(`/leave-requests/${requestId}/process`, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'approve',
                    approverId: approverId,
                    comments
                })
            });
            alert('Leave request approved successfully');
            onUpdate();
            onClose();
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!approverId) {
    alert('Approver not identified. Please login again.');
    return;
        }
        if (!comments.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }
        if (!window.confirm('Are you sure you want to reject this leave request?')) return;

        setActionLoading(true);
        try {
            await apiRequest(`/leave-requests/${requestId}/process`, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'reject',
                    approverId: approverId,
                    comments
                })
            });
            alert('Leave request rejected');
            onUpdate();
            onClose();
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'Approved': return '✅';
            case 'Rejected': return '❌';
            case 'Pending': return '⏳';
            case 'Cancelled': return '🚫';
            default: return '📝';
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-slate-600">Loading details...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8">
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
                        {error || 'Request not found'}
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-full px-6 py-2 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors duration-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    // const canApprove = isApprover && request.status === 'Pending';
    const currentApproval = request.LeaveApprovals?.find(
  (a) =>
    a.approverId === approverId &&
    a.status === 'Pending' &&
    a.approverLevel === request.currentApprovalLevel
);

const canApprove =  request.status === 'Pending' && !!currentApproval;


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white sticky top-0 z-10 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">📄 Leave Request Details</h2>
                    <button 
                        onClick={onClose}
                        className="text-white text-2xl font-bold hover:bg-blue-800 rounded-lg p-2 transition-colors duration-200"
                    >
                        ×
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-8 space-y-6">
                    {/* Employee Information */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-blue-200">
                            👤 Employee Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Name</p>
                                <p className="text-slate-900 font-semibold mt-1">
                                    {request.Employee?.firstName}
                                </p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Employee Code</p>
                                <p className="text-slate-900 font-semibold mt-1">{request.Employee?.employeeCode}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Designation</p>
                                <p className="text-slate-900 font-semibold mt-1">{request.Employee?.designation || 'N/A'}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</p>
                                <p className="text-slate-900 font-semibold mt-1">{request.Employee?.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Leave Details */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-blue-200">
                            🏖️ Leave Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Leave Type</p>
                                <p className="text-slate-900 font-semibold mt-1">{request.LeaveType?.name}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</p>
                                <p className="text-slate-900 font-semibold mt-1">{request.leaveCategory}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">From Date</p>
                                <p className="text-slate-900 font-semibold mt-1">
                                    {new Date(request.startDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">To Date</p>
                                <p className="text-slate-900 font-semibold mt-1">
                                    {new Date(request.endDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Days</p>
                                <p className="text-slate-900 font-semibold mt-1">{request.totalDays} days</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</p>
                                <p className="mt-1">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                        request.status === 'Approved'
                                            ? 'bg-green-100 text-green-700 border border-green-300'
                                            : request.status === 'Rejected'
                                            ? 'bg-red-100 text-red-700 border border-red-300'
                                            : request.status === 'Pending'
                                            ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                                    }`}>
                                        {getStatusIcon(request.status)} {request.status}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 bg-slate-50 p-4 rounded-lg">
                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Applied On</p>
                            <p className="text-slate-900 font-semibold mt-1">
                                {request.appliedDate ? new Date(request.appliedDate).toLocaleString() : 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* Reason & Contact */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-blue-200">
                            💬 Reason & Contact
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-lg mb-4">
                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Reason</p>
                            <p className="text-slate-700 leading-relaxed">{request.reason}</p>
                        </div>
                        {request.contactDuringLeave && (
                            <div className="bg-slate-50 p-4 rounded-lg mb-4">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Contact</p>
                                <p className="text-slate-700">{request.contactDuringLeave}</p>
                            </div>
                        )}
                        {request.addressDuringLeave && (
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Address</p>
                                <p className="text-slate-700 leading-relaxed">{request.addressDuringLeave}</p>
                            </div>
                        )}
                    </div>

                    {/* Leave Balance */}
                    {request.LeaveAllocation && (
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-blue-200">
                                📊 Leave Balance
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-blue-600">
                                        {request.LeaveAllocation.allocatedLeaves}
                                    </p>
                                    <p className="text-sm font-semibold text-slate-600 mt-2">Allocated</p>
                                </div>
                                <div className="bg-orange-50 border-2 border-orange-200 p-6 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-orange-600">
                                        {request.LeaveAllocation.usedLeaves}
                                    </p>
                                    <p className="text-sm font-semibold text-slate-600 mt-2">Used</p>
                                </div>
                                <div className="bg-green-50 border-2 border-green-200 p-6 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-green-600">
                                        {request.LeaveAllocation.allocatedLeaves - request.LeaveAllocation.usedLeaves}
                                    </p>
                                    <p className="text-sm font-semibold text-slate-600 mt-2">Remaining</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Approval History */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-blue-200">
                            ✓ Approval History
                        </h3>
                        <div className="space-y-3">
                            {request.LeaveApprovals && request.LeaveApprovals.length > 0 ? (
                                request.LeaveApprovals.map((approval, index) => (
                                    <div 
                                        key={approval.id}
                                        className={`border-l-4 p-4 rounded-r-lg ${
                                            approval.status === 'Approved'
                                                ? 'border-green-500 bg-green-50'
                                                : approval.status === 'Rejected'
                                                ? 'border-red-500 bg-red-50'
                                                : approval.status === 'Pending'
                                                ? 'border-amber-500 bg-amber-50'
                                                : 'border-slate-500 bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="font-bold text-slate-900">
                                                    Level {approval.approverLevel} - {approval.approverRole}
                                                </p>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    {approval.Approver?.firstName}
                                                </p>
                                            </div>
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                                approval.status === 'Approved'
                                                    ? 'bg-green-100 text-green-700'
                                                    : approval.status === 'Rejected'
                                                    ? 'bg-red-100 text-red-700'
                                                    : approval.status === 'Pending'
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {approval.status}
                                            </span>
                                        </div>
                                        {approval.comments && (
                                            <p className="text-sm text-slate-700 italic mb-2">"{approval.comments}"</p>
                                        )}
                                        {approval.actionDate && (
                                            <p className="text-xs text-slate-500">
                                                {new Date(approval.actionDate).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="bg-slate-50 border-l-4 border-slate-300 p-4 rounded-r-lg text-slate-600">
                                    No approval history available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Section for Approver */}
                    {canApprove && (
                        <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-lg">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">⚡ Take Action</h3>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Comments
                                </label>
                                <textarea
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    rows="3"
                                    placeholder="Enter your comments (optional for approval, required for rejection)..."
                                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-700 resize-none"
                                />
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={handleApprove}
                                    disabled={actionLoading}
                                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    ✅ Approve
                                </button>
                                <button 
                                    onClick={handleReject}
                                    disabled={actionLoading}
                                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    ❌ Reject
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50 px-8 py-4 border-t-2 border-slate-200 sticky bottom-0">
                    <button 
                        onClick={onClose}
                        className="w-full px-6 py-2 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors duration-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LeaveRequestDetailModal;