import { pool } from './database.js';

export async function clockIn(userId) {
  try {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const weekStart = getWeekStart(now);

    // Check if user is already clocked in
    const [existing] = await pool.execute(
      'SELECT id FROM time_entries WHERE user_id = ? AND DATE(clock_in) = ? AND clock_out IS NULL',
      [userId, date]
    );

    if (existing.length > 0) {
      return { success: false, message: 'Already clocked in today' };
    }

    const [result] = await pool.execute(
      'INSERT INTO time_entries (user_id, clock_in, date, week_start) VALUES (?, ?, ?, ?)',
      [userId, now, date, weekStart]
    );

    return { success: true, entryId: result.insertId };
  } catch (error) {
    console.error('Clock in error:', error);
    return { success: false, message: 'Server error' };
  }
}

export async function clockOut(userId, overtimeNote = null) {
  try {
    const now = new Date();
    const date = now.toISOString().split('T')[0];

    // Find active time entry
    const [entries] = await pool.execute(
      'SELECT * FROM time_entries WHERE user_id = ? AND DATE(clock_in) = ? AND clock_out IS NULL',
      [userId, date]
    );

    if (entries.length === 0) {
      return { success: false, message: 'No active clock in found' };
    }

    const entry = entries[0];
    const clockInTime = new Date(entry.clock_in);
    const shiftEndTime = new Date(clockInTime);
    shiftEndTime.setHours(15, 30, 0, 0); // 3:30 PM

    let overtimeRequested = false;
    if (now > shiftEndTime && (now - shiftEndTime) > 30 * 60 * 1000) { // 30 minutes after shift
      overtimeRequested = true;
    }

    await pool.execute(
      'UPDATE time_entries SET clock_out = ?, overtime_requested = ?, overtime_note = ? WHERE id = ?',
      [now, overtimeRequested, overtimeNote, entry.id]
    );

    return { success: true, overtimeRequested };
  } catch (error) {
    console.error('Clock out error:', error);
    return { success: false, message: 'Server error' };
  }
}

export async function getTodayEntry(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [entries] = await pool.execute(
      'SELECT * FROM time_entries WHERE user_id = ? AND DATE(clock_in) = ?',
      [userId, today]
    );

    return entries[0] || null;
  } catch (error) {
    console.error('Get today entry error:', error);
    return null;
  }
}

export async function getOvertimeRequests() {
  try {
    const [requests] = await pool.execute(`
      SELECT te.*, u.username, u.department 
      FROM time_entries te 
      JOIN users u ON te.user_id = u.id 
      WHERE te.overtime_requested = TRUE AND te.overtime_approved IS NULL
      ORDER BY te.created_at DESC
    `);

    return requests;
  } catch (error) {
    console.error('Get overtime requests error:', error);
    return [];
  }
}

export async function approveOvertime(entryId, approved, adminId) {
  try {
    await pool.execute(
      'UPDATE time_entries SET overtime_approved = ?, overtime_approved_by = ? WHERE id = ?',
      [approved, adminId, entryId]
    );

    return { success: true };
  } catch (error) {
    console.error('Approve overtime error:', error);
    return { success: false, message: 'Server error' };
  }
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}