const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { customers, warehouses, warehouseUsers } = require('./dataStore');

const JWT_SECRET = process.env.JWT_SECRET || 'logiroute_secret_jwt_2026';

// Helper to generate JWT Token for Customers
function generateCustomerToken(customer) {
    return jwt.sign(
        {
            role: 'customer',
            customer_id: customer.customer_id,
            name: customer.name,
            phone_number: customer.phone_number,
            address: customer.address
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// Helper to generate JWT Token for Warehouse Managers
function generateWarehouseToken(user, warehouse) {
    return jwt.sign(
        {
            role: 'warehouse',
            user_id: user.user_id,
            warehouse_id: user.warehouse_id,
            warehouse_name: warehouse ? warehouse.name : `Warehouse #${user.warehouse_id}`,
            location_zone: warehouse ? warehouse.location_zone : 'General',
            username: user.username,
            full_name: user.full_name,
            user_role: user.role || 'warehouse_manager'
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// Universal Authentication Middleware
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required. Please login.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        if (decoded.role === 'customer') {
            req.customer = decoded;
        } else if (decoded.role === 'warehouse') {
            req.warehouseUser = decoded;
        }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired session. Please login again.' });
    }
}

// Warehouse-Only RBAC Middleware (Customers cannot access warehouse manager functionalities)
function warehouseOnlyMiddleware(req, res, next) {
    authMiddleware(req, res, () => {
        if (!req.user || req.user.role !== 'warehouse') {
            return res.status(403).json({
                error: 'Access denied. Warehouse manager authentication required.',
                code: 'WAREHOUSE_PORTAL_ONLY'
            });
        }
        next();
    });
}

// Customer-Only RBAC Middleware
function customerOnlyMiddleware(req, res, next) {
    authMiddleware(req, res, () => {
        if (!req.user || req.user.role !== 'customer') {
            return res.status(403).json({
                error: 'Access denied. Customer account authentication required.',
                code: 'CUSTOMER_PORTAL_ONLY'
            });
        }
        next();
    });
}

// ============================================================================
// SECTION 1: CUSTOMER PORTAL AUTHENTICATION
// ============================================================================

// 1.1 GET /api/auth/demo-customers - List demo customers for fast testing
router.get('/demo-customers', async (req, res) => {
    try {
        const [rows] = await pool.promise().query('SELECT customer_id, name, phone_number, address, store_credit_balance FROM Customer ORDER BY customer_id ASC');
        return res.json({ success: true, customers: rows });
    } catch (err) {
        return res.json({ success: true, customers: customers });
    }
});

// 1.2 POST /api/auth/signup - Register a new customer
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

        const token = generateCustomerToken(newCustomer);
        return res.status(201).json({
            success: true,
            role: 'customer',
            message: 'Customer account registered successfully!',
            token,
            customer: newCustomer
        });
    } catch (err) {
        console.error('Signup DB Error:', err.message);
        const newId = customers.length ? Math.max(...customers.map(c => c.customer_id)) + 1 : 1;
        const newCustomer = {
            customer_id: newId,
            name: name.trim(),
            phone_number: phone_number.trim(),
            address: address.trim(),
            store_credit_balance: credit
        };
        customers.push(newCustomer);
        const token = generateCustomerToken(newCustomer);
        return res.status(201).json({
            success: true,
            role: 'customer',
            message: 'Customer account registered successfully (Demo session)',
            token,
            customer: newCustomer
        });
    }
});

// 1.3 POST /api/auth/login - Customer login by name or phone
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
        const token = generateCustomerToken(customer);
        return res.json({
            success: true,
            role: 'customer',
            message: `Welcome back, ${customer.name}!`,
            token,
            customer
        });
    } catch (err) {
        console.error('Login DB Error:', err.message);
        const customer = customers.find(
            c => c.phone_number === identifier.trim() || c.name.toLowerCase().includes(identifier.trim().toLowerCase())
        );

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found in demo database.' });
        }

        const token = generateCustomerToken(customer);
        return res.json({
            success: true,
            role: 'customer',
            message: `Welcome back, ${customer.name}!`,
            token,
            customer
        });
    }
});

// 1.4 POST /api/auth/demo-login/:customerId - Quick 1-click login for demo customers
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
        const token = generateCustomerToken(customer);
        return res.json({
            success: true,
            role: 'customer',
            message: `Switched to customer: ${customer.name}`,
            token,
            customer
        });
    } catch (err) {
        const customer = customers.find(c => c.customer_id === customerId);
        if (!customer) {
            return res.status(404).json({ error: 'Demo customer not found.' });
        }
        const token = generateCustomerToken(customer);
        return res.json({
            success: true,
            role: 'customer',
            message: `Switched to customer: ${customer.name}`,
            token,
            customer
        });
    }
});

// ============================================================================
// SECTION 2: WAREHOUSE PORTAL AUTHENTICATION (Warehouse User Entity)
// Bundles all warehouse operations under a warehouse user entity.
// Username = warehouse_id (e.g. 1, 2, 3, 4) or alias, with password.
// ============================================================================

// 2.1 GET /api/auth/warehouse/demo-users - Pre-seeded Warehouse Manager Accounts
router.get('/warehouse/demo-users', async (req, res) => {
    try {
        const [rows] = await pool.promise().query(`
            SELECT 
                wu.user_id,
                wu.warehouse_id,
                wu.username,
                wu.full_name,
                wu.role,
                w.name AS warehouse_name,
                w.location_zone
            FROM Warehouse_Users wu
            JOIN Warehouses w ON wu.warehouse_id = w.warehouse_id
            ORDER BY wu.warehouse_id ASC
        `);

        if (rows.length > 0) {
            return res.json({
                success: true,
                warehouseUsers: rows.map(r => ({ ...r, password_hint: 'password123' }))
            });
        }
        throw new Error('No SQL warehouse users found');
    } catch (err) {
        const list = warehouseUsers.map(wu => {
            const w = warehouses.find(wh => wh.warehouse_id === wu.warehouse_id);
            return {
                user_id: wu.user_id,
                warehouse_id: wu.warehouse_id,
                username: wu.username,
                full_name: wu.full_name,
                role: wu.role,
                warehouse_name: w ? w.name : `Warehouse #${wu.warehouse_id}`,
                location_zone: w ? w.location_zone : 'General',
                password_hint: 'password123'
            };
        });

        return res.json({
            success: true,
            warehouseUsers: list
        });
    }
});

// 2.2 POST /api/auth/warehouse/login - Warehouse Manager Login (Username = warehouse_id, password)
router.post('/warehouse/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Warehouse ID (Username) and password are required.' });
    }

    const cleanUsername = username.toString().trim();
    const cleanPassword = password.toString().trim();

    try {
        // Query database by username or numeric warehouse_id
        let [rows] = await pool.promise().query(`
            SELECT 
                wu.user_id,
                wu.warehouse_id,
                wu.username,
                wu.password_hash,
                wu.full_name,
                wu.role,
                w.name AS warehouse_name,
                w.location_zone
            FROM Warehouse_Users wu
            JOIN Warehouses w ON wu.warehouse_id = w.warehouse_id
            WHERE wu.username = ? OR wu.warehouse_id = ?
            LIMIT 1
        `, [cleanUsername, parseInt(cleanUsername, 10) || 0]);

        if (rows.length === 0) {
            return res.status(404).json({ error: `No warehouse entity found for ID "${cleanUsername}". Use warehouse ID: 1, 2, 3, or 4.` });
        }

        const user = rows[0];

        // Check password (bcrypt or plain fallback for dev ease)
        let isValidPassword = false;
        try {
            isValidPassword = await bcrypt.compare(cleanPassword, user.password_hash);
        } catch (_) {}

        if (!isValidPassword) {
            // Fallback check against default passwords
            if (cleanPassword === 'password123' || cleanPassword === 'warehouse123' || cleanPassword === 'admin123' || cleanPassword === '123456' || cleanPassword === user.password_hash) {
                isValidPassword = true;
            }
        }

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid password. (Default demo password is "password123").' });
        }

        const warehouseInfo = {
            warehouse_id: user.warehouse_id,
            name: user.warehouse_name,
            location_zone: user.location_zone
        };

        const token = generateWarehouseToken(user, warehouseInfo);

        return res.json({
            success: true,
            role: 'warehouse',
            message: `Authenticated as Warehouse Manager: ${user.full_name}`,
            token,
            warehouse_user: {
                user_id: user.user_id,
                warehouse_id: user.warehouse_id,
                warehouse_name: user.warehouse_name,
                location_zone: user.location_zone,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Warehouse Login DB Error:', err.message);

        // Fallback in-memory authentication
        const user = warehouseUsers.find(wu => 
            wu.username === cleanUsername || 
            wu.warehouse_id === parseInt(cleanUsername, 10) ||
            `wh-${wu.warehouse_id}`.toLowerCase() === cleanUsername.toLowerCase()
        );

        if (!user) {
            return res.status(404).json({ error: `No warehouse entity found for ID "${cleanUsername}". Use warehouse ID 1, 2, 3, or 4.` });
        }

        const w = warehouses.find(wh => wh.warehouse_id === user.warehouse_id);

        let isValid = (cleanPassword === user.password_plain || cleanPassword === 'password123' || cleanPassword === 'warehouse123' || cleanPassword === 'admin123' || cleanPassword === '123456');

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid password. (Default demo password is "password123").' });
        }

        const warehouseInfo = {
            warehouse_id: user.warehouse_id,
            name: w ? w.name : `Warehouse #${user.warehouse_id}`,
            location_zone: w ? w.location_zone : 'General'
        };

        const token = generateWarehouseToken(user, warehouseInfo);

        return res.json({
            success: true,
            role: 'warehouse',
            message: `Authenticated as Warehouse Manager: ${user.full_name} (Demo session)`,
            token,
            warehouse_user: {
                user_id: user.user_id,
                warehouse_id: user.warehouse_id,
                warehouse_name: warehouseInfo.name,
                location_zone: warehouseInfo.location_zone,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            }
        });
    }
});

// 2.3 POST /api/auth/warehouse/demo-login/:warehouseId - 1-Click Warehouse Manager Switcher
router.post('/warehouse/demo-login/:warehouseId', async (req, res) => {
    const warehouseId = parseInt(req.params.warehouseId, 10);

    try {
        const [rows] = await pool.promise().query(`
            SELECT 
                wu.user_id,
                wu.warehouse_id,
                wu.username,
                wu.full_name,
                wu.role,
                w.name AS warehouse_name,
                w.location_zone
            FROM Warehouse_Users wu
            JOIN Warehouses w ON wu.warehouse_id = w.warehouse_id
            WHERE wu.warehouse_id = ?
            LIMIT 1
        `, [warehouseId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: `Warehouse User for Warehouse #${warehouseId} not found.` });
        }

        const user = rows[0];
        const token = generateWarehouseToken(user, {
            warehouse_id: user.warehouse_id,
            name: user.warehouse_name,
            location_zone: user.location_zone
        });

        return res.json({
            success: true,
            role: 'warehouse',
            message: `Switched to Warehouse Manager: ${user.full_name}`,
            token,
            warehouse_user: {
                user_id: user.user_id,
                warehouse_id: user.warehouse_id,
                warehouse_name: user.warehouse_name,
                location_zone: user.location_zone,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (err) {
        const user = warehouseUsers.find(wu => wu.warehouse_id === warehouseId);
        if (!user) {
            return res.status(404).json({ error: `Warehouse User for Warehouse #${warehouseId} not found in demo store.` });
        }

        const w = warehouses.find(wh => wh.warehouse_id === warehouseId);
        const warehouseInfo = {
            warehouse_id: user.warehouse_id,
            name: w ? w.name : `Warehouse #${user.warehouse_id}`,
            location_zone: w ? w.location_zone : 'General'
        };

        const token = generateWarehouseToken(user, warehouseInfo);

        return res.json({
            success: true,
            role: 'warehouse',
            message: `Switched to Warehouse Manager: ${user.full_name} (Demo session)`,
            token,
            warehouse_user: {
                user_id: user.user_id,
                warehouse_id: user.warehouse_id,
                warehouse_name: warehouseInfo.name,
                location_zone: warehouseInfo.location_zone,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            }
        });
    }
});

// ============================================================================
// SECTION 3: SESSION VERIFICATION
// ============================================================================

// 3.1 GET /api/auth/me - Retrieve current active user profile (Customer or Warehouse)
router.get('/me', authMiddleware, async (req, res) => {
    if (req.user.role === 'warehouse') {
        return res.json({
            success: true,
            role: 'warehouse',
            user: {
                user_id: req.user.user_id,
                warehouse_id: req.user.warehouse_id,
                warehouse_name: req.user.warehouse_name,
                location_zone: req.user.location_zone,
                username: req.user.username,
                full_name: req.user.full_name,
                role: req.user.user_role || 'warehouse_manager'
            }
        });
    }

    // Customer profile
    try {
        const [rows] = await pool.promise().query(
            'SELECT customer_id, name, phone_number, address, store_credit_balance FROM Customer WHERE customer_id = ?',
            [req.user.customer_id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found.' });
        }
        return res.json({ success: true, role: 'customer', customer: rows[0] });
    } catch (err) {
        const customer = customers.find(c => c.customer_id === req.user.customer_id) || req.user;
        return res.json({ success: true, role: 'customer', customer });
    }
});

module.exports = {
    router,
    authMiddleware,
    warehouseOnlyMiddleware,
    customerOnlyMiddleware,
    inMemoryCustomers: customers,
    inMemoryWarehouseUsers: warehouseUsers
};
