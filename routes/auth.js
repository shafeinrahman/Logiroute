const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'logiroute_secret_jwt_2026';

// In-memory fallback dataset in case MySQL is temporarily unavailable
let inMemoryCustomers = [
    { customer_id: 1, name: 'Alice Johnson', phone_number: '+1-555-0101', address: '124 Elm Street, North Zone', store_credit_balance: 50.00 },
    { customer_id: 2, name: 'Bob Martinez', phone_number: '+1-555-0102', address: '458 Pine Avenue, South Zone', store_credit_balance: 0.00 },
    { customer_id: 3, name: 'Charlie Davis', phone_number: '+1-555-0103', address: '789 Oak Boulevard, East Zone', store_credit_balance: 25.50 },
    { customer_id: 4, name: 'Diana Prince', phone_number: '+1-555-0104', address: '321 Maple Lane, West Zone', store_credit_balance: 10.00 },
    { customer_id: 5, name: 'Evan Wright', phone_number: '+1-555-0105', address: '654 Cedar Road, Central Zone', store_credit_balance: 0.00 },
    { customer_id: 6, name: 'Fiona Gallagher', phone_number: '+1-555-0106', address: '987 Birch Way, North Zone', store_credit_balance: 15.00 }
];

// Helper to generate JWT Token
function generateToken(customer) {
    return jwt.sign(
        { customer_id: customer.customer_id, name: customer.name, phone_number: customer.phone_number },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// Authentication Middleware
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required. Please login.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.customer = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired session. Please login again.' });
    }
}

// 1. GET /api/auth/demo-customers - List demo customers for fast testing
router.get('/demo-customers', async (req, res) => {
    try {
        const [rows] = await pool.promise().query('SELECT customer_id, name, phone_number, address, store_credit_balance FROM Customer ORDER BY customer_id ASC');
        return res.json({ success: true, customers: rows });
    } catch (err) {
        // Fallback
        return res.json({ success: true, customers: inMemoryCustomers });
    }
});

// 2. POST /api/auth/signup - Register a new customer
router.post('/signup', async (req, res) => {
    const { name, phone_number, address, initial_credit } = req.body;

    if (!name || !phone_number || !address) {
        return res.status(400).json({ error: 'Name, phone number, and address are required.' });
    }

    const credit = parseFloat(initial_credit) || 0.00;

    try {
        const [result] = await pool.promise().query(
            'INSERT INTO Customer (name, phone_number, address, store_credit_balance) VALUES (?, ?, ?, ?)',
            [name.trim(), phone_number.trim(), address.trim(), credit]
        );

        const newCustomer = {
            customer_id: result.insertId,
            name: name.trim(),
            phone_number: phone_number.trim(),
            address: address.trim(),
            store_credit_balance: credit
        };

        const token = generateToken(newCustomer);
        return res.status(201).json({
            success: true,
            message: 'Account registered successfully!',
            token,
            customer: newCustomer
        });
    } catch (err) {
        console.error('Signup DB Error:', err.message);
        // In-memory fallback
        const newId = inMemoryCustomers.length ? Math.max(...inMemoryCustomers.map(c => c.customer_id)) + 1 : 1;
        const newCustomer = {
            customer_id: newId,
            name: name.trim(),
            phone_number: phone_number.trim(),
            address: address.trim(),
            store_credit_balance: credit
        };
        inMemoryCustomers.push(newCustomer);
        const token = generateToken(newCustomer);
        return res.status(201).json({
            success: true,
            message: 'Account registered successfully (Demo session)',
            token,
            customer: newCustomer
        });
    }
});

// 3. POST /api/auth/login - Login by name or phone
router.post('/login', async (req, res) => {
    const { identifier } = req.body;

    if (!identifier) {
        return res.status(400).json({ error: 'Please provide your customer name or phone number.' });
    }

    try {
        const [rows] = await pool.promise().query(
            'SELECT customer_id, name, phone_number, address, store_credit_balance FROM Customer WHERE phone_number = ? OR name LIKE ? LIMIT 1',
            [identifier.trim(), `%${identifier.trim()}%`]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found. Please verify your details or sign up.' });
        }

        const customer = rows[0];
        const token = generateToken(customer);
        return res.json({
            success: true,
            message: `Welcome back, ${customer.name}!`,
            token,
            customer
        });
    } catch (err) {
        console.error('Login DB Error:', err.message);
        const customer = inMemoryCustomers.find(
            c => c.phone_number === identifier.trim() || c.name.toLowerCase().includes(identifier.trim().toLowerCase())
        );

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found in demo database.' });
        }

        const token = generateToken(customer);
        return res.json({
            success: true,
            message: `Welcome back, ${customer.name}!`,
            token,
            customer
        });
    }
});

// 4. POST /api/auth/demo-login/:customerId - Quick 1-click login for testing
router.post('/demo-login/:customerId', async (req, res) => {
    const customerId = parseInt(req.params.customerId, 10);
    try {
        const [rows] = await pool.promise().query(
            'SELECT customer_id, name, phone_number, address, store_credit_balance FROM Customer WHERE customer_id = ?',
            [customerId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found.' });
        }

        const customer = rows[0];
        const token = generateToken(customer);
        return res.json({
            success: true,
            message: `Switched to demo customer: ${customer.name}`,
            token,
            customer
        });
    } catch (err) {
        const customer = inMemoryCustomers.find(c => c.customer_id === customerId);
        if (!customer) {
            return res.status(404).json({ error: 'Demo customer not found.' });
        }
        const token = generateToken(customer);
        return res.json({
            success: true,
            message: `Switched to demo customer: ${customer.name}`,
            token,
            customer
        });
    }
});

// 5. GET /api/auth/me - Retrieve current customer profile
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.promise().query(
            'SELECT customer_id, name, phone_number, address, store_credit_balance FROM Customer WHERE customer_id = ?',
            [req.customer.customer_id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found.' });
        }
        return res.json({ success: true, customer: rows[0] });
    } catch (err) {
        const customer = inMemoryCustomers.find(c => c.customer_id === req.customer.customer_id) || req.customer;
        return res.json({ success: true, customer });
    }
});

module.exports = {
    router,
    authMiddleware,
    inMemoryCustomers
};
