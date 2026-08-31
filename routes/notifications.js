const express = require('express');
const router = express.Router();
const pool = require('../db');
const { notifications, orders, customers } = require('./dataStore');

// ============================================================================
// 1. GET /api/notifications - List Notification Queue Logs with Filters
// ============================================================================
router.get('/', async (req, res) => {
    const { channel, status, order_id } = req.query;

    try {
        let sql = `
            SELECT 
                nq.notification_id,
                nq.order_id,
                nq.customer_id,
                nq.channel,
                nq.recipient,
                nq.message_payload,
                nq.dispatch_status,
                nq.created_at,
                nq.sent_at,
                o.order_status,
                o.shipping_type,
                o.address,
                c.name AS customer_name
            FROM Notification_Queue nq
            LEFT JOIN Orders o ON nq.order_id = o.order_id
            LEFT JOIN Customer c ON nq.customer_id = c.customer_id
            WHERE 1=1
        `;
        const params = [];

        if (channel && channel !== 'all') {
            sql += ' AND nq.channel = ?';
            params.push(channel);
        }

        if (status && status !== 'all') {
            sql += ' AND nq.dispatch_status = ?';
            params.push(status);
        }

        if (order_id) {
            sql += ' AND nq.order_id = ?';
            params.push(parseInt(order_id, 10));
        }

        sql += ' ORDER BY nq.notification_id DESC';

        const [rows] = await pool.promise().query(sql, params);
        return res.json({ success: true, notifications: rows, total: rows.length });
    } catch (err) {
        console.error('Notifications query fallback:', err.message);

        let filtered = notifications.map(n => {
            const ord = orders.find(o => o.order_id === n.order_id);
            const cust = customers.find(c => c.customer_id === n.customer_id);
            return {
                ...n,
                order_status: ord ? ord.order_status : 'Pending',
                shipping_type: ord ? ord.shipping_type : 'Standard',
                address: ord ? ord.address : '',
                customer_name: cust ? cust.name : `Customer #${n.customer_id}`
            };
        });

        if (channel && channel !== 'all') {
            filtered = filtered.filter(n => n.channel.toLowerCase() === channel.toLowerCase());
        }

        if (status && status !== 'all') {
            filtered = filtered.filter(n => n.dispatch_status.toLowerCase() === status.toLowerCase());
        }

        if (order_id) {
            filtered = filtered.filter(n => n.order_id === parseInt(order_id, 10));
        }

        filtered.sort((a, b) => b.notification_id - a.notification_id);

        return res.json({ success: true, notifications: filtered, total: filtered.length });
    }
});

// ============================================================================
// 2. GET /api/notifications/stats - Notification KPI Metrics
// ============================================================================
router.get('/stats', async (req, res) => {
    try {
        const [rows] = await pool.promise().query(
            `SELECT channel, dispatch_status FROM Notification_Queue`
        );

        const stats = {
            total_notifications: rows.length,
            sms_count: rows.filter(n => n.channel === 'SMS').length,
            email_count: rows.filter(n => n.channel === 'Email').length,
            delivered_count: rows.filter(n => n.dispatch_status === 'Delivered').length,
            sent_count: rows.filter(n => n.dispatch_status === 'Sent').length
        };

        return res.json({ success: true, stats });
    } catch (err) {
        console.error('Notification stats error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch notification stats' });
    }
});

// ============================================================================
// 3. POST /api/notifications/simulate - Text & Email Notification Simulator
// (Features.md - Moin's, Feature 3 & Technical Manual F11)
// ============================================================================
router.post('/simulate', async (req, res) => {
    const { order_id, channel, message_payload, recipient } = req.body;
    const orderId = parseInt(order_id, 10);

    if (!orderId || !message_payload) {
        return res.status(400).json({ error: 'Please provide order_id and message_payload.' });
    }

    const ch = channel === 'Email' ? 'Email' : 'SMS';

    try {
        const [orderRows] = await pool.promise().query(
            'SELECT o.order_id, o.customer_id, c.name as customer_name, c.phone_number FROM Orders o JOIN Customer c ON o.customer_id = c.customer_id WHERE o.order_id = ?',
            [orderId]
        );

        if (orderRows.length === 0) return res.status(404).json({ error: 'Order not found.' });
        const ord = orderRows[0];

        const targetRecipient = recipient || (ch === 'Email' ? `${ord.customer_name.toLowerCase().replace(/\s+/g, '.')}@example.com` : ord.phone_number);

        const [result] = await pool.promise().query(
            `INSERT INTO Notification_Queue (order_id, customer_id, channel, recipient, message_payload, dispatch_status)
             VALUES (?, ?, ?, ?, ?, 'Sent')`,
            [orderId, ord.customer_id, ch, targetRecipient, message_payload]
        );

        return res.status(201).json({
            success: true,
            message: `${ch} notification sent to ${targetRecipient} for Order #${orderId}.`,
            notification: {
                notification_id: result.insertId,
                order_id: orderId,
                customer_id: ord.customer_id,
                channel: ch,
                recipient: targetRecipient,
                message_payload,
                dispatch_status: 'Sent',
                sent_at: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error('Simulate notification fallback:', err.message);
        const ord = orders.find(o => o.order_id === orderId);
        if (!ord) return res.status(404).json({ error: 'Order not found.' });

        const cust = customers.find(c => c.customer_id === ord.customer_id);
        const targetRecipient = recipient || (ch === 'Email' ? `${(cust ? cust.name : 'customer').toLowerCase().replace(/\s+/g, '.')}@example.com` : (cust ? cust.phone_number : '+1-555-0100'));

        const notifId = notifications.length ? Math.max(...notifications.map(n => n.notification_id)) + 1 : 1;
        const newNotif = {
            notification_id: notifId,
            order_id: orderId,
            customer_id: ord.customer_id,
            channel: ch,
            recipient: targetRecipient,
            message_payload,
            dispatch_status: 'Sent',
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
            sent_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
        notifications.unshift(newNotif);

        return res.status(201).json({
            success: true,
            message: `${ch} notification sent to ${targetRecipient} for Order #${orderId} (Demo session).`,
            notification: newNotif
        });
    }
});

module.exports = {
    router
};
