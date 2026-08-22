require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const { router: authRouter } = require('./routes/auth');
const { router: customerRouter } = require('./routes/customer');
const itemsRouter = require('./routes/items');
const { router: driversRouter } = require('./routes/drivers');
const { router: inventoryRouter } = require('./routes/inventory');
const { router: dispatchRouter } = require('./routes/dispatch');
const { router: notificationsRouter } = require('./routes/notifications');
const { router: returnsRouter } = require('./routes/returns');
const { router: reportsRouter } = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/customer', customerRouter);
app.use('/api/items', itemsRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/dispatch', dispatchRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/returns', returnsRouter);
app.use('/api/reports', reportsRouter);

// Health Check API
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'LogiRoute API Server',
        database: process.env.DB_NAME || 'LogiRoute',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

// SPA Fallback Route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 LogiRoute Server running on http://localhost:${PORT}`);
    console.log(`📦 Node.js Backend connected with MySQL via db.js`);
    console.log(`🌟 Teammate 1 Features (Customer, Orders & Returns):`);
    console.log(`   1. Missing Sales Report (Features.md Teammate 1 - Feature 1)`);
    console.log(`   2. Return Tracking & Workflow (Features.md Teammate 1 - Feature 2)`);
    console.log(`   3. Customer Dashboard & Credits (Features.md Teammate 1 - Feature 3)`);
    console.log(`🌟 Teammate 2 Features (Drivers, Dispatch & Pay):`);
    console.log(`   1. Driver–Warehouse Coverage Map (Features.md Teammate 2 - Feature 1)`);
    console.log(`   2. Driver Earnings & Weekly Payroll (Features.md Teammate 2 - Feature 2)`);
    console.log(`   3. Order Dispatch & Priority Queue (Features.md Teammate 2 - Feature 3)`);
    console.log(`🌟 Teammate 3 Features (Items & Warehouse Stock):`);
    console.log(`   1. Item–Warehouse Stock Matrix (Features.md Teammate 3 - Feature 1)`);
    console.log(`   2. Low Stock Alert & Inventory Monitor (Features.md Teammate 3 - Feature 2)`);
    console.log(`   3. Goods Monitoring & Quarantine Control (Features.md Teammate 3 - Feature 3)`);
    console.log(`🔐 Authentication: Login, Signup, & Demo Switcher`);
    console.log('====================================================');
});
