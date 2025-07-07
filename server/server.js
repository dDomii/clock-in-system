import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './database.js';
import { loginUser, verifyToken, createUser, updateUser } from './auth.js';
import { clockIn, clockOut, getTodayEntry, getOvertimeRequests, approveOvertime } from './timeTracking.js';
import { generateWeeklyPayslips, getPayrollReport } from './payroll.js';
import { pool } from './database.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize database
await initializeDatabase();

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  req.user = decoded;
  next();
};

// Routes
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await loginUser(username, password);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(401).json(result);
  }
});

app.post('/api/clock-in', authenticate, async (req, res) => {
  const result = await clockIn(req.user.userId);
  res.json(result);
});

app.post('/api/clock-out', authenticate, async (req, res) => {
  const { overtimeNote } = req.body;
  const result = await clockOut(req.user.userId, overtimeNote);
  res.json(result);
});

app.get('/api/today-entry', authenticate, async (req, res) => {
  const entry = await getTodayEntry(req.user.userId);
  res.json(entry);
});

app.get('/api/users', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const [users] = await pool.execute(
      'SELECT id, username, role, department, staff_house, active, created_at FROM users ORDER BY department, username'
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/users', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const result = await createUser(req.body);
  res.json(result);
});

app.put('/api/users/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const result = await updateUser(req.params.id, req.body);
  res.json(result);
});

app.post('/api/users/:id/adjust-time', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { id } = req.params;
  const { date, clockIn, clockOut } = req.body;

  try {
    const weekStart = getWeekStart(new Date(date));
    
    // Delete existing entry for this date
    await pool.execute(
      'DELETE FROM time_entries WHERE user_id = ? AND DATE(clock_in) = ?',
      [id, date]
    );

    // Create new entry with adjusted times
    const clockInDateTime = new Date(`${date}T${clockIn}:00`);
    let clockOutDateTime = null;
    
    if (clockOut) {
      clockOutDateTime = new Date(`${date}T${clockOut}:00`);
    }

    await pool.execute(
      'INSERT INTO time_entries (user_id, clock_in, clock_out, date, week_start) VALUES (?, ?, ?, ?, ?)',
      [id, clockInDateTime, clockOutDateTime, date, weekStart]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Time adjustment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

app.get('/api/overtime-requests', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const requests = await getOvertimeRequests();
  res.json(requests);
});

app.post('/api/overtime-requests/:id/approve', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { approved } = req.body;
  const result = await approveOvertime(req.params.id, approved, req.user.userId);
  res.json(result);
});

app.post('/api/payslips/generate', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { weekStart } = req.body;
  
  try {
    // Check if payslips already exist for this week for ANY user
    const [existing] = await pool.execute(
      'SELECT COUNT(*) as count FROM payslips WHERE week_start = ?',
      [weekStart]
    );

    if (existing[0].count > 0) {
      return res.json({ error: 'Payslips for this week have already been generated. Only one payroll per user per week is allowed.' });
    }

    const payslips = await generateWeeklyPayslips(weekStart);
    res.json(payslips);
  } catch (error) {
    console.error('Error generating payslips:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/payroll-report', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { weekStart } = req.query;
  const report = await getPayrollReport(weekStart);
  res.json(report);
});

app.get('/api/active-users', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const [activeUsers] = await pool.execute(`
      SELECT 
        u.id,
        u.username,
        u.department,
        te.clock_in
      FROM users u
      JOIN time_entries te ON u.id = te.user_id
      WHERE DATE(te.clock_in) = ? 
        AND te.clock_out IS NULL
        AND u.active = TRUE
      ORDER BY u.department, te.clock_in ASC
    `, [today]);

    res.json(activeUsers);
  } catch (error) {
    console.error('Error fetching active users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});