const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, inMemoryCustomers } = require('./auth');

// Seed in-memory storage for resilient demonstration
let inMemoryItems = [
    { item_id: 1, name: 'Heavy Duty Shipping Box (L)', safety_threshold: 50, sku: 'BOX-HD-L-001', price: 12.50 },
    { item_id: 2, name: 'Thermal Bubble Wrap Roll 50m', safety_threshold: 20, sku: 'WRAP-TH-50M', price: 24.00 },
    { item_id: 3, name: 'Industrial Packing Tape 6pk', safety_threshold: 30, sku: 'TAPE-IND-6PK', price: 15.00 },
    { item_id: 4, name: 'Standard Cardboard Box (M)', safety_threshold: 40, sku: 'BOX-STD-M-002', price: 8.50 },
    { item_id: 5, name: 'Fragile Warning Sticker Roll', safety_threshold: 15, sku: 'LBL-FRG-1000', price: 6.00 },
    { item_id: 6, name: 'Self-Sealing Poly Mailers 100pk', safety_threshold: 25, sku: 'POLY-MLR-100', price: 18.00 },
    { item_id: 7, name: 'Stretch Wrap Film 500m', safety_threshold: 15, sku: 'STR-FLM-500', price: 22.00 },
    { item_id: 8, name: 'Corrugated Cushioning Pads 50pk', safety_threshold: 20, sku: 'PAD-COR-50PK', price: 14.00 }
];

let inMemoryDrivers = [
    { driver_id: 1, full_name: 'David Miller', rating: 4.85, status_flag: 'Available' },
    { driver_id: 2, full_name: 'Sarah Jenkins', rating: 4.90, status_flag: 'On Trip' },
    { driver_id: 3, full_name: 'Michael Scott', rating: 3.20, status_flag: 'Under Review' },
    { driver_id: 4, full_name: 'Emily Watson', rating: 4.75, status_flag: 'Available' }
];

let inMemoryOrders = [
    { order_id: 1, order_status: 'Delivered', shipping_type: 'Standard', zip_code: '10001', address: '124 Elm Street, North Zone', star_rating: 5, review_comment: 'Fast and secure delivery!', customer_id: 1, driver_id: 1 },
    { order_id: 2, order_status: 'Delivered', shipping_type: 'Express', zip_code: '10002', address: '458 Pine Avenue, South Zone', star_rating: 4, review_comment: 'Driver was polite, packaging intact.', customer_id: 2, driver_id: 2 },
    { order_id: 3, order_status: 'Dispatched', shipping_type: 'Express', zip_code: '10001', address: '987 Birch Way, North Zone', star_rating: null, review_comment: null, customer_id: 6, driver_id: 2 },
    { order_id: 4, order_status: 'Dispatched', shipping_type: 'Standard', zip_code: '10001', address: '130 Elm Street, North Zone', star_rating: null, review_comment: null, customer_id: 1, driver_id: 2 },
    { order_id: 5, order_status: 'Pending', shipping_type: 'Express', zip_code: '10003', address: '789 Oak Boulevard, East Zone', star_rating: null, review_comment: null, customer_id: 3, driver_id: null },
    { order_id: 6, order_status: 'Pending', shipping_type: 'Standard', zip_code: '10003', address: '801 Oak Boulevard, East Zone', star_rating: null, review_comment: null, customer_id: 3, driver_id: null },
    { order_id: 7, order_status: 'Pending', shipping_type: 'Standard', zip_code: '10004', address: '321 Maple Lane, West Zone', star_rating: null, review_comment: null, customer_id: 4, driver_id: null },
    { order_id: 8, order_status: 'Delivered', shipping_type: 'Standard', zip_code: '10005', address: '654 Cedar Road, Central Zone', star_rating: 2, review_comment: 'Box was damaged upon arrival.', customer_id: 5, driver_id: 3 }
];

let inMemoryOrderItems = [
    { order_id: 1, item_id: 1, quantity: 5 },
    { order_id: 1, item_id: 3, quantity: 2 },
    { order_id: 2, item_id: 2, quantity: 1 },
    { order_id: 2, item_id: 6, quantity: 2 },
    { order_id: 3, item_id: 1, quantity: 10 },
    { order_id: 3, item_id: 5, quantity: 1 },
    { order_id: 4, item_id: 4, quantity: 8 },
    { order_id: 5, item_id: 7, quantity: 2 },
    { order_id: 5, item_id: 8, quantity: 1 },
    { order_id: 6, item_id: 3, quantity: 3 },
    { order_id: 7, item_id: 6, quantity: 5 },
    { order_id: 8, item_id: 2, quantity: 2 }
];

let inMemoryReturns = [
    { return_id: 1, status: 'Arrived at Warehouse', refund_amount: 35.00, date_requested: '2026-08-12', order_id: 8 },
    { return_id: 2, status: 'Mailed Back', refund_amount: 18.50, date_requested: '2026-08-14', order_id: 1 }
];

// ============================================================================
// FEATURE: Customer Dashboard (Features.md - Teammate 1, Feature 3)
// Pulls customer order history, star ratings, and store credit balance into a unified view.
// ============================================================================
router.get('/dashboard', authMiddleware, async (req, res) => {
    const customerId = req.customer.customer_id;

    try {
        // 1. Fetch Customer Profile & Credit Balance
        const [customerRows] = await pool.promise().query(
            'SELECT customer_id, name, phone_number, address, store_credit_balance FROM Customer WHERE customer_id = ?',
            [customerId]
        );

        if (customerRows.length === 0) {
            return res.status(404).json({ error: 'Customer not found.' });
        }
        const customer = customerRows[0];

        // 2. Fetch Orders with assigned Driver information
        const [orderRows] = await pool.promise().query(
            `SELECT o.order_id, o.order_status, o.shipping_type, o.zip_code, o.address, 
                    o.star_rating, o.review_comment, o.customer_id, o.driver_id,
                    d.full_name AS driver_name, d.rating AS driver_rating
             FROM Orders o
             LEFT JOIN Drivers d ON o.driver_id = d.driver_id
             WHERE o.customer_id = ?
             ORDER BY o.order_id DESC`,
            [customerId]
        );

        // 3. Fetch Items for these orders
        let ordersWithItems = [];
        if (orderRows.length > 0) {
            const orderIds = orderRows.map(o => o.order_id);
            const [itemRows] = await pool.promise().query(
                `SELECT oi.order_id, oi.item_id, oi.quantity, i.name AS item_name, i.sku
                 FROM Order_Items oi
                 JOIN Items i ON oi.item_id = i.item_id
                 WHERE oi.order_id IN (?)`,
                [orderIds]
            );

            ordersWithItems = orderRows.map(order => {
                const items = itemRows.filter(it => it.order_id === order.order_id);
                return {
                    ...order,
                    items
                };
            });
        }

        // 4. Fetch Returns linked to this customer's orders
        const [returnRows] = await pool.promise().query(
            `SELECT r.return_id, r.status, r.refund_amount, r.date_requested, r.order_id,
                    o.shipping_type, o.order_status
             FROM Returns r
             JOIN Orders o ON r.order_id = o.order_id
             WHERE o.customer_id = ?
             ORDER BY r.return_id DESC`,
            [customerId]
        );

        // 5. Aggregate Dashboard KPI Metrics
        const totalOrders = ordersWithItems.length;
        const activeOrders = ordersWithItems.filter(o => o.order_status !== 'Delivered' && o.order_status !== 'Cancelled').length;
        const deliveredOrders = ordersWithItems.filter(o => o.order_status === 'Delivered').length;
        const ratedOrders = ordersWithItems.filter(o => o.star_rating !== null);
        const avgRatingGiven = ratedOrders.length ? (ratedOrders.reduce((sum, o) => sum + o.star_rating, 0) / ratedOrders.length).toFixed(1) : null;
        const totalRefunds = returnRows.reduce((sum, r) => sum + parseFloat(r.refund_amount || 0), 0);

        return res.json({
            success: true,
            dashboard: {
                customer,
                orders: ordersWithItems,
                returns: returnRows,
                summary: {
                    totalOrders,
                    activeOrders,
                    deliveredOrders,
                    avgRatingGiven,
                    totalRefunds: totalRefunds.toFixed(2),
                    storeCreditBalance: parseFloat(customer.store_credit_balance || 0).toFixed(2)
                }
            }
        });
    } catch (err) {
        console.error('Customer Dashboard DB query fallback:', err.message);

        // In-Memory Fallback
        const customer = inMemoryCustomers.find(c => c.customer_id === customerId) || {
            customer_id: customerId,
            name: req.customer.name,
            phone_number: req.customer.phone_number,
            address: 'North Zone Hub',
            store_credit_balance: 50.00
        };

        const custOrders = inMemoryOrders.filter(o => o.customer_id === customerId);
        const ordersWithItems = custOrders.map(o => {
            const driver = inMemoryDrivers.find(d => d.driver_id === o.driver_id);
            const items = inMemoryOrderItems
                .filter(oi => oi.order_id === o.order_id)
                .map(oi => {
                    const it = inMemoryItems.find(i => i.item_id === oi.item_id);
                    return {
                        order_id: o.order_id,
                        item_id: oi.item_id,
                        quantity: oi.quantity,
                        item_name: it ? it.name : `Item #${oi.item_id}`,
                        sku: it ? it.sku : `SKU-${oi.item_id}`
                    };
                });

            return {
                ...o,
                driver_name: driver ? driver.full_name : null,
                driver_rating: driver ? driver.rating : null,
                items
            };
        }).sort((a, b) => b.order_id - a.order_id);

        const custOrderIds = custOrders.map(o => o.order_id);
        const custReturns = inMemoryReturns
            .filter(r => custOrderIds.includes(r.order_id))
            .map(r => {
                const ord = custOrders.find(o => o.order_id === r.order_id);
                return {
                    ...r,
                    shipping_type: ord ? ord.shipping_type : 'Standard',
                    order_status: ord ? ord.order_status : 'Delivered'
                };
            })
            .sort((a, b) => b.return_id - a.return_id);

        const totalOrders = ordersWithItems.length;
        const activeOrders = ordersWithItems.filter(o => o.order_status !== 'Delivered' && o.order_status !== 'Cancelled').length;
        const deliveredOrders = ordersWithItems.filter(o => o.order_status === 'Delivered').length;
        const ratedOrders = ordersWithItems.filter(o => o.star_rating !== null);
        const avgRatingGiven = ratedOrders.length ? (ratedOrders.reduce((sum, o) => sum + o.star_rating, 0) / ratedOrders.length).toFixed(1) : null;
        const totalRefunds = custReturns.reduce((sum, r) => sum + parseFloat(r.refund_amount || 0), 0);

        return res.json({
            success: true,
            dashboard: {
                customer,
                orders: ordersWithItems,
                returns: custReturns,
                summary: {
                    totalOrders,
                    activeOrders,
                    deliveredOrders,
                    avgRatingGiven,
                    totalRefunds: totalRefunds.toFixed(2),
                    storeCreditBalance: parseFloat(customer.store_credit_balance || 0).toFixed(2)
                }
            }
        });
    }
});

// ============================================================================
// Submit Star Rating & Review for an Order
// ============================================================================
router.post('/orders/:orderId/review', authMiddleware, async (req, res) => {
    const customerId = req.customer.customer_id;
    const orderId = parseInt(req.params.orderId, 10);
    const { star_rating, review_comment } = req.body;

    const ratingVal = parseInt(star_rating, 10);
    if (!ratingVal || ratingVal < 1 || ratingVal > 5) {
        return res.status(400).json({ error: 'Please provide a valid rating between 1 and 5 stars.' });
    }

    try {
        const [result] = await pool.promise().query(
            'UPDATE Orders SET star_rating = ?, review_comment = ? WHERE order_id = ? AND customer_id = ?',
            [ratingVal, review_comment ? review_comment.trim() : null, orderId, customerId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found or not owned by you.' });
        }

        // Dynamically update Driver average rating if assigned
        try {
            const [driverRows] = await pool.promise().query('SELECT driver_id FROM Orders WHERE order_id = ?', [orderId]);
            if (driverRows.length > 0 && driverRows[0].driver_id) {
                const driverId = driverRows[0].driver_id;
                await pool.promise().query(
                    'UPDATE Drivers SET rating = (SELECT AVG(star_rating) FROM Orders WHERE driver_id = ? AND star_rating IS NOT NULL) WHERE driver_id = ?',
                    [driverId, driverId]
                );
            }
        } catch (subErr) {
            console.error('Driver rating update notice:', subErr.message);
        }

        return res.json({ success: true, message: 'Thank you! Your rating and review have been recorded.' });
    } catch (err) {
        console.error('Review DB Error:', err.message);
        // Fallback
        const order = inMemoryOrders.find(o => o.order_id === orderId && o.customer_id === customerId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }
        order.star_rating = ratingVal;
        order.review_comment = review_comment ? review_comment.trim() : null;
        return res.json({ success: true, message: 'Rating and review recorded (Demo session).' });
    }
});

// ============================================================================
// Submit Return Request for an Order
// ============================================================================
router.post('/orders/:orderId/return', authMiddleware, async (req, res) => {
    const customerId = req.customer.customer_id;
    const orderId = parseInt(req.params.orderId, 10);
    const { refund_amount, reason } = req.body;

    const refund = parseFloat(refund_amount) || 25.00;

    try {
        // Verify order belongs to customer
        const [ordRows] = await pool.promise().query(
            'SELECT order_id, order_status FROM Orders WHERE order_id = ? AND customer_id = ?',
            [orderId, customerId]
        );

        if (ordRows.length === 0) {
            return res.status(404).json({ error: 'Order not found or not owned by you.' });
        }

        const [result] = await pool.promise().query(
            'INSERT INTO Returns (status, refund_amount, date_requested, order_id) VALUES (?, ?, CURDATE(), ?)',
            ['Return Initiated', refund, orderId]
        );

        return res.status(201).json({
            success: true,
            message: 'Return request submitted successfully. Status: Return Initiated.',
            return_id: result.insertId
        });
    } catch (err) {
        console.error('Return DB Error:', err.message);
        const order = inMemoryOrders.find(o => o.order_id === orderId && o.customer_id === customerId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found in demo database.' });
        }

        const newReturnId = inMemoryReturns.length ? Math.max(...inMemoryReturns.map(r => r.return_id)) + 1 : 1;
        const newReturn = {
            return_id: newReturnId,
            status: 'Return Initiated',
            refund_amount: refund,
            date_requested: new Date().toISOString().split('T')[0],
            order_id: orderId
        };
        inMemoryReturns.push(newReturn);

        return res.status(201).json({
            success: true,
            message: 'Return request submitted successfully (Demo session). Status: Return Initiated.',
            return_id: newReturnId
        });
    }
});

// ============================================================================
// Place New Order (Interactive feature extension)
// ============================================================================
router.post('/orders', authMiddleware, async (req, res) => {
    const customerId = req.customer.customer_id;
    const { shipping_type, zip_code, address, items } = req.body;

    if (!zip_code || !address || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Please provide zip code, delivery address, and at least one item.' });
    }

    const shipType = (shipping_type === 'Express') ? 'Express' : 'Standard';

    try {
        const conn = await pool.promise().getConnection();
        try {
            await conn.beginTransaction();

            const [orderResult] = await conn.query(
                'INSERT INTO Orders (order_status, shipping_type, zip_code, address, customer_id) VALUES (?, ?, ?, ?, ?)',
                ['Pending', shipType, zip_code.trim(), address.trim(), customerId]
            );

            const newOrderId = orderResult.insertId;

            for (const it of items) {
                const itemId = parseInt(it.item_id, 10);
                const qty = parseInt(it.quantity, 10) || 1;
                if (itemId && qty > 0) {
                    await conn.query(
                        'INSERT INTO Order_Items (order_id, item_id, quantity) VALUES (?, ?, ?)',
                        [newOrderId, itemId, qty]
                    );
                }
            }

            await conn.commit();
            conn.release();

            return res.status(201).json({
                success: true,
                message: `Order #${newOrderId} placed successfully!`,
                order_id: newOrderId
            });
        } catch (txErr) {
            await conn.rollback();
            conn.release();
            throw txErr;
        }
    } catch (err) {
        console.error('Order Creation DB Error:', err.message);
        // Fallback
        const newOrderId = inMemoryOrders.length ? Math.max(...inMemoryOrders.map(o => o.order_id)) + 1 : 1;
        const newOrder = {
            order_id: newOrderId,
            order_status: 'Pending',
            shipping_type: shipType,
            zip_code: zip_code.trim(),
            address: address.trim(),
            star_rating: null,
            review_comment: null,
            customer_id: customerId,
            driver_id: null
        };
        inMemoryOrders.push(newOrder);

        for (const it of items) {
            const itemId = parseInt(it.item_id, 10);
            const qty = parseInt(it.quantity, 10) || 1;
            if (itemId && qty > 0) {
                inMemoryOrderItems.push({
                    order_id: newOrderId,
                    item_id: itemId,
                    quantity: qty
                });
            }
        }

        return res.status(201).json({
            success: true,
            message: `Order #${newOrderId} placed successfully (Demo session)!`,
            order_id: newOrderId
        });
    }
});

module.exports = {
    router,
    inMemoryOrders,
    inMemoryOrderItems,
    inMemoryReturns,
    inMemoryItems
};
