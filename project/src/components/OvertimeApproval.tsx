import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Check, X, MessageSquare } from 'lucide-react';

interface OvertimeRequest {
  id: number;
  username: string;
  department: string;
  clock_in: string;
  clock_out: string;
  overtime_note: string;
  created_at: string;
}

export function OvertimeApproval() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    fetchOvertimeRequests();
  }, []);

  const fetchOvertimeRequests = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/overtime-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching overtime requests:', error);
    }
  };

  const handleApproval = async (requestId: number, approved: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/overtime-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved }),
      });

      if (response.ok) {
        fetchOvertimeRequests();
      }
    } catch (error) {
      console.error('Error approving overtime:', error);
    }
    setLoading(false);
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateOvertimeHours = (clockIn: string, clockOut: string) => {
    const clockInTime = new Date(clockIn);
    const clockOutTime = new Date(clockOut);
    const shiftEnd = new Date(clockInTime);
    shiftEnd.setHours(15, 30, 0, 0);

    if (clockOutTime > shiftEnd) {
      const overtime = (clockOutTime.getTime() - Math.max(shiftEnd.getTime(), clockInTime.getTime())) / (1000 * 60 * 60);
      return Math.max(0, overtime - 0.5).toFixed(1); // Subtract 30 minutes grace period
    }
    return '0.0';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Overtime Approval</h2>
        <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
          {requests.length} Pending Requests
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
          <p className="text-gray-500">All overtime requests have been processed.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{request.username}</h3>
                    <p className="text-sm text-gray-500">{request.department}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Submitted</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(request.created_at)}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Clock In</p>
                  <p className="font-medium text-gray-900">{formatTime(request.clock_in)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Clock Out</p>
                  <p className="font-medium text-gray-900">{formatTime(request.clock_out)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Overtime Hours</p>
                  <p className="font-medium text-blue-600">
                    {calculateOvertimeHours(request.clock_in, request.clock_out)}h
                  </p>
                </div>
              </div>

              {request.overtime_note && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Reason for Overtime</span>
                  </div>
                  <p className="text-sm text-gray-700">{request.overtime_note}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => handleApproval(request.id, false)}
                  disabled={loading}
                  className="flex-1 bg-red-50 text-red-700 py-2 px-4 rounded-lg font-medium hover:bg-red-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => handleApproval(request.id, true)}
                  disabled={loading}
                  className="flex-1 bg-green-50 text-green-700 py-2 px-4 rounded-lg font-medium hover:bg-green-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}