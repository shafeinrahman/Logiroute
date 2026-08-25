const express = require('express');
const router = express.Router();
const pool = require('../db');
const { items, customers, orders, orderItems, notifications } = require('./dataStore');

// ============================================================================
// 1. GET /api/reports/missing-sales
// FEAT: Missing Sales Report
// Join Customer with Items (via Orders / Order_Items) to find customers who
// have NEVER bought a given item or category.
// Tables: Customer, Orders, Order_Items, Items
// ============================================================================
router.get('/missing-sales', async (req, res) => {
    const { item_id, search } = req.query;

    try {
        // 1. Fetching the available items for selector
        const [allItems] = await pool.promise().query(
            'SELECT item_id, name, sku, safety_threshold FROM Items ORDER BY item_id ASC'
        );

        if (allItems.length === 0) {
            return res.json({
                success: true,
                selectedItem: null,
                items: [],
                missingCustomers: [],
                purchasedCustomers: [],
                metrics: { totalCustomers: 0, missingCount: 0, purchasedCount: 0, penetrationRate: '0.0%' }
            });
        }

        // Determine target item (default to first item if none provided)
        const selectedId = item_id ? parseInt(item_id, 10) : allItems[0].item_id;
        const targetItem = allItems.find(it => it.item_id === selectedId) || allItems[0];

        // 2. Query Customers who have NEVER purchased this item (Missing Sales)
        // Direct relational subquery using Customer NOT IN (Orders ⋈ Order_Items WHERE item_id = ?)
        let missingSql = `
            SELECT
                c.customer_id,
                c.name AS customer_name,
                c.phone_number,
                c.address,
                c.store_credit_balance,
                COUNT(DISTINCT o.order_id) AS total_orders_placed,
                MAX(o.order_id) AS last_order_id,
                COALESCE(SUM(oi.quantity), 0) AS total_lifetime_units_bought
            FROM Customer c
            LEFT JOIN Orders o ON c.customer_id = o.customer_id
            LEFT JOIN Order_Items oi ON o.order_id = oi.order_id
            WHERE c.customer_id NOT IN (
                SELECT DISTINCT o2.customer_id
                FROM Orders o2
                JOIN Order_Items oi2 ON o2.order_id = oi2.order_id
                WHERE oi2.item_id = ?
            )
        `;
        const missingParams = [targetItem.item_id];

        if (search && search.trim()) {
            missingSql += ` AND (c.name LIKE ? OR c.phone_number LIKE ? OR c.address LIKE ?)`;
            const s = `%${search.trim()}%`;
            missingParams.push(s, s, s);
        }

        missingSql += ` GROUP BY c.customer_id, c.name, c.phone_number, c.address, c.store_credit_balance ORDER BY c.customer_id ASC`;
        const [missingRows] = await pool.promise().query(missingSql, missingParams);

        // 3. Query Customers who HAVE purchased this item (for cross-validation)
        const [purchasedRows] = await pool.promise().query(`
            SELECT
                c.customer_id,
                c.name AS customer_name,
                c.phone_number,
                c.address,
                c.store_credit_balance,
                COUNT(DISTINCT o.order_id) AS orders_with_item,
                SUM(oi.quantity) AS total_units_bought,
                MAX(o.order_id) AS last_purchase_order_id
            FROM Customer c
            JOIN Orders o ON c.customer_id = o.customer_id
            JOIN Order_Items oi ON o.order_id = oi.order_id
            WHERE oi.item_id = ?
            GROUP BY c.customer_id, c.name, c.phone_number, c.address, c.store_credit_balance
            ORDER BY total_units_bought DESC
        `, [targetItem.item_id]);

        // 4. Calculate penetration metrics
        const [totalCustRows] = await pool.promise().query('SELECT COUNT(*) AS total FROM Customer');
        const totalCustomers = totalCustRows[0]?.total || 0;
        const missingCount = missingRows.length;
        const purchasedCount = purchasedRows.length;
        const penetrationPct = totalCustomers > 0 ? ((purchasedCount / totalCustomers) * 100).toFixed(1) : '0.0';

        return res.json({
            success: true,
            selectedItem: targetItem,
            items: allItems,
            missingCustomers: missingRows.map(r => ({
                ...r,
                store_credit_balance: parseFloat(r.store_credit_balance || 0).toFixed(2),
                total_orders_placed: parseInt(r.total_orders_placed, 10) || 0,
                status: 'Never Purchased'
            })),
            purchasedCustomers: purchasedRows.map(r => ({
                ...r,
                store_credit_balance: parseFloat(r.store_credit_balance || 0).toFixed(2),
                total_units_bought: parseInt(r.total_units_bought, 10) || 0,
                orders_with_item: parseInt(r.orders_with_item, 10) || 0,
                status: 'Purchased'
            })),
            metrics: {
                totalCustomers,
                missingCount,
                purchasedCount,
                penetrationRate: `${penetrationPct}%`,
                penetrationPercent: parseFloat(penetrationPct)
            }
        });
    } catch (err) {
        console.error('Missing sales DB fallback:', err.message);

        const allItems = items;
        const selectedId = item_id ? parseInt(item_id, 10) : (allItems[0]?.item_id || 1);
        const targetItem = allItems.find(it => it.item_id === selectedId) || allItems[0] || {
            item_id: 1,
            name: 'Heavy Duty Shipping Box (L)',
            sku: 'BOX-HD-L-001',
            safety_threshold: 50
        };

        // Find which customer IDs have bought targetItem
        const customerIdsWhoBought = new Set();
        orders.forEach(o => {
            const hasItem = orderItems.some(oi => oi.order_id === o.order_id && oi.item_id === targetItem.item_id);
            if (hasItem) {
                customerIdsWhoBought.add(o.customer_id);
            }
        });

        // Filter missing customers
        let missingList = customers.filter(c => !customerIdsWhoBought.has(c.customer_id)).map(c => {
            const custOrders = orders.filter(o => o.customer_id === c.customer_id);
            const totalUnits = orderItems
                .filter(oi => custOrders.some(o => o.order_id === oi.order_id))
                .reduce((sum, oi) => sum + oi.quantity, 0);

            return {
                customer_id: c.customer_id,
                customer_name: c.name,
                phone_number: c.phone_number,
                address: c.address,
                store_credit_balance: parseFloat(c.store_credit_balance || 0).toFixed(2),
                total_orders_placed: custOrders.length,
                last_order_id: custOrders.length ? Math.max(...custOrders.map(o => o.order_id)) : null,
                total_lifetime_units_bought: totalUnits,
                status: 'Never Purchased'
            };
        });

        // Filter purchased customers
        let purchasedList = customers.filter(c => customerIdsWhoBought.has(c.customer_id)).map(c => {
            const custOrders = orders.filter(o => o.customer_id === c.customer_id);
            const ordersWithItem = custOrders.filter(o => orderItems.some(oi => oi.order_id === o.order_id && oi.item_id === targetItem.item_id));
            const units = orderItems
                .filter(oi => oi.item_id === targetItem.item_id && custOrders.some(o => o.order_id === oi.order_id))
                .reduce((sum, oi) => sum + oi.quantity, 0);

            return {
                customer_id: c.customer_id,
                customer_name: c.name,
                phone_number: c.phone_number,
                address: c.address,
                store_credit_balance: parseFloat(c.store_credit_balance || 0).toFixed(2),
                orders_with_item: ordersWithItem.length,
                total_units_bought: units,
                last_purchase_order_id: ordersWithItem.length ? Math.max(...ordersWithItem.map(o => o.order_id)) : null,
                status: 'Purchased'
            };
        });

        if (search && search.trim()) {
            const s = search.trim().toLowerCase();
            missingList = missingList.filter(c =>
                c.customer_name.toLowerCase().includes(s) ||
                c.phone_number.includes(s) ||
                c.address.toLowerCase().includes(s)
            );
        }

        const totalCustomers = customers.length;
        const missingCount = missingList.length;
        const purchasedCount = purchasedList.length;
        const penetrationPct = totalCustomers > 0 ? ((purchasedCount / totalCustomers) * 100).toFixed(1) : '0.0';

        return res.json({
            success: true,
            selectedItem: targetItem,
            items: allItems,
            missingCustomers: missingList,
            purchasedCustomers: purchasedList,
            metrics: {
                totalCustomers,
                missingCount,
                purchasedCount,
                penetrationRate: `${penetrationPct}%`,
                penetrationPercent: parseFloat(penetrationPct)
            }
        });
    }
});

// ============================================================================
// 2. GET /api/reports/missing-sales/matrix
// Full Item-Customer Purchase Matrix across all products and accounts
// ============================================================================
router.get('/missing-sales/matrix', async (req, res) => {
    try {
        const [itemsList] = await pool.promise().query('SELECT item_id, name, sku FROM Items ORDER BY item_id ASC');
        const [customersList] = await pool.promise().query('SELECT customer_id, name, phone_number, address FROM Customer ORDER BY customer_id ASC');

        // Purchase records
        const [purchaseRecords] = await pool.promise().query(`
            SELECT DISTINCT o.customer_id, oi.item_id, SUM(oi.quantity) AS total_qty
            FROM Orders o
            JOIN Order_Items oi ON o.order_id = oi.order_id
            GROUP BY o.customer_id, oi.item_id
        `);

        const totalCustomers = customersList.length;

        // Build item summary stats
        const itemStats = itemsList.map(it => {
            const buyers = purchaseRecords.filter(p => p.item_id === it.item_id);
            const purchasedCustomerIds = new Set(buyers.map(b => b.customer_id));
            const purchasedCount = purchasedCustomerIds.size;
            const missingCount = totalCustomers - purchasedCount;
            const penetrationRate = totalCustomers > 0 ? ((purchasedCount / totalCustomers) * 100).toFixed(1) : '0.0';
            const totalUnitsSold = buyers.reduce((sum, b) => sum + parseInt(b.total_qty, 10), 0);

            return {
                ...it,
                purchased_count: purchasedCount,
                missing_count: missingCount,
                penetration_rate: `${penetrationRate}%`,
                penetration_percent: parseFloat(penetrationRate),
                total_units_sold: totalUnitsSold
            };
        });

        // Build grid rows per customer
        const matrixRows = customersList.map(cust => {
            const itemPurchases = {};
            itemsList.forEach(it => {
                const match = purchaseRecords.find(p => p.customer_id === cust.customer_id && p.item_id === it.item_id);
                itemPurchases[it.item_id] = {
                    has_purchased: !!match,
                    quantity: match ? parseInt(match.total_qty, 10) : 0
                };
            });

            return {
                customer_id: cust.customer_id,
                customer_name: cust.name,
                phone_number: cust.phone_number,
                address: cust.address,
                purchases: itemPurchases
            };
        });

        return res.json({
            success: true,
            totalCustomers,
            totalItems: itemsList.length,
            items: itemStats,
            customers: matrixRows
        });
    } catch (err) {
        console.error('Matrix fallback:', err.message);

        const totalCustomers = customers.length;
        const itemStats = items.map(it => {
            let buyers = new Set();
            let totalUnits = 0;

            orders.forEach(o => {
                const match = orderItems.find(oi => oi.order_id === o.order_id && oi.item_id === it.item_id);
                if (match) {
                    buyers.add(o.customer_id);
                    totalUnits += match.quantity;
                }
            });

            const purchasedCount = buyers.size;
            const missingCount = totalCustomers - purchasedCount;
            const penetrationRate = totalCustomers > 0 ? ((purchasedCount / totalCustomers) * 100).toFixed(1) : '0.0';

            return {
                ...it,
                purchased_count: purchasedCount,
                missing_count: missingCount,
                penetration_rate: `${penetrationRate}%`,
                penetration_percent: parseFloat(penetrationRate),
                total_units_sold: totalUnits
            };
        });

        const matrixRows = customers.map(cust => {
            const custOrders = orders.filter(o => o.customer_id === cust.customer_id);
            const itemPurchases = {};

            items.forEach(it => {
                const matches = orderItems.filter(oi => oi.item_id === it.item_id && custOrders.some(o => o.order_id === oi.order_id));
                const totalQty = matches.reduce((sum, oi) => sum + oi.quantity, 0);
                itemPurchases[it.item_id] = {
                    has_purchased: matches.length > 0,
                    quantity: totalQty
                };
            });

            return {
                customer_id: cust.customer_id,
                customer_name: cust.name,
                phone_number: cust.phone_number,
                address: cust.address,
                purchases: itemPurchases
            };
        });

        return res.json({
            success: true,
            totalCustomers,
            totalItems: items.length,
            items: itemStats,
            customers: matrixRows
        });
    }
});

// ============================================================================
// 3. GET /api/reports/missing-sales/kpis
// High-level KPIs for Missing Sales and Market Penetration
// ============================================================================
router.get('/missing-sales/kpis', async (req, res) => {
    try {
        const [cRows] = await pool.promise().query('SELECT COUNT(*) AS total FROM Customer');
        const [iRows] = await pool.promise().query('SELECT COUNT(*) AS total FROM Items');
        const [oiRows] = await pool.promise().query('SELECT COUNT(DISTINCT customer_id, item_id) as purchased_pairs FROM Orders o JOIN Order_Items oi ON o.order_id = oi.order_id');

        const totalCustomers = cRows[0]?.total || 0;
        const totalItems = iRows[0]?.total || 0;
        const totalPossiblePairs = totalCustomers * totalItems;
        const purchasedPairs = oiRows[0]?.purchased_pairs || 0;
        const missingPairs = Math.max(0, totalPossiblePairs - purchasedPairs);
        const overallPenetration = totalPossiblePairs > 0 ? ((purchasedPairs / totalPossiblePairs) * 100).toFixed(1) : '0.0';

        return res.json({
            success: true,
            kpis: {
                totalCustomers,
                totalItems,
                totalPossiblePairs,
                purchasedPairs,
                missingPairs,
                overallPenetration: `${overallPenetration}%`,
                untappedOpportunityRate: `${(100 - parseFloat(overallPenetration)).toFixed(1)}%`
            }
        });
    } catch (err) {
        const totalCustomers = customers.length;
        const totalItems = items.length;
        const totalPossiblePairs = totalCustomers * totalItems;

        const purchasedPairsSet = new Set();
        orders.forEach(o => {
            orderItems.filter(oi => oi.order_id === o.order_id).forEach(oi => {
                purchasedPairsSet.add(`${o.customer_id}_${oi.item_id}`);
            });
        });

        const purchasedPairs = purchasedPairsSet.size;
        const missingPairs = Math.max(0, totalPossiblePairs - purchasedPairs);
        const overallPenetration = totalPossiblePairs > 0 ? ((purchasedPairs / totalPossiblePairs) * 100).toFixed(1) : '0.0';

        return res.json({
            success: true,
            kpis: {
                totalCustomers,
                totalItems,
                totalPossiblePairs,
                purchasedPairs,
                missingPairs,
                overallPenetration: `${overallPenetration}%`,
                untappedOpportunityRate: `${(100 - parseFloat(overallPenetration)).toFixed(1)}%`
            }
        });
    }
});

// ============================================================================
// 4. POST /api/reports/missing-sales/campaign
// Launch Targeted Marketing Campaign to Customers who Never Bought an Item
// Automatically drops promotional alerts into Notification_Queue
// ============================================================================
router.post('/missing-sales/campaign', async (req, res) => {
    const { item_id, promo_message, channel } = req.body;
    const itemId = parseInt(item_id, 10);

    if (!itemId) {
        return res.status(400).json({ error: 'Please specify an item_id.' });
    }

    const ch = channel === 'Email' ? 'Email' : 'SMS';

    try {
        // Fetch target item
        const [itemRows] = await pool.promise().query('SELECT item_id, name, sku FROM Items WHERE item_id = ?', [itemId]);
        if (itemRows.length === 0) return res.status(404).json({ error: 'Item not found.' });
        const item = itemRows[0];

        // Fetch missing customers for this item
        const [missingCustomers] = await pool.promise().query(`
            SELECT c.customer_id, c.name, c.phone_number,
                   (SELECT MAX(order_id) FROM Orders WHERE customer_id = c.customer_id) AS last_order_id
            FROM Customer c
            WHERE c.customer_id NOT IN (
                SELECT DISTINCT o2.customer_id
                FROM Orders o2
                JOIN Order_Items oi2 ON o2.order_id = oi2.order_id
                WHERE oi2.item_id = ?
            )
        `, [itemId]);

        if (missingCustomers.length === 0) {
            return res.json({
                success: true,
                message: `All customers have already purchased "${item.name}". No missing sales found!`,
                dispatchedCount: 0
            });
        }

        const defaultPromo = `Exclusive Offer from LogiRoute: Enjoy 15% off our "${item.name}" (SKU: ${item.sku}) on your next order! Use code BUYNOW15.`;
        const payload = promo_message && promo_message.trim() ? promo_message.trim() : defaultPromo;

        const notificationsSent = [];
        for (const cust of missingCustomers) {
            const orderId = cust.last_order_id || 1; // associate with recent order or fallback
            const recipient = ch === 'Email' ? `${cust.name.toLowerCase().replace(/\s+/g, '.')}@example.com` : (cust.phone_number || '+1-555-0100');

            const [notifRes] = await pool.promise().query(
                `INSERT INTO Notification_Queue (order_id, customer_id, channel, recipient, message_payload, dispatch_status)
                 VALUES (?, ?, ?, ?, ?, 'Sent')`,
                [orderId, cust.customer_id, ch, recipient, payload]
            );

            notificationsSent.push({
                notification_id: notifRes.insertId,
                customer_id: cust.customer_id,
                customer_name: cust.name,
                channel: ch,
                recipient,
                message_payload: payload
            });
        }

        return res.json({
            success: true,
            message: `Targeted campaign dispatched to ${missingCustomers.length} customer(s) who have never bought "${item.name}".`,
            item_name: item.name,
            dispatchedCount: missingCustomers.length,
            notifications: notificationsSent
        });
    } catch (err) {
        console.error('Campaign fallback:', err.message);

        const item = items.find(i => i.item_id === itemId);
        if (!item) return res.status(404).json({ error: 'Item not found.' });

        const customerIdsWhoBought = new Set();
        orders.forEach(o => {
            const has = orderItems.some(oi => oi.order_id === o.order_id && oi.item_id === itemId);
            if (has) customerIdsWhoBought.add(o.customer_id);
        });

        const missing = customers.filter(c => !customerIdsWhoBought.has(c.customer_id));
        const defaultPromo = `Exclusive Offer from LogiRoute: Enjoy 15% off our "${item.name}" on your next delivery order! Use promo code LOGI15.`;
        const payload = promo_message && promo_message.trim() ? promo_message.trim() : defaultPromo;

        const notificationsSent = [];
        missing.forEach(cust => {
            const custOrder = orders.find(o => o.customer_id === cust.customer_id);
            const orderId = custOrder ? custOrder.order_id : 1;
            const recipient = ch === 'Email' ? `${cust.name.toLowerCase().replace(/\s+/g, '.')}@example.com` : cust.phone_number;

            const notifId = notifications.length ? Math.max(...notifications.map(n => n.notification_id)) + 1 : 1;
            const notifObj = {
                notification_id: notifId,
                order_id: orderId,
                customer_id: cust.customer_id,
                channel: ch,
                recipient,
                message_payload: payload,
                dispatch_status: 'Sent',
                created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
                sent_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
            };
            notifications.unshift(notifObj);
            notificationsSent.push(notifObj);
        });

        return res.json({
            success: true,
            message: `Targeted campaign dispatched to ${missing.length} customer(s) (Demo session) who have never bought "${item.name}".`,
            item_name: item.name,
            dispatchedCount: missing.length,
            notifications: notificationsSent
        });
    }
});

module.exports = {
    router
};
