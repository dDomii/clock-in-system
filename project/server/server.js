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
      'SELECT id, username, role, department, staff_house, active, created_at FROM users ORDER BY username'
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
  const payslips = await generateWeeklyPayslips(weekStart);
  res.json(payslips);
});

app.get('/api/payroll-report', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { weekStart } = req.query;
  const report = await getPayrollReport(weekStart);
  res.json(report);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});