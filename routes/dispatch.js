const express = require('express');
const router = express.Router();
const pool = require('../db');
const { orders, drivers, customers, orderItems, items, warehouses, notifications } = require('./dataStore');

// Helper to extract or normalize zone from order address
function extractZone(address, zipCode) {
    if (!address && !zipCode) return 'North Zone';
    const addr = (address || '').toLowerCase();
    if (addr.includes('north zone') || zipCode === '10001') return 'North Zone';
    if (addr.includes('south zone') || zipCode === '10002') return 'South Zone';
    if (addr.includes('east zone') || zipCode === '10003') return 'East Zone';
    if (addr.includes('west zone') || zipCode === '10004') return 'West Zone';
    if (addr.includes('central zone') || zipCode === '10005') return 'Central Zone';
    return 'North Zone';
}

// ============================================================================
// 1. GET /api/dispatch/summary - Real-time Dispatch Dashboard KPI Metrics
// ============================================================================
router.get('/summary', async (req, res) => {
    try {
        const [pendingRows] = await pool.promise().query(
            `SELECT 
                COUNT(*) AS total_pending,
                SUM(CASE WHEN shipping_type = 'Express' THEN 1 ELSE 0 END) AS express_pending,
                SUM(CASE WHEN shipping_type = 'Standard' THEN 1 ELSE 0 END) AS standard_pending
             FROM Orders WHERE order_status = 'Pending'`
        );

        const [activeRows] = await pool.promise().query(
            `SELECT COUNT(*) AS out_for_delivery FROM Orders WHERE order_status IN ('Out for Delivery', 'Dispatched')`
        );

        const [deliveredRows] = await pool.promise().query(
            `SELECT COUNT(*) AS total_delivered FROM Orders WHERE order_status = 'Delivered'`
        );

        const [driverRows] = await pool.promise().query(
            `SELECT 
                COUNT(*) AS total_drivers,
                SUM(CASE WHEN status_flag = 'Available' THEN 1 ELSE 0 END) AS available_drivers,
                SUM(CASE WHEN status_flag IN ('Busy', 'On Trip') THEN 1 ELSE 0 END) AS busy_drivers
             FROM Drivers`
        );

        const [notifRows] = await pool.promise().query(
            `SELECT COUNT(*) AS total_notifications FROM Notification_Queue`
        );

        return res.json({
            success: true,
            summary: {
                totalPendingOrders: pendingRows[0].total_pending || 0,
                expressPending: pendingRows[0].express_pending || 0,
                standardPending: pendingRows[0].standard_pending || 0,
                outForDeliveryOrders: activeRows[0].out_for_delivery || 0,
                totalDeliveredOrders: deliveredRows[0].total_delivered || 0,
                totalDrivers: driverRows[0].total_drivers || 0,
                availableDrivers: driverRows[0].available_drivers || 0,
                busyDrivers: driverRows[0].busy_drivers || 0,
                totalNotificationsLogged: notifRows[0].total_notifications || 0
            }
        });
    } catch (err) {
        console.error('Dispatch summary fallback:', err.message);
        const pendingOrders = orders.filter(o => o.order_status === 'Pending');
        const expressPending = pendingOrders.filter(o => o.shipping_type === 'Express').length;
        const outForDelivery = orders.filter(o => ['Out for Delivery', 'Dispatched'].includes(o.order_status)).length;
        const delivered = orders.filter(o => o.order_status === 'Delivered').length;
        const availDrivers = drivers.filter(d => d.status_flag === 'Available').length;
        const busyDrivers = drivers.filter(d => ['Busy', 'On Trip'].includes(d.status_flag)).length;

        return res.json({
            success: true,
            summary: {
                totalPendingOrders: pendingOrders.length,
                expressPending,
                standardPending: pendingOrders.length - expressPending,
                outForDeliveryOrders: outForDelivery,
                totalDeliveredOrders: delivered,
                totalDrivers: drivers.length,
                availableDrivers: availDrivers,
                busyDrivers: busyDrivers,
                totalNotificationsLogged: notifications.length
            }
        });
    }
});

// ============================================================================
// 2. GET /api/dispatch/batches - Pending Orders Grouped by Location Zone
// FEATURE: Delivery Zone Grouper (Features.md - Moin's, Feature 3)
// ============================================================================
router.get('/batches', async (req, res) => {
    try {
        const sql = `
            SELECT 
                w.location_zone,
                w.warehouse_id,
                w.name AS warehouse_name,
                COUNT(o.order_id) AS pending_order_count,
                SUM(CASE WHEN o.shipping_type = 'Express' THEN 1 ELSE 0 END) AS express_count,
                SUM(CASE WHEN o.shipping_type = 'Standard' THEN 1 ELSE 0 END) AS standard_count
            FROM Warehouses w
            LEFT JOIN Orders o ON (o.address LIKE CONCAT('%', w.location_zone, '%') OR o.zip_code = CASE WHEN w.location_zone = 'North Zone' THEN '10001' WHEN w.location_zone = 'South Zone' THEN '10002' WHEN w.location_zone = 'East Zone' THEN '10003' WHEN w.location_zone = 'West Zone' THEN '10004' ELSE '' END) AND o.order_status = 'Pending'
            GROUP BY w.location_zone, w.warehouse_id, w.name
            ORDER BY pending_order_count DESC, express_count DESC
        `;
        const [batchRows] = await pool.promise().query(sql);

        // Fetch available drivers per zone
        const [driverRows] = await pool.promise().query(`
            SELECT driver_id, full_name, rating, base_rate, per_km_bonus, status_flag, location_zone
            FROM Drivers
            ORDER BY rating DESC
        `);

        const batchesWithDrivers = batchRows.map(b => {
            const zoneDrivers = driverRows.filter(d => d.location_zone === b.location_zone);
            const availableZoneDrivers = zoneDrivers.filter(d => d.status_flag === 'Available');
            return {
                ...b,
                pending_order_count: parseInt(b.pending_order_count, 10) || 0,
                express_count: parseInt(b.express_count, 10) || 0,
                standard_count: parseInt(b.standard_count, 10) || 0,
                assigned_drivers_count: zoneDrivers.length,
                available_drivers_count: availableZoneDrivers.length,
                available_drivers: availableZoneDrivers,
                all_zone_drivers: zoneDrivers
            };
        });

        return res.json({ success: true, batches: batchesWithDrivers });
    } catch (err) {
        console.error('Dispatch batches fallback:', err.message);

        const pendingOrders = orders.filter(o => o.order_status === 'Pending');
        const batchMap = {};

        warehouses.forEach(w => {
            batchMap[w.location_zone] = {
                location_zone: w.location_zone,
                warehouse_id: w.warehouse_id,
                warehouse_name: w.name,
                orders: [],
                pending_order_count: 0,
                express_count: 0,
                standard_count: 0
            };
        });

        pendingOrders.forEach(order => {
            const zone = extractZone(order.address, order.zip_code);
            if (!batchMap[zone]) {
                batchMap[zone] = {
                    location_zone: zone,
                    warehouse_id: null,
                    warehouse_name: `${zone} Center`,
                    orders: [],
                    pending_order_count: 0,
                    express_count: 0,
                    standard_count: 0
                };
            }
            batchMap[zone].orders.push(order);
            batchMap[zone].pending_order_count++;
            if (order.shipping_type === 'Express') {
                batchMap[zone].express_count++;
            } else {
                batchMap[zone].standard_count++;
            }
        });

        const batches = Object.values(batchMap).map(b => {
            const zoneDrivers = drivers.filter(d => d.location_zone === b.location_zone);
            const availableZoneDrivers = zoneDrivers.filter(d => d.status_flag === 'Available');
            return {
                ...b,
                assigned_drivers_count: zoneDrivers.length,
                available_drivers_count: availableZoneDrivers.length,
                available_drivers: availableZoneDrivers,
                all_zone_drivers: zoneDrivers
            };
        }).sort((a, b) => b.pending_order_count - a.pending_order_count);

        return res.json({ success: true, batches });
    }
});

// ============================================================================
// 3. GET /api/dispatch/orders - All Orders with Full Relational Data & Filters
// ============================================================================
router.get('/orders', async (req, res) => {
    const { status, zone, shipping_type } = req.query;

    try {
        let sql = `
            SELECT 
                o.order_id,
                o.order_status,
                o.shipping_type,
                o.zip_code,
                o.address,
                o.star_rating,
                o.review_comment,
                o.customer_id,
                c.name AS customer_name,
                c.phone_number AS customer_phone,
                o.driver_id,
                d.full_name AS driver_name,
                d.rating AS driver_rating,
                d.status_flag AS driver_status,
                d.location_zone AS driver_zone
            FROM Orders o
            JOIN Customer c ON o.customer_id = c.customer_id
            LEFT JOIN Drivers d ON o.driver_id = d.driver_id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            if (status === 'active') {
                sql += ` AND o.order_status IN ('Out for Delivery', 'Dispatched')`;
            } else {
                sql += ` AND o.order_status = ?`;
                params.push(status);
            }
        }

        if (zone && zone !== 'all') {
            sql += ` AND o.address LIKE ?`;
            params.push(`%${zone}%`);
        }

        if (shipping_type && shipping_type !== 'all') {
            sql += ` AND o.shipping_type = ?`;
            params.push(shipping_type);
        }

        sql += ` ORDER BY 
            CASE WHEN o.order_status = 'Pending' THEN 1 
                 WHEN o.order_status IN ('Out for Delivery', 'Dispatched') THEN 2 
                 ELSE 3 END ASC,
            CASE WHEN o.shipping_type = 'Express' THEN 1 ELSE 2 END ASC,
            o.order_id DESC`;

        const [orderRows] = await pool.promise().query(sql, params);

        let ordersWithItems = orderRows;
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
                const inferredZone = extractZone(order.address, order.zip_code);
                return {
                    ...order,
                    inferred_zone: inferredZone,
                    items: matchedItems
                };
            });
        }

        return res.json({ success: true, orders: ordersWithItems, total: ordersWithItems.length });
    } catch (err) {
        console.error('Dispatch orders fallback:', err.message);

        let filtered = orders.map(o => {
            const cust = customers.find(c => c.customer_id === o.customer_id) || { name: `Customer #${o.customer_id}`, phone_number: '+1-555-0000' };
            const driver = drivers.find(d => d.driver_id === o.driver_id) || null;
            const itemsInOrder = orderItems.filter(oi => oi.order_id === o.order_id).map(oi => {
                const itemObj = items.find(i => i.item_id === oi.item_id) || { name: `Item #${oi.item_id}`, sku: 'SKU' };
                return {
                    ...oi,
                    item_name: itemObj.name,
                    sku: itemObj.sku
                };
            });

            return {
                ...o,
                customer_name: cust.name,
                customer_phone: cust.phone_number,
                driver_name: driver ? driver.full_name : null,
                driver_rating: driver ? driver.rating : null,
                driver_status: driver ? driver.status_flag : null,
                driver_zone: driver ? driver.location_zone : null,
                inferred_zone: extractZone(o.address, o.zip_code),
                items: itemsInOrder
            };
        });

        if (status && status !== 'all') {
            if (status === 'active') {
                filtered = filtered.filter(o => ['Out for Delivery', 'Dispatched'].includes(o.order_status));
            } else {
                filtered = filtered.filter(o => o.order_status.toLowerCase() === status.toLowerCase());
            }
        }

        if (zone && zone !== 'all') {
            filtered = filtered.filter(o => o.inferred_zone.toLowerCase() === zone.toLowerCase());
        }

        if (shipping_type && shipping_type !== 'all') {
            filtered = filtered.filter(o => o.shipping_type.toLowerCase() === shipping_type.toLowerCase());
        }

        filtered.sort((a, b) => {
            const statusOrder = { 'Pending': 1, 'Out for Delivery': 2, 'Dispatched': 2, 'Delivered': 3 };
            const sA = statusOrder[a.order_status] || 4;
            const sB = statusOrder[b.order_status] || 4;
            if (sA !== sB) return sA - sB;
            if (a.shipping_type === 'Express' && b.shipping_type !== 'Express') return -1;
            if (b.shipping_type === 'Express' && a.shipping_type !== 'Express') return 1;
            return b.order_id - a.order_id;
        });

        return res.json({ success: true, orders: filtered, total: filtered.length });
    }
});

// ============================================================================
// 4. POST /api/dispatch/assign
// FEATURE: Order Dispatch & Notification (Features.md - Moin's, Feature 3)
// Assign a driver to a group of orders:
// 1. Set orders.driver_id = driverId
// 2. Flip order_status to "Out for Delivery"
// 3. Set driver's status_flag to "Busy"
// 4. Insert automated customer dispatch notification into Notification_Queue
// ============================================================================
router.post('/assign', async (req, res) => {
    const { driver_id, order_ids } = req.body;

    const driverId = parseInt(driver_id, 10);
    const orderIds = Array.isArray(order_ids) ? order_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : [parseInt(order_ids, 10)].filter(id => !isNaN(id));

    if (!driverId || orderIds.length === 0) {
        return res.status(400).json({ error: 'Please specify a valid driver_id and at least one order_id to dispatch.' });
    }

    const conn = await pool.promise().getConnection().catch(() => null);

    if (conn) {
        try {
            await conn.beginTransaction();

            // 1. Validate Driver
            const [driverRows] = await conn.query('SELECT driver_id, full_name, status_flag, location_zone FROM Drivers WHERE driver_id = ? FOR UPDATE', [driverId]);
            if (driverRows.length === 0) {
                await conn.rollback();
                conn.release();
                return res.status(404).json({ error: 'Driver not found.' });
            }
            const driver = driverRows[0];

            // 2. Update Orders: assign driver and set status to "Out for Delivery"
            const [updateOrdersRes] = await conn.query(
                `UPDATE Orders 
                 SET driver_id = ?, order_status = 'Out for Delivery' 
                 WHERE order_id IN (?)`,
                [driverId, orderIds]
            );

            // 3. Update Driver: set status_flag to "Busy"
            await conn.query(
                `UPDATE Drivers SET status_flag = 'Busy' WHERE driver_id = ?`,
                [driverId]
            );

            // 4. Fetch updated order customer details for dispatch notifications
            const [dispatchedOrders] = await conn.query(
                `SELECT o.order_id, o.shipping_type, o.address, o.customer_id, c.name AS customer_name, c.phone_number
                 FROM Orders o
                 JOIN Customer c ON o.customer_id = c.customer_id
                 WHERE o.order_id IN (?)`,
                [orderIds]
            );

            // 5. Generate and Insert Notifications into Notification_Queue
            const notificationsInserted = [];
            for (const ord of dispatchedOrders) {
                const priorityPrefix = ord.shipping_type === 'Express' ? '⚡ [Express Priority] ' : '';
                const msgPayload = `${priorityPrefix}LogiRoute Alert: Order #${ord.order_id} has been dispatched with driver ${driver.full_name} and is Out for Delivery to ${ord.address}!`;
                
                const [notifRes] = await conn.query(
                    `INSERT INTO Notification_Queue (order_id, customer_id, channel, recipient, message_payload, dispatch_status, sent_at)
                     VALUES (?, ?, 'SMS', ?, ?, 'Sent', NOW())`,
                    [ord.order_id, ord.customer_id, ord.phone_number || '+1-555-0100', msgPayload]
                );

                notificationsInserted.push({
                    notification_id: notifRes.insertId,
                    order_id: ord.order_id,
                    customer_id: ord.customer_id,
                    channel: 'SMS',
                    recipient: ord.phone_number,
                    message_payload: msgPayload,
                    dispatch_status: 'Sent'
                });
            }

            await conn.commit();
            conn.release();

            return res.json({
                success: true,
                message: `Successfully dispatched ${orderIds.length} order(s) to ${driver.full_name}. Order status updated to "Out for Delivery" and driver status set to "Busy".`,
                dispatched_count: updateOrdersRes.affectedRows,
                driver: {
                    driver_id: driver.driver_id,
                    full_name: driver.full_name,
                    status_flag: 'Busy'
                },
                order_ids: orderIds,
                notifications: notificationsInserted
            });
        } catch (dbErr) {
            if (conn) {
                await conn.rollback();
                conn.release();
            }
            console.error('Dispatch assign DB error:', dbErr.message);
        }
    }

    // In-memory fallback
    const driver = drivers.find(d => d.driver_id === driverId);
    if (!driver) return res.status(404).json({ error: 'Driver not found.' });

    driver.status_flag = 'Busy';

    const dispatchedOrders = [];
    const newNotifications = [];

    orderIds.forEach(oId => {
        const order = orders.find(o => o.order_id === oId);
        if (order) {
            order.driver_id = driverId;
            order.order_status = 'Out for Delivery';
            dispatchedOrders.push(order);

            const cust = customers.find(c => c.customer_id === order.customer_id) || { name: 'Valued Customer', phone_number: '+1-555-0100' };
            const priorityPrefix = order.shipping_type === 'Express' ? '⚡ [Express Priority] ' : '';
            const msgPayload = `${priorityPrefix}LogiRoute Alert: Order #${order.order_id} has been dispatched with driver ${driver.full_name} and is Out for Delivery to ${order.address}!`;

            const notifId = notifications.length ? Math.max(...notifications.map(n => n.notification_id)) + 1 : 1;
            const notifObj = {
                notification_id: notifId,
                order_id: order.order_id,
                customer_id: order.customer_id,
                channel: 'SMS',
                recipient: cust.phone_number,
                message_payload: msgPayload,
                dispatch_status: 'Sent',
                created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
                sent_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
            };
            notifications.unshift(notifObj);
            newNotifications.push(notifObj);
        }
    });

    return res.json({
        success: true,
        message: `Successfully dispatched ${dispatchedOrders.length} order(s) to ${driver.full_name} (Demo session). Order status set to "Out for Delivery" and driver status set to "Busy".`,
        dispatched_count: dispatchedOrders.length,
        driver: {
            driver_id: driver.driver_id,
            full_name: driver.full_name,
            status_flag: driver.status_flag
        },
        order_ids: orderIds,
        notifications: newNotifications
    });
});

// ============================================================================
// 5. POST /api/dispatch/assign-zone - One-Click Batch Dispatch by Zone
// ============================================================================
router.post('/assign-zone', async (req, res) => {
    const { driver_id, location_zone } = req.body;
    const driverId = parseInt(driver_id, 10);

    if (!driverId || !location_zone) {
        return res.status(400).json({ error: 'Please provide driver_id and location_zone.' });
    }

    try {
        // Fetch all pending orders for this zone
        const [pendingRows] = await pool.promise().query(
            `SELECT order_id FROM Orders WHERE order_status = 'Pending' AND address LIKE ?`,
            [`%${location_zone}%`]
        );

        if (pendingRows.length === 0) {
            return res.status(400).json({ error: `No pending orders found in ${location_zone} to dispatch.` });
        }

        const orderIds = pendingRows.map(r => r.order_id);

        // Execute batch dispatch via internal handler logic
        const [driverRows] = await pool.promise().query('SELECT driver_id, full_name FROM Drivers WHERE driver_id = ?', [driverId]);
        const driver = driverRows[0] || { driver_id: driverId, full_name: `Driver #${driverId}` };

        await pool.promise().query(`UPDATE Orders SET driver_id = ?, order_status = 'Out for Delivery' WHERE order_id IN (?)`, [driverId, orderIds]);
        await pool.promise().query(`UPDATE Drivers SET status_flag = 'Busy' WHERE driver_id = ?`, [driverId]);

        // Insert notifications
        for (const oId of orderIds) {
            await pool.promise().query(
                `INSERT INTO Notification_Queue (order_id, customer_id, channel, recipient, message_payload, dispatch_status)
                 SELECT o.order_id, o.customer_id, 'SMS', c.phone_number, 
                        CONCAT('LogiRoute Alert: Order #', o.order_id, ' has been dispatched to ', d.full_name, ' and is Out for Delivery!'), 'Sent'
                 FROM Orders o
                 JOIN Customer c ON o.customer_id = c.customer_id
                 JOIN Drivers d ON d.driver_id = ?
                 WHERE o.order_id = ?`,
                [driverId, oId]
            );
        }

        return res.json({
            success: true,
            message: `Batch dispatched all ${orderIds.length} pending orders in ${location_zone} to ${driver.full_name}.`,
            dispatched_count: orderIds.length,
            order_ids: orderIds,
            driver: { driver_id: driverId, full_name: driver.full_name, status_flag: 'Busy' }
        });
    } catch (err) {
        console.error('Assign zone fallback:', err.message);
        const zonePending = orders.filter(o => o.order_status === 'Pending' && extractZone(o.address, o.zip_code).toLowerCase() === location_zone.toLowerCase());

        if (zonePending.length === 0) {
            return res.status(400).json({ error: `No pending orders found in ${location_zone} to dispatch.` });
        }

        const driver = drivers.find(d => d.driver_id === driverId);
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });

        driver.status_flag = 'Busy';
        const orderIds = zonePending.map(o => o.order_id);

        zonePending.forEach(o => {
            o.driver_id = driverId;
            o.order_status = 'Out for Delivery';
            const cust = customers.find(c => c.customer_id === o.customer_id);
            const notifId = notifications.length ? Math.max(...notifications.map(n => n.notification_id)) + 1 : 1;
            notifications.unshift({
                notification_id: notifId,
                order_id: o.order_id,
                customer_id: o.customer_id,
                channel: 'SMS',
                recipient: cust?.phone_number || '+1-555-0100',
                message_payload: `LogiRoute Alert: Order #${o.order_id} (${location_zone}) is Out for Delivery with ${driver.full_name}!`,
                dispatch_status: 'Sent',
                created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
                sent_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
            });
        });

        return res.json({
            success: true,
            message: `Batch dispatched all ${orderIds.length} pending orders in ${location_zone} to ${driver.full_name} (Demo session).`,
            dispatched_count: orderIds.length,
            order_ids: orderIds,
            driver: { driver_id: driverId, full_name: driver.full_name, status_flag: 'Busy' }
        });
    }
});

// ============================================================================
// 6. GET /api/dispatch/driver-queue/:driverId
// Priority delivery queue for a driver (Express Lane Skipper)
// ============================================================================
router.get('/driver-queue/:driverId', async (req, res) => {
    const driverId = parseInt(req.params.driverId, 10);

    try {
        const [driverRows] = await pool.promise().query('SELECT driver_id, full_name, status_flag, rating, location_zone FROM Drivers WHERE driver_id = ?', [driverId]);
        if (driverRows.length === 0) return res.status(404).json({ error: 'Driver not found.' });

        const [orderRows] = await pool.promise().query(
            `SELECT 
                o.order_id, 
                o.order_status, 
                o.shipping_type, 
                o.zip_code, 
                o.address, 
                o.customer_id, 
                c.name AS customer_name, 
                c.phone_number
             FROM Orders o
             JOIN Customer c ON o.customer_id = c.customer_id
             WHERE o.driver_id = ? AND o.order_status IN ('Out for Delivery', 'Dispatched')
             ORDER BY 
                 CASE WHEN o.shipping_type = 'Express' THEN 1 ELSE 2 END,
                 o.order_id ASC`,
            [driverId]
        );

        let queueWithItems = orderRows;
        if (orderRows.length > 0) {
            const orderIds = orderRows.map(o => o.order_id);
            const [itemRows] = await pool.promise().query(
                `SELECT oi.order_id, oi.item_id, oi.quantity, i.name AS item_name, i.sku
                 FROM Order_Items oi
                 JOIN Items i ON oi.item_id = i.item_id
                 WHERE oi.order_id IN (?)`,
                [orderIds]
            );

            queueWithItems = orderRows.map(ord => ({
                ...ord,
                items: itemRows.filter(i => i.order_id === ord.order_id)
            }));
        }

        return res.json({
            success: true,
            driver: driverRows[0],
            queue: queueWithItems,
            queue_length: queueWithItems.length
        });
    } catch (err) {
        console.error('Driver queue fallback:', err.message);
        const driver = drivers.find(d => d.driver_id === driverId);
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });

        const queue = orders
            .filter(o => o.driver_id === driverId && ['Out for Delivery', 'Dispatched'].includes(o.order_status))
            .map(o => {
                const cust = customers.find(c => c.customer_id === o.customer_id) || { name: 'Customer', phone_number: '+1-555-0100' };
                const itemsList = orderItems.filter(oi => oi.order_id === o.order_id).map(oi => {
                    const itemObj = items.find(i => i.item_id === oi.item_id) || { name: 'Item', sku: 'SKU' };
                    return { ...oi, item_name: itemObj.name, sku: itemObj.sku };
                });
                return {
                    ...o,
                    customer_name: cust.name,
                    customer_phone: cust.phone_number,
                    items: itemsList
                };
            })
            .sort((a, b) => {
                if (a.shipping_type === 'Express' && b.shipping_type !== 'Express') return -1;
                if (b.shipping_type === 'Express' && a.shipping_type !== 'Express') return 1;
                return a.order_id - b.order_id;
            });

        return res.json({
            success: true,
            driver,
            queue,
            queue_length: queue.length
        });
    }
});

// ============================================================================
// 7. POST /api/dispatch/orders/:orderId/deliver - Complete Delivery
// ============================================================================
router.post('/orders/:orderId/deliver', async (req, res) => {
    const orderId = parseInt(req.params.orderId, 10);

    try {
        const [orderRows] = await pool.promise().query(
            'SELECT o.order_id, o.order_status, o.driver_id, o.customer_id, c.name as customer_name, c.phone_number, d.full_name as driver_name FROM Orders o JOIN Customer c ON o.customer_id = c.customer_id LEFT JOIN Drivers d ON o.driver_id = d.driver_id WHERE o.order_id = ?',
            [orderId]
        );

        if (orderRows.length === 0) return res.status(404).json({ error: 'Order not found.' });
        const order = orderRows[0];

        // Update Order to Delivered
        await pool.promise().query(`UPDATE Orders SET order_status = 'Delivered' WHERE order_id = ?`, [orderId]);

        // Check if driver has any remaining active deliveries
        let driverFreed = false;
        if (order.driver_id) {
            const [activeRemaining] = await pool.promise().query(
                `SELECT COUNT(*) as count FROM Orders WHERE driver_id = ? AND order_status IN ('Out for Delivery', 'Dispatched')`,
                [order.driver_id]
            );
            if ((activeRemaining[0]?.count || 0) === 0) {
                await pool.promise().query(`UPDATE Drivers SET status_flag = 'Available' WHERE driver_id = ?`, [order.driver_id]);
                driverFreed = true;
            }
        }

        // Log delivery confirmation notification
        const msg = `LogiRoute Alert: Order #${orderId} has been successfully delivered by ${order.driver_name || 'your driver'}. Thank you for using LogiRoute!`;
        await pool.promise().query(
            `INSERT INTO Notification_Queue (order_id, customer_id, channel, recipient, message_payload, dispatch_status)
             VALUES (?, ?, 'SMS', ?, ?, 'Delivered')`,
            [orderId, order.customer_id, order.phone_number, msg]
        );

        return res.json({
            success: true,
            message: `Order #${orderId} marked as Delivered! Confirmation notification logged.${driverFreed ? ' Driver is now Available.' : ''}`,
            order_id: orderId,
            order_status: 'Delivered',
            driver_freed: driverFreed
        });
    } catch (err) {
        console.error('Deliver fallback:', err.message);
        const order = orders.find(o => o.order_id === orderId);
        if (!order) return res.status(404).json({ error: 'Order not found.' });

        order.order_status = 'Delivered';
        const driver = drivers.find(d => d.driver_id === order.driver_id);
        const cust = customers.find(c => c.customer_id === order.customer_id);

        let driverFreed = false;
        if (driver) {
            const remaining = orders.filter(o => o.driver_id === driver.driver_id && ['Out for Delivery', 'Dispatched'].includes(o.order_status));
            if (remaining.length === 0) {
                driver.status_flag = 'Available';
                driverFreed = true;
            }
        }

        const notifId = notifications.length ? Math.max(...notifications.map(n => n.notification_id)) + 1 : 1;
        notifications.unshift({
            notification_id: notifId,
            order_id: orderId,
            customer_id: order.customer_id,
            channel: 'SMS',
            recipient: cust?.phone_number || '+1-555-0100',
            message_payload: `LogiRoute Alert: Order #${orderId} has been successfully delivered by ${driver?.full_name || 'Driver'}. Thank you!`,
            dispatch_status: 'Delivered',
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
            sent_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
        });

        return res.json({
            success: true,
            message: `Order #${orderId} marked as Delivered (Demo session)!${driverFreed ? ' Driver is now Available.' : ''}`,
            order_id: orderId,
            order_status: 'Delivered',
            driver_freed: driverFreed
        });
    }
});

module.exports = {
    router
};
