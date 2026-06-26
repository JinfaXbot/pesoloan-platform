// backend/server.js - FULL FIXED VERSION
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pesoloan-secret-2026';

// Middleware
app.use(cors());
app.use(express.json());

// Serve Frontend Files (IMPORTANT!)
app.use(express.static(path.join(__dirname, '../frontend')));

// Database
const db = new sqlite3.Database('./database.db');

// Create tables (same as before)
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY, phone TEXT UNIQUE, password TEXT, name TEXT,
    gender TEXT, dob TEXT, job TEXT, income TEXT, address TEXT,
    bankName TEXT, bankAccountName TEXT, bankAccountNo TEXT,
    creditScore INTEGER DEFAULT 650, otp TEXT DEFAULT '', createdAt TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY, customerId TEXT, amount REAL, term INTEGER,
    status TEXT DEFAULT 'pending', appliedAt TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY, customerId TEXT, amount REAL, status TEXT DEFAULT 'pending',
    requestedAt TEXT, processedAt TEXT, rejectReason TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS wallet (
    customerId TEXT PRIMARY KEY, balance REAL DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, customerId TEXT, type TEXT, desc TEXT, amount REAL, date TEXT
  )`);
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// ====================== ROUTES ======================

// Root route - shows frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'Jinfa123168') {
    const token = jwt.sign({ type: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, user: { name: 'Admin' } });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

// Customer Register
app.post('/api/customer/register', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Missing fields' });

  const hashed = await bcrypt.hash(password, 10);
  const id = 'C' + Date.now();

  db.run(`INSERT INTO customers (id, phone, password, createdAt) VALUES (?, ?, ?, ?)`,
    [id, phone, hashed, new Date().toISOString()], (err) => {
      if (err) return res.status(400).json({ error: 'Phone already registered' });
      res.json({ message: 'Account created successfully', id });
    });
});

// Customer Login
app.post('/api/customer/login', async (req, res) => {
  const { phone, password } = req.body;
  db.get(`SELECT * FROM customers WHERE phone = ?`, [phone], async (err, cust) => {
    if (!cust || !(await bcrypt.compare(password, cust.password))) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }
    const token = jwt.sign({ type: 'customer', id: cust.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, customer: { id: cust.id, phone: cust.phone, name: cust.name || '' } });
  });
});

// Get Customer Profile
app.get('/api/customer/profile', authenticateToken, (req, res) => {
  if (req.user.type !== 'customer') return res.status(403).json({ error: 'Unauthorized' });
  db.get(`SELECT * FROM customers WHERE id = ?`, [req.user.id], (err, cust) => {
    if (!cust) return res.status(404).json({ error: 'Not found' });
    res.json(cust);
  });
});

// Apply Loan
app.post('/api/customer/apply-loan', authenticateToken, (req, res) => {
  // Add your loan logic here (same as before)
  res.json({ message: 'Loan application received' });
});

// ====================== START SERVER ======================
app.listen(PORT, () => {
  console.log(`✅ PesoLoan Backend running on http://localhost:${PORT}`);
  console.log(`📂 Frontend served from: ${path.join(__dirname, '../frontend')}`);
});