import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Download, Calendar, DollarSign, FileText, AlertCircle, Edit2, Save, X } from 'lucide-react';

interface PayrollEntry {
  id: number;
  username: string;
  department: string;
  total_hours: number;
  overtime_hours: number;
  undertime_hours: number;
  base_salary: number;
  overtime_pay: number;
  undertime_deduction: number;
  staff_house_deduction: number;
  total_salary: number;
  week_start: string;
  week_end: string;
  clock_in_time: string;
  clock_out_time: string;
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

export function PayrollReports() {
  const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
  const [weekStart, setWeekStart] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingEntry, setEditingEntry] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<PayrollEntry>>({});
  const { token } = useAuth();

  useEffect(() => {
    const today = new Date();
    const currentWeekStart = getWeekStart(today);
    setWeekStart(currentWeekStart);
  }, []);

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  const generatePayslips = async () => {
    if (!weekStart) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:3001/api/payslips/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ weekStart }),
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.error) {
          setError(data.error);
        } else {
          fetchPayrollReport();
        }
      } else {
        setError(data.message || 'Failed to generate payslips');
      }
    } catch (error) {
      console.error('Error generating payslips:', error);
      setError('Failed to generate payslips');
    }
    setLoading(false);
  };

  const fetchPayrollReport = async () => {
    if (!weekStart) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/payroll-report?weekStart=${weekStart}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPayrollData(data);
    } catch (error) {
      console.error('Error fetching payroll report:', error);
    }
  };

  const handleEdit = (entry: PayrollEntry) => {
    setEditingEntry(entry.id);
    setEditData({
      clock_in_time: entry.clock_in_time ? new Date(entry.clock_in_time).toISOString().slice(0, 16) : '',
      clock_out_time: entry.clock_out_time ? new Date(entry.clock_out_time).toISOString().slice(0, 16) : '',
      total_hours: entry.total_hours,
      overtime_hours: entry.overtime_hours,
      undertime_hours: entry.undertime_hours,
      base_salary: entry.base_salary,
      overtime_pay: entry.overtime_pay,
      undertime_deduction: entry.undertime_deduction,
      staff_house_deduction: entry.staff_house_deduction
    });
  };

  const handleSave = async (entryId: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/payroll/${entryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clockIn: editData.clock_in_time,
          clockOut: editData.clock_out_time,
          totalHours: editData.total_hours,
          overtimeHours: editData.overtime_hours,
          undertimeHours: editData.undertime_hours,
          baseSalary: editData.base_salary,
          overtimePay: editData.overtime_pay,
          undertimeDeduction: editData.undertime_deduction,
          staffHouseDeduction: editData.staff_house_deduction
        }),
      });

      if (response.ok) {
        setEditingEntry(null);
        setEditData({});
        fetchPayrollReport();
      } else {
        alert('Failed to update payroll entry');
      }
    } catch (error) {
      console.error('Error updating payroll entry:', error);
      alert('Failed to update payroll entry');
    }
  };

  const handleCancel = () => {
    setEditingEntry(null);
    setEditData({});
  };

  const exportToCSV = () => {
    if (payrollData.length === 0) return;

    // Group by department
    const groupedData = DEPARTMENTS.reduce((acc, dept) => {
      acc[dept] = payrollData.filter(entry => entry.department === dept);
      return acc;
    }, {} as Record<string, PayrollEntry[]>);

    const headers = [
      'Department',
      'Employee',
      'Clock In',
      'Clock Out',
      'Total Hours',
      'Overtime Hours',
      'Undertime Hours',
      'Base Salary (₱)',
      'Overtime Pay (₱)',
      'Undertime Deduction (₱)',
      'Staff House Deduction (₱)',
      'Total Salary (₱)',
      'Week Start',
      'Week End'
    ];

    let csvContent = headers.join(',') + '\n';

    // Add data organized by department
    DEPARTMENTS.forEach(dept => {
      const deptEntries = groupedData[dept];
      if (deptEntries.length > 0) {
        // Add department header
        csvContent += `\n"${dept} Department"\n`;
        
        deptEntries.forEach(entry => {
          const row = [
            entry.department,
            entry.username,
            entry.clock_in_time || 'N/A',
            entry.clock_out_time || 'N/A',
            entry.total_hours,
            entry.overtime_hours,
            entry.undertime_hours,
            entry.base_salary,
            entry.overtime_pay,
            entry.undertime_deduction,
            entry.staff_house_deduction,
            entry.total_salary,
            entry.week_start,
            entry.week_end
          ];
          csvContent += row.map(field => `"${field}"`).join(',') + '\n';
        });
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payroll_report_${weekStart}.csv`;
    link.click();
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (timeString: string) => {
    if (!timeString) return '';
    return new Date(timeString).toISOString().slice(0, 16);
  };

  const totalSalary = payrollData.reduce((sum, entry) => sum + entry.total_salary, 0);
  const totalOvertime = payrollData.reduce((sum, entry) => sum + entry.overtime_pay, 0);
  const totalDeductions = payrollData.reduce((sum, entry) => sum + entry.undertime_deduction + entry.staff_house_deduction, 0);

  // Group payroll data by department
  const groupedPayrollData = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = payrollData.filter(entry => entry.department === dept);
    return acc;
  }, {} as Record<string, PayrollEntry[]>);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Payroll Management</h2>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Week Starting
            </label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={generatePayslips}
            disabled={loading || !weekStart}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {loading ? 'Generating...' : 'Generate Payslips'}
          </button>
          <button
            onClick={fetchPayrollReport}
            disabled={!weekStart}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Load Report
          </button>
          {payrollData.length > 0 && (
            <button
              onClick={exportToCSV}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {payrollData.length > 0 && (
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-blue-600">{payrollData.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Salary</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSalary)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-center">
              <p className="text-sm text-gray-600">Overtime Pay</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalOvertime)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Deductions</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDeductions)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Table by Department */}
      {payrollData.length > 0 ? (
        <div className="space-y-6">
          {DEPARTMENTS.map((department) => {
            const deptData = groupedPayrollData[department];
            if (deptData.length === 0) return null;

            const deptTotal = deptData.reduce((sum, entry) => sum + entry.total_salary, 0);

            return (
              <div key={department} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{department}</h3>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{deptData.length} employees</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(deptTotal)}</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Clock In/Out</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Hours</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Overtime</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Base Pay</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Overtime Pay</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Deductions</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {deptData.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-gray-900">{entry.username}</p>
                              <p className="text-sm text-gray-500">
                                {formatDate(entry.week_start)} - {formatDate(entry.week_end)}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {editingEntry === entry.id ? (
                              <div className="space-y-2">
                                <input
                                  type="datetime-local"
                                  value={editData.clock_in_time || ''}
                                  onChange={(e) => setEditData({ ...editData, clock_in_time: e.target.value })}
                                  className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                                />
                                <input
                                  type="datetime-local"
                                  value={editData.clock_out_time || ''}
                                  onChange={(e) => setEditData({ ...editData, clock_out_time: e.target.value })}
                                  className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                                />
                              </div>
                            ) : (
                              <div className="text-sm">
                                <p className="text-gray-900">In: {formatTime(entry.clock_in_time)}</p>
                                <p className="text-gray-600">Out: {formatTime(entry.clock_out_time)}</p>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {editingEntry === entry.id ? (
                              <div className="space-y-1">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editData.total_hours || 0}
                                  onChange={(e) => setEditData({ ...editData, total_hours: parseFloat(e.target.value) || 0 })}
                                  className="w-16 text-xs px-1 py-1 border border-gray-300 rounded text-right"
                                />
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editData.undertime_hours || 0}
                                  onChange={(e) => setEditData({ ...editData, undertime_hours: parseFloat(e.target.value) || 0 })}
                                  className="w-16 text-xs px-1 py-1 border border-gray-300 rounded text-right"
                                />
                              </div>
                            ) : (
                              <div>
                                <p className="text-gray-900">{entry.total_hours}h</p>
                                {entry.undertime_hours > 0 && (
                                  <p className="text-sm text-red-600">-{entry.undertime_hours}h</p>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-orange-600">
                            {editingEntry === entry.id ? (
                              <input
                                type="number"
                                step="0.1"
                                value={editData.overtime_hours || 0}
                                onChange={(e) => setEditData({ ...editData, overtime_hours: parseFloat(e.target.value) || 0 })}
                                className="w-16 text-xs px-1 py-1 border border-gray-300 rounded text-right"
                              />
                            ) : (
                              entry.overtime_hours > 0 ? `${entry.overtime_hours}h` : '-'
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-900">
                            {editingEntry === entry.id ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editData.base_salary || 0}
                                onChange={(e) => setEditData({ ...editData, base_salary: parseFloat(e.target.value) || 0 })}
                                className="w-20 text-xs px-1 py-1 border border-gray-300 rounded text-right"
                              />
                            ) : (
                              formatCurrency(entry.base_salary)
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-green-600">
                            {editingEntry === entry.id ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editData.overtime_pay || 0}
                                onChange={(e) => setEditData({ ...editData, overtime_pay: parseFloat(e.target.value) || 0 })}
                                className="w-20 text-xs px-1 py-1 border border-gray-300 rounded text-right"
                              />
                            ) : (
                              entry.overtime_pay > 0 ? formatCurrency(entry.overtime_pay) : '-'
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-red-600">
                            {editingEntry === entry.id ? (
                              <div className="space-y-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editData.undertime_deduction || 0}
                                  onChange={(e) => setEditData({ ...editData, undertime_deduction: parseFloat(e.target.value) || 0 })}
                                  className="w-20 text-xs px-1 py-1 border border-gray-300 rounded text-right"
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editData.staff_house_deduction || 0}
                                  onChange={(e) => setEditData({ ...editData, staff_house_deduction: parseFloat(e.target.value) || 0 })}
                                  className="w-20 text-xs px-1 py-1 border border-gray-300 rounded text-right"
                                />
                              </div>
                            ) : (
                              (entry.undertime_deduction + entry.staff_house_deduction) > 0 
                                ? formatCurrency(entry.undertime_deduction + entry.staff_house_deduction) 
                                : '-'
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <p className="font-bold text-gray-900">
                              {editingEntry === entry.id 
                                ? formatCurrency(
                                    (editData.base_salary || 0) + 
                                    (editData.overtime_pay || 0) - 
                                    (editData.undertime_deduction || 0) - 
                                    (editData.staff_house_deduction || 0)
                                  )
                                : formatCurrency(entry.total_salary)
                              }
                            </p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {editingEntry === entry.id ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleSave(entry.id)}
                                  className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
                                  title="Save"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={handleCancel}
                                  className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEdit(entry)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Payroll Data</h3>
          <p className="text-gray-500">Select a week and generate payslips to view report.</p>
        </div>
      )}
    </div>
  );
}