import { pool } from './database.js';

export async function calculateWeeklyPayroll(userId, weekStart) {
  try {
    const [entries] = await pool.execute(
      'SELECT * FROM time_entries WHERE user_id = ? AND week_start = ? AND clock_out IS NOT NULL',
      [userId, weekStart]
    );

    const [user] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) return null;

    const userData = user[0];
    let totalHours = 0;
    let overtimeHours = 0;
    let undertimeHours = 0;

    entries.forEach(entry => {
      const clockIn = new Date(entry.clock_in);
      const clockOut = new Date(entry.clock_out);
      const workedHours = (clockOut - clockIn) / (1000 * 60 * 60);

      if (entry.overtime_requested && entry.overtime_approved) {
        const shiftEndTime = new Date(clockIn);
        shiftEndTime.setHours(15, 30, 0, 0);
        
        if (clockOut > shiftEndTime) {
          const overtimeStart = new Date(Math.max(clockOut - 30 * 60 * 1000, shiftEndTime));
          const overtime = (clockOut - overtimeStart) / (1000 * 60 * 60);
          overtimeHours += Math.max(0, overtime);
          totalHours += 8; // Count as full shift
        } else {
          totalHours += workedHours;
        }
      } else {
        totalHours += Math.min(workedHours, 8);
        if (workedHours < 8) {
          undertimeHours += 8 - workedHours;
        }
      }
    });

    const baseSalary = Math.min(totalHours, 40) * 25; // 200 PHP / 8 hours = 25 PHP/hour
    const overtimePay = overtimeHours * 35;
    const undertimeDeduction = undertimeHours * 25;
    const staffHouseDeduction = userData.staff_house ? 250 : 0;
    
    const totalSalary = baseSalary + overtimePay - undertimeDeduction - staffHouseDeduction;

    return {
      totalHours,
      overtimeHours,
      undertimeHours,
      baseSalary,
      overtimePay,
      undertimeDeduction,
      staffHouseDeduction,
      totalSalary
    };
  } catch (error) {
    console.error('Calculate payroll error:', error);
    return null;
  }
}

export async function generateWeeklyPayslips(weekStart) {
  try {
    const [users] = await pool.execute(
      'SELECT DISTINCT u.* FROM users u JOIN time_entries te ON u.id = te.user_id WHERE te.week_start = ?',
      [weekStart]
    );

    const payslips = [];

    for (const user of users) {
      const payroll = await calculateWeeklyPayroll(user.id, weekStart);
      if (payroll) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const [result] = await pool.execute(
          `INSERT INTO payslips (user_id, week_start, week_end, total_hours, overtime_hours, 
           undertime_hours, base_salary, overtime_pay, undertime_deduction, staff_house_deduction, 
           total_salary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.id, weekStart, weekEnd.toISOString().split('T')[0],
            payroll.totalHours, payroll.overtimeHours, payroll.undertimeHours,
            payroll.baseSalary, payroll.overtimePay, payroll.undertimeDeduction,
            payroll.staffHouseDeduction, payroll.totalSalary
          ]
        );

        payslips.push({
          id: result.insertId,
          user: user.username,
          department: user.department,
          ...payroll
        });
      }
    }

    return payslips;
  } catch (error) {
    console.error('Generate payslips error:', error);
    return [];
  }
}

export async function getPayrollReport(weekStart) {
  try {
    const [payslips] = await pool.execute(
      `SELECT p.*, u.username, u.department 
       FROM payslips p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.week_start = ? 
       ORDER BY u.department, u.username`,
      [weekStart]
    );

    return payslips;
  } catch (error) {
    console.error('Get payroll report error:', error);
    return [];
  }
}