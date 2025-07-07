import { pool } from './database.js';

export async function calculateWeeklyPayroll(userId, weekStart) {
  try {
    const [entries] = await pool.execute(
      'SELECT * FROM time_entries WHERE user_id = ? AND week_start = ? ORDER BY clock_in',
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

    // Get first and last clock times for the week
    let firstClockIn = null;
    let lastClockOut = null;

    entries.forEach(entry => {
      const clockIn = new Date(entry.clock_in);
      let clockOut = entry.clock_out ? new Date(entry.clock_out) : null;

      // Auto clock-out at 3:30 PM if still active (no clock_out)
      if (!clockOut) {
        clockOut = new Date(clockIn);
        clockOut.setHours(15, 30, 0, 0); // 3:30 PM
        
        // Update the database with auto clock-out
        pool.execute(
          'UPDATE time_entries SET clock_out = ? WHERE id = ?',
          [clockOut, entry.id]
        ).catch(err => console.error('Auto clock-out update error:', err));
      }

      const workedHours = (clockOut - clockIn) / (1000 * 60 * 60);

      // Track first clock in and last clock out
      if (!firstClockIn || clockIn < firstClockIn) {
        firstClockIn = clockIn;
      }
      if (!lastClockOut || clockOut > lastClockOut) {
        lastClockOut = clockOut;
      }

      // Check for late clock in (after 7:00 AM)
      const shiftStart = new Date(clockIn);
      shiftStart.setHours(7, 0, 0, 0);
      
      if (clockIn > shiftStart) {
        const lateHours = (clockIn - shiftStart) / (1000 * 60 * 60);
        undertimeHours += lateHours;
      }

      // Check for early clock out (before 3:30 PM)
      const shiftEnd = new Date(clockIn);
      shiftEnd.setHours(15, 30, 0, 0);
      
      if (clockOut < shiftEnd) {
        const earlyHours = (shiftEnd - clockOut) / (1000 * 60 * 60);
        undertimeHours += earlyHours;
      }

      // Handle overtime calculation
      if (entry.overtime_requested && entry.overtime_approved) {
        const shiftEndTime = new Date(clockIn);
        shiftEndTime.setHours(15, 30, 0, 0);
        
        if (clockOut > shiftEndTime) {
          // Calculate overtime hours (subtract 30 minutes grace period)
          const overtimeStart = new Date(Math.max(shiftEndTime.getTime() + 30 * 60 * 1000, shiftEndTime.getTime()));
          const overtime = Math.max(0, (clockOut - overtimeStart) / (1000 * 60 * 60));
          overtimeHours += overtime;
          totalHours += 8; // Count as full shift for approved overtime
        } else {
          totalHours += Math.min(workedHours, 8);
        }
      } else {
        totalHours += Math.min(workedHours, 8);
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
      totalSalary,
      clockInTime: firstClockIn ? firstClockIn.toISOString() : null,
      clockOutTime: lastClockOut ? lastClockOut.toISOString() : null
    };
  } catch (error) {
    console.error('Calculate payroll error:', error);
    return null;
  }
}

export async function generateWeeklyPayslips(weekStart) {
  try {
    // Get all users who have time entries for this week OR are currently active
    const [users] = await pool.execute(`
      SELECT DISTINCT u.* FROM users u 
      LEFT JOIN time_entries te ON u.id = te.user_id AND te.week_start = ?
      WHERE u.active = TRUE AND (te.user_id IS NOT NULL OR u.id IN (
        SELECT DISTINCT user_id FROM time_entries 
        WHERE DATE(clock_in) BETWEEN ? AND DATE_ADD(?, INTERVAL 6 DAY)
      ))
    `, [weekStart, weekStart, weekStart]);

    const payslips = [];

    for (const user of users) {
      const payroll = await calculateWeeklyPayroll(user.id, weekStart);
      if (payroll) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // Check if payslip already exists for this user and week
        const [existing] = await pool.execute(
          'SELECT id FROM payslips WHERE user_id = ? AND week_start = ?',
          [user.id, weekStart]
        );

        if (existing.length === 0) {
          const [result] = await pool.execute(
            `INSERT INTO payslips (user_id, week_start, week_end, total_hours, overtime_hours, 
             undertime_hours, base_salary, overtime_pay, undertime_deduction, staff_house_deduction, 
             total_salary, clock_in_time, clock_out_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              user.id, weekStart, weekEnd.toISOString().split('T')[0],
              payroll.totalHours, payroll.overtimeHours, payroll.undertimeHours,
              payroll.baseSalary, payroll.overtimePay, payroll.undertimeDeduction,
              payroll.staffHouseDeduction, payroll.totalSalary,
              payroll.clockInTime, payroll.clockOutTime
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

export async function updatePayrollEntry(payslipId, updateData) {
  try {
    const { clockIn, clockOut, totalHours, overtimeHours, undertimeHours, baseSalary, overtimePay, undertimeDeduction, staffHouseDeduction } = updateData;
    
    const totalSalary = baseSalary + overtimePay - undertimeDeduction - staffHouseDeduction;

    await pool.execute(
      `UPDATE payslips SET 
       clock_in_time = ?, clock_out_time = ?, total_hours = ?, overtime_hours = ?, 
       undertime_hours = ?, base_salary = ?, overtime_pay = ?, undertime_deduction = ?, 
       staff_house_deduction = ?, total_salary = ?
       WHERE id = ?`,
      [clockIn, clockOut, totalHours, overtimeHours, undertimeHours, baseSalary, overtimePay, undertimeDeduction, staffHouseDeduction, totalSalary, payslipId]
    );

    return { success: true };
  } catch (error) {
    console.error('Update payroll entry error:', error);
    return { success: false, message: 'Server error' };
  }
}