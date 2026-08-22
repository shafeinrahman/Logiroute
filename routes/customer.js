const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('./auth');
const { customers, orders, orderItems, items, returns, drivers } = require('./dataStore');

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
                const matchedItems = itemRows.filter(it => it.order_id === order.order_id);
                return {
                    ...order,
                    items: matchedItems
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
        const customer = customers.find(c => c.customer_id === customerId) || {
            customer_id: customerId,
            name: req.customer.name,
            phone_number: req.customer.phone_number,
            address: 'North Zone Hub',
            store_credit_balance: 50.00
        };

        const custOrders = orders.filter(o => o.customer_id === customerId);
        const ordersWithItems = custOrders.map(o => {
            const driver = drivers.find(d => d.driver_id === o.driver_id);
            const matchedItems = orderItems
                .filter(oi => oi.order_id === o.order_id)
                .map(oi => {
                    const it = items.find(i => i.item_id === oi.item_id);
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
                items: matchedItems
            };
        }).sort((a, b) => b.order_id - a.order_id);

        const custOrderIds = custOrders.map(o => o.order_id);
        const custReturns = returns
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
        const order = orders.find(o => o.order_id === orderId && o.customer_id === customerId);
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
        const order = orders.find(o => o.order_id === orderId && o.customer_id === customerId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found in demo database.' });
        }

        const newReturnId = returns.length ? Math.max(...returns.map(r => r.return_id)) + 1 : 1;
        const newReturn = {
            return_id: newReturnId,
            status: 'Return Initiated',
            refund_amount: refund,
            date_requested: new Date().toISOString().split('T')[0],
            order_id: orderId
        };
        returns.push(newReturn);

        return res.status(201).json({
            success: true,
            message: 'Return request submitted successfully (Demo session). Status: Return Initiated.',
            return_id: newReturnId
        });
    }
});

// ============================================================================
// Place New Order
// ============================================================================
router.post('/orders', authMiddleware, async (req, res) => {
    const customerId = req.customer.customer_id;
    const { shipping_type, zip_code, address, items: orderItemsInput } = req.body;

    if (!zip_code || !address || !orderItemsInput || !Array.isArray(orderItemsInput) || orderItemsInput.length === 0) {
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

            for (const it of orderItemsInput) {
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
        const newOrderId = orders.length ? Math.max(...orders.map(o => o.order_id)) + 1 : 1;
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
        orders.push(newOrder);

        for (const it of orderItemsInput) {
            const itemId = parseInt(it.item_id, 10);
            const qty = parseInt(it.quantity, 10) || 1;
            if (itemId && qty > 0) {
                orderItems.push({
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
    router
};
