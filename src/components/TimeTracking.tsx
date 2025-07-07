import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Play, Square, MessageSquare, AlertCircle, Home } from 'lucide-react';

interface TimeEntry {
  id: number;
  clock_in: string;
  clock_out: string | null;
  overtime_requested: boolean;
  overtime_note: string | null;
}

export function TimeTracking() {
  const [todayEntry, setTodayEntry] = useState<TimeEntry | null>(null);
  const [overtimeNote, setOvertimeNote] = useState('');
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { token, user } = useAuth();

  useEffect(() => {
    fetchTodayEntry();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTodayEntry = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/today-entry', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTodayEntry(data);
    } catch (error) {
      console.error('Error fetching today entry:', error);
    }
  };

  const handleClockIn = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/clock-in', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        fetchTodayEntry();
      } else {
        alert(data.message || 'Failed to clock in');
      }
    } catch (error) {
      console.error('Clock in error:', error);
      alert('Failed to clock in');
    }
    setIsLoading(false);
  };

  const handleClockOut = async () => {
    const now = new Date();
    const shiftEndTime = new Date();
    shiftEndTime.setHours(15, 30, 0, 0); // 3:30 PM

    // Check if it's after shift hours (potential overtime)
    if (now > shiftEndTime) {
      const timeDiff = now.getTime() - shiftEndTime.getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      
      // If more than 30 minutes after shift end, show overtime modal
      if (minutesDiff > 30) {
        setShowOvertimeModal(true);
        return;
      }
    }

    await performClockOut();
  };

  const performClockOut = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/clock-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ overtimeNote }),
      });
      const data = await response.json();
      
      if (data.success) {
        fetchTodayEntry();
        setShowOvertimeModal(false);
        setOvertimeNote('');
        
        if (data.overtimeRequested) {
          alert('Overtime request submitted for admin approval!');
        }
      } else {
        alert(data.message || 'Failed to clock out');
      }
    } catch (error) {
      console.error('Clock out error:', error);
      alert('Failed to clock out');
    }
    setIsLoading(false);
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const calculateWorkedTime = () => {
    if (!todayEntry?.clock_in || !todayEntry?.clock_out) return { hours: 0, minutes: 0, seconds: 0 };
    
    const clockIn = new Date(todayEntry.clock_in);
    const clockOut = new Date(todayEntry.clock_out);
    const diff = clockOut.getTime() - clockIn.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const calculateCurrentWorkedTime = () => {
    if (!todayEntry?.clock_in || todayEntry?.clock_out) return { hours: 0, minutes: 0, seconds: 0 };
    
    const clockIn = new Date(todayEntry.clock_in);
    const diff = currentTime.getTime() - clockIn.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const isAfterShiftHours = () => {
    const now = new Date();
    const shiftEnd = new Date();
    shiftEnd.setHours(15, 30, 0, 0);
    return now > shiftEnd;
  };

  const getOvertimeTime = () => {
    if (!isAfterShiftHours()) return { hours: 0, minutes: 0, seconds: 0 };
    const now = new Date();
    const shiftEnd = new Date();
    shiftEnd.setHours(15, 30, 0, 0);
    const diff = Math.max(0, now.getTime() - shiftEnd.getTime());
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const isLateClockIn = () => {
    if (!todayEntry?.clock_in) return false;
    const clockIn = new Date(todayEntry.clock_in);
    const shiftStart = new Date(clockIn);
    shiftStart.setHours(7, 0, 0, 0); // 7:00 AM
    return clockIn > shiftStart;
  };

  const getLateTime = () => {
    if (!todayEntry?.clock_in || !isLateClockIn()) return { hours: 0, minutes: 0, seconds: 0 };
    const clockIn = new Date(todayEntry.clock_in);
    const shiftStart = new Date(clockIn);
    shiftStart.setHours(7, 0, 0, 0);
    const diff = clockIn.getTime() - shiftStart.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const formatTimeDisplay = (time: { hours: number; minutes: number; seconds: number }) => {
    return `${time.hours}h ${time.minutes}m ${time.seconds}s`;
  };

  const workedTime = todayEntry?.clock_out ? calculateWorkedTime() : calculateCurrentWorkedTime();
  const overtimeTime = getOvertimeTime();
  const lateTime = getLateTime();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-8">
          <Clock className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Time Tracking</h1>
            <p className="text-gray-600">Current Time: {formatCurrentTime()}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Current Status */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Status</h2>
            
            {todayEntry ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Clock In:</span>
                  <span className={`font-semibold ${isLateClockIn() ? 'text-red-600' : 'text-green-600'}`}>
                    {formatTime(todayEntry.clock_in)}
                    {isLateClockIn() && <span className="text-xs ml-1">(Late)</span>}
                  </span>
                </div>

                {isLateClockIn() && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800">
                      <strong>Late Clock In:</strong> {formatTimeDisplay(lateTime)} after 7:00 AM
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      This will be counted as undertime and cannot be compensated by overtime unless approved.
                    </p>
                  </div>
                )}
                
                {todayEntry.clock_out ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Clock Out:</span>
                      <span className="font-semibold text-red-600">
                        {formatTime(todayEntry.clock_out)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Time Worked:</span>
                      <span className="font-semibold text-blue-600">
                        {formatTimeDisplay(workedTime)}
                      </span>
                    </div>
                    {todayEntry.overtime_requested && (
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                          <p className="text-sm font-medium text-yellow-800">
                            Overtime Request Submitted
                          </p>
                        </div>
                        {todayEntry.overtime_note && (
                          <p className="text-sm text-yellow-700">
                            Note: {todayEntry.overtime_note}
                          </p>
                        )}
                        <p className="text-xs text-yellow-600 mt-1">
                          Awaiting admin approval
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-green-600 mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="font-semibold">Currently Clocked In</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Time Worked:</span>
                      <span className="font-semibold text-blue-600">
                        {formatTimeDisplay(workedTime)}
                      </span>
                    </div>
                    {isAfterShiftHours() && (
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <p className="text-sm font-medium text-orange-800">
                            Potential Overtime: {formatTimeDisplay(overtimeTime)}
                          </p>
                        </div>
                        <p className="text-xs text-orange-600 mt-1">
                          You may request overtime when clocking out
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No time entry for today</p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
            
            {!todayEntry && (
              <button
                onClick={handleClockIn}
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-4 px-6 rounded-xl font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                {isLoading ? 'Clocking In...' : 'Clock In'}
              </button>
            )}
            
            {todayEntry && !todayEntry.clock_out && (
              <button
                onClick={handleClockOut}
                disabled={isLoading}
                className="w-full bg-red-600 text-white py-4 px-6 rounded-xl font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <Square className="w-5 h-5" />
                {isLoading ? 'Clocking Out...' : 'Clock Out'}
              </button>
            )}

            {todayEntry && todayEntry.clock_out && (
              <div className="bg-gray-50 p-4 rounded-xl text-center">
                <p className="text-gray-600">You have completed your shift for today.</p>
              </div>
            )}
          </div>
        </div>

        {/* Shift Information */}
        <div className="mt-8 bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Shift Information</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Regular Hours:</span>
              <p className="font-semibold">7:00 AM - 3:30 PM</p>
            </div>
            <div>
              <span className="text-gray-600">Overtime Policy:</span>
              <p className="font-semibold">After 4:00 PM (+₱35/hour)</p>
            </div>
            <div>
              <span className="text-gray-600">Undertime:</span>
              <p className="font-semibold">Before 3:30 PM (-₱25/hour)</p>
            </div>
            <div>
              <span className="text-gray-600">Staff House:</span>
              <div className="flex items-center gap-2">
                {user?.staff_house ? (
                  <>
                    <Home className="w-4 h-4 text-blue-600" />
                    <p className="font-semibold text-blue-600">Yes (-₱250/week)</p>
                  </>
                ) : (
                  <p className="font-semibold text-gray-600">No</p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Note:</strong> Late clock-in (after 7:00 AM) is considered undertime and cannot be compensated by overtime unless overtime is specifically approved by admin.
            </p>
          </div>
        </div>
      </div>

      {/* Overtime Request Modal */}
      {showOvertimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-6 h-6 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Overtime Request</h3>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-orange-800 mb-2">
                <strong>You're clocking out after shift hours.</strong>
              </p>
              <p className="text-sm text-orange-700">
                Current overtime: {formatTimeDisplay(overtimeTime)} past 3:30 PM
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Overtime <span className="text-red-500">*</span>
              </label>
              <textarea
                value={overtimeNote}
                onChange={(e) => setOvertimeNote(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Please explain why you need to work overtime..."
                required
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOvertimeModal(false);
                  setOvertimeNote('');
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={performClockOut}
                disabled={!overtimeNote.trim() || isLoading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Processing...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}