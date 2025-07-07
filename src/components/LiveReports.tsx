import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Clock, User, MapPin, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface ActiveUser {
  id: number;
  username: string;
  department: string;
  clock_in: string;
}

const DEPARTMENTS = [
  'Human Resource',
  'Marketing', 
  'Finance',
  'Account Management',
  'System Automation',
  'Sales',
  'Training',
  'IT Department'
];

export function LiveReports() {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set(DEPARTMENTS));
  const { token } = useAuth();

  useEffect(() => {
    fetchActiveUsers();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      fetchActiveUsers();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(timer);
  }, []);

  const fetchActiveUsers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/active-users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setActiveUsers(data);
    } catch (error) {
      console.error('Error fetching active users:', error);
    }
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

  const calculateCurrentTime = (clockIn: string) => {
    const clockInTime = new Date(clockIn);
    const diff = currentTime.getTime() - clockInTime.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const isOvertimeHours = (clockIn: string) => {
    const clockInTime = new Date(clockIn);
    const shiftEnd = new Date(clockInTime);
    shiftEnd.setHours(15, 30, 0, 0); // 3:30 PM
    return currentTime > shiftEnd;
  };

  const getOvertimeTime = (clockIn: string) => {
    const clockInTime = new Date(clockIn);
    const shiftEnd = new Date(clockInTime);
    shiftEnd.setHours(15, 30, 0, 0); // 3:30 PM
    
    if (currentTime > shiftEnd) {
      const diff = currentTime.getTime() - shiftEnd.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return { hours, minutes, seconds };
    }
    return { hours: 0, minutes: 0, seconds: 0 };
  };

  const formatTimeDisplay = (time: { hours: number; minutes: number; seconds: number }) => {
    return `${time.hours}h ${time.minutes}m ${time.seconds}s`;
  };

  const toggleDepartment = (department: string) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(department)) {
      newExpanded.delete(department);
    } else {
      newExpanded.add(department);
    }
    setExpandedDepartments(newExpanded);
  };

  const groupedUsers = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = activeUsers.filter(user => user.department === dept);
    return acc;
  }, {} as Record<string, ActiveUser[]>);

  const totalActiveUsers = activeUsers.length;
  const usersInOvertime = activeUsers.filter(user => isOvertimeHours(user.clock_in)).length;
  const totalHoursWorked = activeUsers.reduce((sum, user) => {
    const time = calculateCurrentTime(user.clock_in);
    return sum + time.hours + (time.minutes / 60) + (time.seconds / 3600);
  }, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live Reports</h2>
          <p className="text-gray-600">Real-time tracking of active employees by department</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Last updated</p>
          <p className="text-lg font-semibold text-gray-900">{formatCurrentTime()}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Currently Active</p>
              <p className="text-2xl font-bold text-green-600">{totalActiveUsers}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Overtime</p>
              <p className="text-2xl font-bold text-orange-600">{usersInOvertime}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-blue-600">{totalHoursWorked.toFixed(1)}h</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Estimated Pay</p>
              <p className="text-2xl font-bold text-purple-600">₱{(totalHoursWorked * 25).toFixed(0)}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <span className="text-purple-600 font-bold text-lg">₱</span>
            </div>
          </div>
        </div>
      </div>

      {/* Department-wise Active Users */}
      {activeUsers.length > 0 ? (
        <div className="space-y-4">
          {DEPARTMENTS.map((department) => {
            const deptUsers = groupedUsers[department];
            if (deptUsers.length === 0) return null;

            const isExpanded = expandedDepartments.has(department);
            const deptOvertimeUsers = deptUsers.filter(user => isOvertimeHours(user.clock_in)).length;

            return (
              <div key={department} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleDepartment(department)}
                  className="w-full px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{department}</h3>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                      {deptUsers.length} active
                    </span>
                    {deptOvertimeUsers > 0 && (
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm font-medium">
                        {deptOvertimeUsers} overtime
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>

                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {deptUsers.map((user) => {
                      const currentTime = calculateCurrentTime(user.clock_in);
                      const inOvertime = isOvertimeHours(user.clock_in);
                      const overtimeTime = getOvertimeTime(user.clock_in);
                      
                      return (
                        <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-lg ${inOvertime ? 'bg-orange-100' : 'bg-green-100'}`}>
                                <User className={`w-5 h-5 ${inOvertime ? 'text-orange-600' : 'text-green-600'}`} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{user.username}</h4>
                                <p className="text-sm text-gray-500">Employee ID: {user.id}</p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="flex items-center gap-6">
                                <div className="text-center">
                                  <p className="text-sm text-gray-500">Clock In</p>
                                  <p className="font-semibold text-gray-900">{formatTime(user.clock_in)}</p>
                                </div>
                                
                                <div className="text-center">
                                  <p className="text-sm text-gray-500">Time Worked</p>
                                  <p className="font-semibold text-blue-600">{formatTimeDisplay(currentTime)}</p>
                                </div>
                                
                                <div className="text-center">
                                  <p className="text-sm text-gray-500">Status</p>
                                  {inOvertime ? (
                                    <div>
                                      <p className="font-semibold text-orange-600">Overtime</p>
                                      <p className="text-xs text-orange-500">{formatTimeDisplay(overtimeTime)}</p>
                                    </div>
                                  ) : (
                                    <p className="font-semibold text-green-600">Regular</p>
                                  )}
                                </div>
                                
                                <div className="text-center">
                                  <p className="text-sm text-gray-500">Est. Pay</p>
                                  <p className="font-semibold text-purple-600">
                                    ₱{((currentTime.hours + (currentTime.minutes / 60) + (currentTime.seconds / 3600)) * 25).toFixed(0)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {inOvertime && (
                            <div className="mt-3 bg-orange-50 p-3 rounded-lg border border-orange-200">
                              <p className="text-sm text-orange-800">
                                <strong>Overtime Alert:</strong> This employee has been working for {formatTimeDisplay(overtimeTime)} past shift hours.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Users</h3>
          <p className="text-gray-500">No employees are currently clocked in.</p>
        </div>
      )}
    </div>
  );
}