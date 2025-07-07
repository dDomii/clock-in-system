import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserManagement } from './UserManagement';
import { OvertimeApproval } from './OvertimeApproval';
import { PayrollReports } from './PayrollReports';
import { LiveReports } from './LiveReports';
import { 
  Users, 
  Clock, 
  DollarSign, 
  Settings,
  Activity,
  Calendar
} from 'lucide-react';

type TabType = 'users' | 'overtime' | 'payroll' | 'live-reports';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingOvertime: 0,
    thisWeekPayroll: 0
  });
  const { token } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch users
      const usersResponse = await fetch('http://localhost:3001/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const users = await usersResponse.json();
      
      // Fetch overtime requests
      const overtimeResponse = await fetch('http://localhost:3001/api/overtime-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const overtimeRequests = await overtimeResponse.json();

      setStats({
        totalUsers: users.length,
        activeUsers: users.filter((u: any) => u.active).length,
        pendingOvertime: overtimeRequests.length,
        thisWeekPayroll: 0 // This would be calculated based on current week
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const tabs = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'overtime', label: 'Overtime Approval', icon: Clock },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'live-reports', label: 'Live Reports', icon: Activity }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage users, approve overtime, and generate payroll reports</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeUsers}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Settings className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Overtime</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pendingOvertime}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-purple-600">₱{stats.thisWeekPayroll}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'overtime' && <OvertimeApproval />}
          {activeTab === 'payroll' && <PayrollReports />}
          {activeTab === 'live-reports' && <LiveReports />}
        </div>
      </div>
    </div>
  );
}