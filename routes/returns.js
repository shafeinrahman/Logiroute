const express = require('express');
const router = express.Router();
const pool = require('../db');
const { returns, orders, customers, orderItems, items, notifications, warehouseStocks } = require('./dataStore');

// Helper to determine next logical statuses in return workflow
function getWorkflowMeta(status) {
    switch (status) {
        case 'Return Initiated':
            return {
                step: 1,
                nextStatus: 'Mailed Back',
                nextActionLabel: 'Mark as Mailed Back 📦',
                badgeClass: 'badge-pending',
                description: 'Return request submitted. Awaiting package drop-off / carrier dispatch.'
            };
        case 'Mailed Back':
            return {
                step: 2,
                nextStatus: 'Arrived at Warehouse',
                nextActionLabel: 'Confirm Arrived at Warehouse 🏢',
                badgeClass: 'badge-dispatched',
                description: 'Package in transit via carrier back to fulfillment depot.'
            };
        case 'Arrived at Warehouse':
            return {
                step: 3,
                nextStatus: 'Refund Approved',
                nextActionLabel: 'Approve & Credit Refund 💳',
                badgeClass: 'badge-review',
                description: 'Package arrived at hub warehouse. Ready for inspection and store credit refund.'
            };
        case 'Refund Approved':
        case 'Refund Credited':
        case 'Completed':
            return {
                step: 4,
                nextStatus: null,
                nextActionLabel: null,
                badgeClass: 'badge-delivered',
                description: 'Return inspected and full refund amount credited to customer store balance.'
            };
        default:
            return {
                step: 1,
                nextStatus: 'Mailed Back',
                nextActionLabel: 'Advance Workflow',
                badgeClass: 'badge-pending',
                description: status
            };
    }
}

// ============================================================================
// 1. GET /api/returns - List All Returns with Order, Customer & Item Joins
// FEATURE: Return Tracking
// Tables: Returns, Orders, Customer, Order_Items, Items
// ============================================================================
router.get('/', async (req, res) => {
    const { status, search, customer_id, order_id } = req.query;

    try {
        let sql = `
            SELECT
                r.return_id,
                r.status,
                r.refund_amount,
                r.date_requested,
                r.order_id,
                o.order_status,
                o.shipping_type,
                o.zip_code,
                o.address,
                o.star_rating,
                o.customer_id,
                c.name AS customer_name,
                c.phone_number AS customer_phone,
                c.store_credit_balance,
                d.driver_id,
                d.full_name AS driver_name
            FROM Returns r
            JOIN Orders o ON r.order_id = o.order_id
            JOIN Customer c ON o.customer_id = c.customer_id
            LEFT JOIN Drivers d ON o.driver_id = d.driver_id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            sql += ` AND r.status = ?`;
            params.push(status);
        }

        if (customer_id) {
            sql += ` AND o.customer_id = ?`;
            params.push(parseInt(customer_id, 10));
        }

        if (order_id) {
            sql += ` AND r.order_id = ?`;
            params.push(parseInt(order_id, 10));
        }

        if (search && search.trim()) {
            sql += ` AND (c.name LIKE ? OR c.phone_number LIKE ? OR o.address LIKE ? OR CAST(r.return_id AS CHAR) = ? OR CAST(r.order_id AS CHAR) = ?)`;
            const s = `%${search.trim()}%`;
            params.push(s, s, s, search.trim(), search.trim());
        }

        sql += ` ORDER BY r.return_id DESC`;

        const [returnRows] = await pool.promise().query(sql, params);

        let fullReturns = returnRows;
        if (returnRows.length > 0) {
            const orderIds = [...new Set(returnRows.map(r => r.order_id))];
            const [itemRows] = await pool.promise().query(
                `SELECT oi.order_id, oi.item_id, oi.quantity, i.name AS item_name, i.sku
                 FROM Order_Items oi
                 JOIN Items i ON oi.item_id = i.item_id
                 WHERE oi.order_id IN (?)`,
                [orderIds]
            );

            fullReturns = returnRows.map(r => {
                const matchedItems = itemRows.filter(it => it.order_id === r.order_id);
                const meta = getWorkflowMeta(r.status);
                return {
                    ...r,
                    refund_amount: parseFloat(r.refund_amount || 0).toFixed(2),
                    workflow: meta,
                    items: matchedItems
                };
            });
        }

        return res.json({
            success: true,
            totalReturns: fullReturns.length,
            returns: fullReturns
        });
    } catch (err) {
        console.error('Returns query fallback:', err.message);

        let filtered = returns.map(r => {
            const ord = orders.find(o => o.order_id === r.order_id) || {
                order_id: r.order_id,
                order_status: 'Delivered',
                shipping_type: 'Standard',
                zip_code: '10001',
                address: '124 Elm Street, North Zone',
                customer_id: 1,
                driver_id: 1
            };

            const cust = customers.find(c => c.customer_id === ord.customer_id) || {
                customer_id: ord.customer_id,
                name: `Customer #${ord.customer_id}`,
                phone_number: '+1-555-0100',
                store_credit_balance: 0.00
            };

            const matchedItems = orderItems
                .filter(oi => oi.order_id === r.order_id)
                .map(oi => {
                    const itemObj = items.find(i => i.item_id === oi.item_id) || { name: `Item #${oi.item_id}`, sku: `SKU-${oi.item_id}` };
                    return {
                        order_id: r.order_id,
                        item_id: oi.item_id,
                        quantity: oi.quantity,
                        item_name: itemObj.name,
                        sku: itemObj.sku
                    };
                });

            const meta = getWorkflowMeta(r.status);

            return {
                return_id: r.return_id,
                status: r.status,
                refund_amount: parseFloat(r.refund_amount || 0).toFixed(2),
                date_requested: r.date_requested,
                order_id: r.order_id,
                reason: r.reason || 'Customer return request',
                order_status: ord.order_status,
                shipping_type: ord.shipping_type,
                zip_code: ord.zip_code,
                address: ord.address,
                star_rating: ord.star_rating,
                customer_id: cust.customer_id,
                customer_name: cust.name,
                customer_phone: cust.phone_number,
                store_credit_balance: parseFloat(cust.store_credit_balance || 0).toFixed(2),
                workflow: meta,
                items: matchedItems
            };
        });

        if (status && status !== 'all') {
            filtered = filtered.filter(r => r.status.toLowerCase() === status.toLowerCase());
        }

        if (customer_id) {
            filtered = filtered.filter(r => r.customer_id === parseInt(customer_id, 10));
        }

        if (order_id) {
            filtered = filtered.filter(r => r.order_id === parseInt(order_id, 10));
        }

        if (search && search.trim()) {
            const s = search.trim().toLowerCase();
            filtered = filtered.filter(r =>
                r.customer_name.toLowerCase().includes(s) ||
                r.customer_phone.includes(s) ||
                r.address.toLowerCase().includes(s) ||
                String(r.return_id) === s ||
                String(r.order_id) === s
            );
        }

        filtered.sort((a, b) => b.return_id - a.return_id);

        return res.json({
            success: true,
            totalReturns: filtered.length,
            returns: filtered
        });
    }
});

// ============================================================================
// 2. GET /api/returns/kpis - Return Metrics & Pipeline Summary
// ============================================================================
router.get('/kpis', async (req, res) => {
    try {
        const [statsRows] = await pool.promise().query(`
            SELECT
                COUNT(*) AS total_returns,
                SUM(CASE WHEN status = 'Return Initiated' THEN 1 ELSE 0 END) AS initiated_count,
                SUM(CASE WHEN status = 'Mailed Back' THEN 1 ELSE 0 END) AS mailed_back_count,
                SUM(CASE WHEN status = 'Arrived at Warehouse' THEN 1 ELSE 0 END) AS arrived_warehouse_count,
                SUM(CASE WHEN status IN ('Refund Approved', 'Refund Credited', 'Completed') THEN 1 ELSE 0 END) AS approved_count,
                COALESCE(SUM(refund_amount), 0) AS total_refund_volume,
                COALESCE(SUM(CASE WHEN status IN ('Refund Approved', 'Refund Credited', 'Completed') THEN refund_amount ELSE 0 END), 0) AS credited_refund_total,
                COALESCE(SUM(CASE WHEN status NOT IN ('Refund Approved', 'Refund Credited', 'Completed') THEN refund_amount ELSE 0 END), 0) AS pending_refund_total
            FROM Returns
        `);

        const stats = statsRows[0];
        return res.json({
            success: true,
            kpis: {
                totalReturns: stats.total_returns || 0,
                initiatedCount: stats.initiated_count || 0,
                mailedBackCount: stats.mailed_back_count || 0,
                arrivedWarehouseCount: stats.arrived_warehouse_count || 0,
                approvedCount: stats.approved_count || 0,
                totalRefundVolume: parseFloat(stats.total_refund_volume || 0).toFixed(2),
                creditedRefundTotal: parseFloat(stats.credited_refund_total || 0).toFixed(2),
                pendingRefundTotal: parseFloat(stats.pending_refund_total || 0).toFixed(2)
            }
        });
    } catch (err) {
        console.error('Returns KPIs fallback:', err.message);

        const totalReturns = returns.length;
        const initiatedCount = returns.filter(r => r.status === 'Return Initiated').length;
        const mailedBackCount = returns.filter(r => r.status === 'Mailed Back').length;
        const arrivedWarehouseCount = returns.filter(r => r.status === 'Arrived at Warehouse').length;
        const approvedCount = returns.filter(r => ['Refund Approved', 'Refund Credited', 'Completed'].includes(r.status)).length;

        const totalRefundVolume = returns.reduce((sum, r) => sum + (parseFloat(r.refund_amount) || 0), 0);
        const creditedRefundTotal = returns
            .filter(r => ['Refund Approved', 'Refund Credited', 'Completed'].includes(r.status))
            .reduce((sum, r) => sum + (parseFloat(r.refund_amount) || 0), 0);
        const pendingRefundTotal = totalRefundVolume - creditedRefundTotal;

        return res.json({
            success: true,
            kpis: {
                totalReturns,
                initiatedCount,
                mailedBackCount,
                arrivedWarehouseCount,
                approvedCount,
                totalRefundVolume: totalRefundVolume.toFixed(2),
                creditedRefundTotal: creditedRefundTotal.toFixed(2),
                pendingRefundTotal: pendingRefundTotal.toFixed(2)
            }
        });
    }
});

// ============================================================================
// 3. GET /api/returns/:returnId - Single Return Details
// ============================================================================
router.get('/:returnId', async (req, res) => {
    const returnId = parseInt(req.params.returnId, 10);

    try {
        const [rows] = await pool.promise().query(
            `SELECT
                r.return_id,
                r.status,
                r.refund_amount,
                r.date_requested,
                r.order_id,
                o.order_status,
                o.shipping_type,
                o.zip_code,
                o.address,
                o.star_rating,
                o.review_comment,
                o.customer_id,
                c.name AS customer_name,
                c.phone_number AS customer_phone,
                c.store_credit_balance,
                d.driver_id,
                d.full_name AS driver_name
            FROM Returns r
            JOIN Orders o ON r.order_id = o.order_id
            JOIN Customer c ON o.customer_id = c.customer_id
            LEFT JOIN Drivers d ON o.driver_id = d.driver_id
            WHERE r.return_id = ?`,
            [returnId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Return record not found.' });
        }

        const ret = rows[0];
        const [itemRows] = await pool.promise().query(
            `SELECT oi.order_id, oi.item_id, oi.quantity, i.name AS item_name, i.sku
             FROM Order_Items oi
             JOIN Items i ON oi.item_id = i.item_id
             WHERE oi.order_id = ?`,
            [ret.order_id]
        );

        return res.json({
            success: true,
            returnRecord: {
                ...ret,
                refund_amount: parseFloat(ret.refund_amount || 0).toFixed(2),
                workflow: getWorkflowMeta(ret.status),
                items: itemRows
            }
        });
    } catch (err) {
        console.error('Single return fallback:', err.message);
        const ret = returns.find(r => r.return_id === returnId);
        if (!ret) return res.status(404).json({ error: 'Return record not found.' });

        const ord = orders.find(o => o.order_id === ret.order_id) || {
            order_id: ret.order_id,
            order_status: 'Delivered',
            shipping_type: 'Standard',
            zip_code: '10001',
            address: '124 Elm Street, North Zone',
            customer_id: 1,
            driver_id: 1
        };

        const cust = customers.find(c => c.customer_id === ord.customer_id) || {
            customer_id: ord.customer_id,
            name: 'Customer',
            phone_number: '+1-555-0100',
            store_credit_balance: 0
        };

        const matchedItems = orderItems
            .filter(oi => oi.order_id === ret.order_id)
            .map(oi => {
                const itemObj = items.find(i => i.item_id === oi.item_id) || { name: `Item #${oi.item_id}`, sku: `SKU` };
                return {
                    order_id: ret.order_id,
                    item_id: oi.item_id,
                    quantity: oi.quantity,
                    item_name: itemObj.name,
                    sku: itemObj.sku
                };
            });

        return res.json({
            success: true,
            returnRecord: {
                return_id: ret.return_id,
                status: ret.status,
                refund_amount: parseFloat(ret.refund_amount || 0).toFixed(2),
                date_requested: ret.date_requested,
                order_id: ret.order_id,
                reason: ret.reason || 'Customer return request',
                order_status: ord.order_status,
                shipping_type: ord.shipping_type,
                zip_code: ord.zip_code,
                address: ord.address,
                star_rating: ord.star_rating,
                customer_id: cust.customer_id,
                customer_name: cust.name,
                customer_phone: cust.phone_number,
                store_credit_balance: parseFloat(cust.store_credit_balance || 0).toFixed(2),
                workflow: getWorkflowMeta(ret.status),
                items: matchedItems
            }
        });
    }
});

// ============================================================================
// 4. POST /api/returns - Create New Return Request
// ============================================================================
router.post('/', async (req, res) => {
    const { order_id, refund_amount, reason } = req.body;
    const orderId = parseInt(order_id, 10);
    const refund = parseFloat(refund_amount) || 25.00;

    if (!orderId) {
        return res.status(400).json({ error: 'Please provide a valid order_id.' });
    }

    try {
        const [ordRows] = await pool.promise().query(
            `SELECT o.order_id, o.customer_id, c.name AS customer_name, c.phone_number
             FROM Orders o
             JOIN Customer c ON o.customer_id = c.customer_id
             WHERE o.order_id = ?`,
            [orderId]
        );

        if (ordRows.length === 0) {
            return res.status(404).json({ error: 'Original Order not found.' });
        }
        const ord = ordRows[0];

        const [result] = await pool.promise().query(
            'INSERT INTO Returns (status, refund_amount, date_requested, order_id) VALUES (?, ?, CURDATE(), ?)',
            ['Return Initiated', refund, orderId]
        );

        const newReturnId = result.insertId;

        // Log notification to Notification_Queue
        const notifMsg = `LogiRoute Returns: Return request #${newReturnId} initiated for Order #${orderId}. Please attach your return label and mail the package back.`;
        await pool.promise().query(
            `INSERT INTO Notification_Queue (order_id, customer_id, channel, recipient, message_payload, dispatch_status)
             VALUES (?, ?, 'SMS', ?, ?, 'Sent')`,
            [orderId, ord.customer_id, ord.phone_number || '+1-555-0100', notifMsg]
        );

        return res.status(201).json({
            success: true,
            message: `Return request #${newReturnId} created successfully. Status: Return Initiated.`,
            return_id: newReturnId,
            returnRecord: {
                return_id: newReturnId,
                status: 'Return Initiated',
                refund_amount: refund.toFixed(2),
                date_requested: new Date().toISOString().split('T')[0],
                order_id: orderId,
                reason: reason || 'Return initiated',
                workflow: getWorkflowMeta('Return Initiated')
            }
        });
    } catch (err) {
        console.error('Create return DB error fallback:', err.message);

        const ord = orders.find(o => o.order_id === orderId);
        if (!ord) return res.status(404).json({ error: 'Original order not found.' });

        const cust = customers.find(c => c.customer_id === ord.customer_id);
        const newReturnId = returns.length ? Math.max(...returns.map(r => r.return_id)) + 1 : 1;
        const newReturn = {
            return_id: newReturnId,
            status: 'Return Initiated',
            refund_amount: refund,
            date_requested: new Date().toISOString().split('T')[0],
            order_id: orderId,
            reason: reason || 'Return initiated'
        };
        returns.unshift(newReturn);

        // In-memory notification
        const notifId = notifications.length ? Math.max(...notifications.map(n => n.notification_id)) + 1 : 1;
        notifications.unshift({
            notification_id: notifId,
            order_id: orderId,
            customer_id: ord.customer_id,
            channel: 'SMS',
            recipient: cust?.phone_number || '+1-555-0100',
            message_payload: `LogiRoute Returns: Return request #${newReturnId} initiated for Order #${orderId}. Please mail package back.`,
            dispatch_status: 'Sent',
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
            sent_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
        });

        return res.status(201).json({
            success: true,
            message: `Return request #${newReturnId} created successfully (Demo session). Status: Return Initiated.`,
            return_id: newReturnId,
            returnRecord: {
                ...newReturn,
                refund_amount: refund.toFixed(2),
                workflow: getWorkflowMeta('Return Initiated')
            }
        });
    }
});

// ============================================================================
// 5. PUT /api/returns/:returnId/status
// FEATURE: Return tracking status progression (Return Initiated -> Mailed Back -> Arrived at Warehouse -> Refund Approved)
// Atomically credits customer store balance upon Refund Approval / Warehouse arrival.
// ============================================================================
router.put('/:returnId/status', async (req, res) => {
    const returnId = parseInt(req.params.returnId, 10);
    const { status, refund_amount } = req.body;

    const validStatuses = ['Return Initiated', 'Mailed Back', 'Arrived at Warehouse', 'Refund Approved', 'Refund Credited', 'Completed', 'Cancelled'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    try {
        const conn = await pool.promise().getConnection();
        try {
            await conn.beginTransaction();

            const [retRows] = await conn.query(
                `SELECT r.return_id, r.status, r.refund_amount, r.order_id, o.customer_id, c.name AS customer_name, c.phone_number, c.store_credit_balance
                 FROM Returns r
                 JOIN Orders o ON r.order_id = o.order_id
                 JOIN Customer c ON o.customer_id = c.customer_id
                 WHERE r.return_id = ? FOR UPDATE`,
                [returnId]
            );

            if (retRows.length === 0) {
                await conn.rollback();
                conn.release();
                return res.status(404).json({ error: 'Return record not found.' });
            }

            const currentRet = retRows[0];
            const oldStatus = currentRet.status;
            const finalRefund = refund_amount !== undefined ? parseFloat(refund_amount) : parseFloat(currentRet.refund_amount || 0);

            // Update Return status
            await conn.query(
                'UPDATE Returns SET status = ?, refund_amount = ? WHERE return_id = ?',
                [status, finalRefund, returnId]
            );

            let creditUpdated = false;
            let newBalance = parseFloat(currentRet.store_credit_balance || 0);

            // If moving to Refund Approved or Refund Credited and not previously approved, credit customer balance
            if ((status === 'Refund Approved' || status === 'Refund Credited') && !['Refund Approved', 'Refund Credited', 'Completed'].includes(oldStatus)) {
                await conn.query(
                    'UPDATE Customer SET store_credit_balance = store_credit_balance + ? WHERE customer_id = ?',
                    [finalRefund, currentRet.customer_id]
                );
                creditUpdated = true;
                newBalance += finalRefund;

                // Log Refund Credited Notification
                const creditMsg = `LogiRoute Refund: Your return #${returnId} (Order #${currentRet.order_id}) has been approved! $${finalRefund.toFixed(2)} store credit added. New Balance: $${newBalance.toFixed(2)}.`;
                await conn.query(
                    `INSERT INTO Notification_Queue (order_id, customer_id, channel, recipient, message_payload, dispatch_status)
                     VALUES (?, ?, 'SMS', ?, ?, 'Sent')`,
                    [currentRet.order_id, currentRet.customer_id, currentRet.phone_number || '+1-555-0100', creditMsg]
                );
            } else if (status === 'Arrived at Warehouse') {
                // Log Arrival notification
                const arrMsg = `LogiRoute Alert: Returned package for Order #${currentRet.order_id} has arrived at our warehouse and is undergoing QA review for refund processing.`;
                await conn.query(
                    `INSERT INTO Notification_Queue (order_id, customer_id, channel, recipient, message_payload, dispatch_status)
                     VALUES (?, ?, 'SMS', ?, ?, 'Sent')`,
                    [currentRet.order_id, currentRet.customer_id, currentRet.phone_number || '+1-555-0100', arrMsg]
                );
            }

            await conn.commit();
            conn.release();

            return res.json({
                success: true,
                message: `Return #${returnId} transitioned: "${oldStatus}" ➔ "${status}".${creditUpdated ? ` $${finalRefund.toFixed(2)} credited to ${currentRet.customer_name}.` : ''}`,
                returnRecord: {
                    return_id: returnId,
                    status,
                    refund_amount: finalRefund.toFixed(2),
                    order_id: currentRet.order_id,
                    customer_id: currentRet.customer_id,
                    customer_name: currentRet.customer_name,
                    store_credit_balance: newBalance.toFixed(2),
                    credit_credited: creditUpdated,
                    workflow: getWorkflowMeta(status)
                }
            });
        } catch (dbErr) {
            await conn.rollback();
            conn.release();
            throw dbErr;
        }
    } catch (err) {
        console.error('Return status update fallback:', err.message);

        const ret = returns.find(r => r.return_id === returnId);
        if (!ret) return res.status(404).json({ error: 'Return record not found.' });

        const oldStatus = ret.status;
        const finalRefund = refund_amount !== undefined ? parseFloat(refund_amount) : parseFloat(ret.refund_amount || 0);

        ret.status = status;
        ret.refund_amount = finalRefund;

        const ord = orders.find(o => o.order_id === ret.order_id);
        const cust = ord ? customers.find(c => c.customer_id === ord.customer_id) : null;

        let creditUpdated = false;
        let newBalance = cust ? parseFloat(cust.store_credit_balance || 0) : 0;

        if ((status === 'Refund Approved' || status === 'Refund Credited') && !['Refund Approved', 'Refund Credited', 'Completed'].includes(oldStatus)) {
            if (cust) {
                cust.store_credit_balance = (parseFloat(cust.store_credit_balance || 0) + finalRefund);
                newBalance = cust.store_credit_balance;
                creditUpdated = true;

                const notifId = notifications.length ? Math.max(...notifications.map(n => n.notification_id)) + 1 : 1;
                notifications.unshift({
                    notification_id: notifId,
                    order_id: ret.order_id,
                    customer_id: cust.customer_id,
                    channel: 'SMS',
                    recipient: cust.phone_number || '+1-555-0100',
                    message_payload: `LogiRoute Refund: Return #${returnId} approved! $${finalRefund.toFixed(2)} store credit added. New balance: $${newBalance.toFixed(2)}.`,
                    dispatch_status: 'Sent',
                    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
                    sent_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
                });
            }
        }

        return res.json({
            success: true,
            message: `Return #${returnId} transitioned: "${oldStatus}" ➔ "${status}" (Demo session).${creditUpdated ? ` $${finalRefund.toFixed(2)} store credit added.` : ''}`,
            returnRecord: {
                return_id: returnId,
                status,
                refund_amount: finalRefund.toFixed(2),
                order_id: ret.order_id,
                customer_id: cust?.customer_id,
                customer_name: cust?.name,
                store_credit_balance: newBalance.toFixed(2),
                credit_credited: creditUpdated,
                workflow: getWorkflowMeta(status)
            }
        });
    }
});

module.exports = {
    router
};
