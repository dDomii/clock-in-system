import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Download, Calendar, DollarSign, FileText } from 'lucide-react';

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
}

export function PayrollReports() {
  const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
  const [weekStart, setWeekStart] = useState('');
  const [loading, setLoading] = useState(false);
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
    try {
      const response = await fetch('http://localhost:3001/api/payslips/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ weekStart }),
      });

      if (response.ok) {
        fetchPayrollReport();
      }
    } catch (error) {
      console.error('Error generating payslips:', error);
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

  const exportToCSV = () => {
    if (payrollData.length === 0) return;

    const headers = [
      'Employee',
      'Department',
      'Total Hours',
      'Overtime Hours',
      'Undertime Hours',
      'Base Salary',
      'Overtime Pay',
      'Undertime Deduction',
      'Staff House Deduction',
      'Total Salary',
      'Week Start',
      'Week End'
    ];

    const rows = payrollData.map(entry => [
      entry.username,
      entry.department,
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
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payroll_report_${weekStart}.csv`;
    link.click();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const totalSalary = payrollData.reduce((sum, entry) => sum + entry.total_salary, 0);
  const totalOvertime = payrollData.reduce((sum, entry) => sum + entry.overtime_pay, 0);
  const totalDeductions = payrollData.reduce((sum, entry) => sum + entry.undertime_deduction + entry.staff_house_deduction, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Payroll Reports</h2>
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

      {/* Payroll Table */}
      {payrollData.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Hours</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Overtime</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Base Pay</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Overtime Pay</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Deductions</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {payrollData.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{entry.username}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(entry.week_start)} - {formatDate(entry.week_end)}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{entry.department}</td>
                    <td className="py-3 px-4 text-right">
                      <div>
                        <p className="text-gray-900">{entry.total_hours}h</p>
                        {entry.undertime_hours > 0 && (
                          <p className="text-sm text-red-600">-{entry.undertime_hours}h</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-orange-600">
                      {entry.overtime_hours > 0 ? `${entry.overtime_hours}h` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {formatCurrency(entry.base_salary)}
                    </td>
                    <td className="py-3 px-4 text-right text-green-600">
                      {entry.overtime_pay > 0 ? formatCurrency(entry.overtime_pay) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600">
                      {(entry.undertime_deduction + entry.staff_house_deduction) > 0 
                        ? formatCurrency(entry.undertime_deduction + entry.staff_house_deduction) 
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(entry.total_salary)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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