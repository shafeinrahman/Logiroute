const express = require('express');
const router = express.Router();
const pool = require('../db');
const { warehouses, warehouseStocks, items, damagedInventory, expiredInventory } = require('./dataStore');

// Helper: Determine severity for low stock calculation
function determineSeverity(stockQuantity, safetyThreshold) {
    if (stockQuantity <= 0) return 'Out of Stock';
    if (stockQuantity <= (safetyThreshold * 0.35)) return 'Critical';
    return 'Low Stock';
}

// ============================================================================
// ============================================================================
// SECTION 1: ITEM–WAREHOUSE STOCK MATRIX (Features.md Shafein's - Feature 1)
// Join Items with Warehouses (via Warehouse_Stocks) to show full stock distribution
// Tables: items, warehouses, warehouse_stocks
// ============================================================================
// ============================================================================

// 1.1 GET /api/inventory/stock-matrix - Flattened Matrix List with Filters
router.get('/stock-matrix', async (req, res) => {
    const { warehouse_id, severity, search } = req.query;

    try {
        const [warehouseRows] = await pool.promise().query(`SELECT warehouse_id, name AS warehouse_name, location_zone FROM Warehouses`);
        const [itemRows] = await pool.promise().query(`SELECT item_id, name AS item_name, sku, safety_threshold FROM Items`);
        const [stockRows] = await pool.promise().query(`SELECT warehouse_id, item_id, stock_quantity FROM Warehouse_Stocks`);
        const [damagedRows] = await pool.promise().query(`SELECT warehouse_id, item_id, quantity FROM Damaged_Inventory WHERE quarantine_status = 'Quarantined'`);
        const [expiredRows] = await pool.promise().query(`SELECT warehouse_id, item_id, quantity FROM Expired_Inventory WHERE quarantine_status = 'Quarantined'`);

        const rows = [];
        warehouseRows.forEach(w => {
            itemRows.forEach(i => {
                const stockRecord = stockRows.find(s => s.warehouse_id === w.warehouse_id && s.item_id === i.item_id);
                const qty = stockRecord ? stockRecord.stock_quantity : 0;

                let stock_status;
                if (qty === 0) stock_status = 'Out of Stock';
                else if (qty <= (i.safety_threshold * 0.35)) stock_status = 'Critical';
                else if (qty < i.safety_threshold) stock_status = 'Low Stock';
                else stock_status = 'Healthy';

                const dmgQty = damagedRows
                    .filter(d => d.warehouse_id === w.warehouse_id && d.item_id === i.item_id)
                    .reduce((sum, d) => sum + (d.quantity || 0), 0);
                const expQty = expiredRows
                    .filter(e => e.warehouse_id === w.warehouse_id && e.item_id === i.item_id)
                    .reduce((sum, e) => sum + (e.quantity || 0), 0);

                rows.push({
                    warehouse_id: w.warehouse_id,
                    warehouse_name: w.warehouse_name,
                    location_zone: w.location_zone,
                    item_id: i.item_id,
                    item_name: i.item_name,
                    sku: i.sku,
                    safety_threshold: i.safety_threshold,
                    stock_quantity: qty,
                    deficit: i.safety_threshold - qty,
                    stock_percentage: Math.round((qty / i.safety_threshold) * 1000) / 10,
                    stock_status,
                    quarantined_quantity: dmgQty + expQty
                });
            });
        });

        let filtered = rows;
        if (warehouse_id && warehouse_id !== 'all') {
            const wId = parseInt(warehouse_id, 10);
            filtered = filtered.filter(r => r.warehouse_id === wId);
        }
        if (severity && severity !== 'all') {
            filtered = filtered.filter(r => r.stock_status.toLowerCase() === severity.toLowerCase());
        }
        if (search && search.trim()) {
            const s = search.trim().toLowerCase();
            filtered = filtered.filter(r => 
                r.item_name.toLowerCase().includes(s) || 
                r.sku.toLowerCase().includes(s) || 
                r.warehouse_name.toLowerCase().includes(s)
            );
        }

        return res.json({ success: true, count: filtered.length, matrix: filtered });
    } catch (err) {
        console.error('Stock Matrix fallback:', err.message);
        const matrix = [];
        warehouses.forEach(w => {
            items.forEach(i => {
                const stockRecord = warehouseStocks.find(ws => ws.warehouse_id === w.warehouse_id && ws.item_id === i.item_id);
                const qty = stockRecord ? stockRecord.stock_quantity : 0;
                let status = 'Healthy';
                if (qty === 0) status = 'Out of Stock';
                else if (qty <= (i.safety_threshold * 0.35)) status = 'Critical';
                else if (qty < i.safety_threshold) status = 'Low Stock';

                const dmgCount = damagedInventory
                    .filter(d => d.warehouse_id === w.warehouse_id && d.item_id === i.item_id && d.quarantine_status === 'Quarantined')
                    .reduce((sum, d) => sum + d.quantity, 0);

                const expCount = expiredInventory
                    .filter(e => e.warehouse_id === w.warehouse_id && e.item_id === i.item_id && e.quarantine_status === 'Quarantined')
                    .reduce((sum, e) => sum + e.quantity, 0);

                matrix.push({
                    warehouse_id: w.warehouse_id,
                    warehouse_name: w.name,
                    location_zone: w.location_zone,
                    item_id: i.item_id,
                    item_name: i.name,
                    sku: i.sku,
                    safety_threshold: i.safety_threshold,
                    stock_quantity: qty,
                    deficit: Math.max(0, i.safety_threshold - qty),
                    stock_percentage: parseFloat(((qty / i.safety_threshold) * 100).toFixed(1)),
                    stock_status: status,
                    quarantined_quantity: dmgCount + expCount
                });
            });
        });

        let filtered = matrix;
        if (warehouse_id && warehouse_id !== 'all') {
            const wId = parseInt(warehouse_id, 10);
            filtered = filtered.filter(r => r.warehouse_id === wId);
        }
        if (severity && severity !== 'all') {
            filtered = filtered.filter(r => r.stock_status.toLowerCase() === severity.toLowerCase());
        }
        if (search && search.trim()) {
            const s = search.trim().toLowerCase();
            filtered = filtered.filter(r => 
                r.item_name.toLowerCase().includes(s) || 
                r.sku.toLowerCase().includes(s) || 
                r.warehouse_name.toLowerCase().includes(s)
            );
        }

        return res.json({ success: true, count: filtered.length, matrix: filtered });
    }
});

// 1.2 GET /api/inventory/stock-matrix/pivot - True 2D Grid Pivot Representation
// Rows = Items, Columns = Warehouses, Cells = Quantities & Statuses
router.get('/stock-matrix/pivot', async (req, res) => {
    try {
        const [warehousesList] = await pool.promise().query(
            'SELECT warehouse_id, name, location_zone FROM Warehouses ORDER BY warehouse_id ASC'
        );
        const [itemsList] = await pool.promise().query(
            'SELECT item_id, name, sku, safety_threshold FROM Items ORDER BY item_id ASC'
        );
        const [stocksList] = await pool.promise().query(
            'SELECT warehouse_id, item_id, stock_quantity FROM Warehouse_Stocks'
        );
        const [quarantineSummary] = await pool.promise().query(`
            SELECT warehouse_id, item_id, SUM(quantity) as quarantined_total
            FROM (
                SELECT warehouse_id, item_id, quantity FROM Damaged_Inventory WHERE quarantine_status = 'Quarantined'
                UNION ALL
                SELECT warehouse_id, item_id, quantity FROM Expired_Inventory WHERE quarantine_status = 'Quarantined'
            ) q
            GROUP BY warehouse_id, item_id
        `);

        let totalNetworkUnits = 0;
        let totalQuarantinedNetwork = 0;
        let lowStockNodesCount = 0;
        let outOfStockNodesCount = 0;
        let optimalNodesCount = 0;

        const pivotRows = itemsList.map(item => {
            const stocksByWarehouse = {};
            let itemTotalStock = 0;
            let itemTotalQuarantined = 0;
            let lowCountForItem = 0;

            warehousesList.forEach(w => {
                const stockRec = stocksList.find(s => s.warehouse_id === w.warehouse_id && s.item_id === item.item_id);
                const qRec = quarantineSummary.find(q => q.warehouse_id === w.warehouse_id && q.item_id === item.item_id);
                
                const qty = stockRec ? stockRec.stock_quantity : 0;
                const quarantinedQty = qRec ? parseInt(qRec.quarantined_total, 10) : 0;

                itemTotalStock += qty;
                totalNetworkUnits += qty;
                itemTotalQuarantined += quarantinedQty;
                totalQuarantinedNetwork += quarantinedQty;

                let cellStatus = 'Healthy';
                if (qty === 0) {
                    cellStatus = 'Out of Stock';
                    outOfStockNodesCount++;
                    lowCountForItem++;
                } else if (qty <= (item.safety_threshold * 0.35)) {
                    cellStatus = 'Critical';
                    lowStockNodesCount++;
                    lowCountForItem++;
                } else if (qty < item.safety_threshold) {
                    cellStatus = 'Low Stock';
                    lowStockNodesCount++;
                    lowCountForItem++;
                } else {
                    optimalNodesCount++;
                }

                stocksByWarehouse[w.warehouse_id] = {
                    stock_quantity: qty,
                    quarantined_quantity: quarantinedQty,
                    status: cellStatus,
                    deficit: Math.max(0, item.safety_threshold - qty),
                    percentage: parseFloat(((qty / item.safety_threshold) * 100).toFixed(1))
                };
            });

            let overallStatus = 'Healthy';
            if (itemTotalStock === 0) overallStatus = 'Out of Stock';
            else if (lowCountForItem > 0) overallStatus = 'Attention Needed';

            return {
                item_id: item.item_id,
                name: item.name,
                sku: item.sku,
                safety_threshold: item.safety_threshold,
                total_stock: itemTotalStock,
                total_quarantined: itemTotalQuarantined,
                overall_status: overallStatus,
                low_stock_warehouses: lowCountForItem,
                warehouse_stocks: stocksByWarehouse
            };
        });

        return res.json({
            success: true,
            warehouses: warehousesList,
            itemsCount: itemsList.length,
            warehousesCount: warehousesList.length,
            summary: {
                totalCatalogItems: itemsList.length,
                totalWarehouses: warehousesList.length,
                totalStoragePoints: itemsList.length * warehousesList.length,
                totalNetworkUnits,
                totalQuarantinedNetwork,
                optimalNodesCount,
                lowStockNodesCount,
                outOfStockNodesCount
            },
            pivot: pivotRows
        });
    } catch (err) {
        console.error('Pivot Matrix fallback:', err.message);

        let totalNetworkUnits = 0;
        let totalQuarantinedNetwork = 0;
        let lowStockNodesCount = 0;
        let outOfStockNodesCount = 0;
        let optimalNodesCount = 0;

        const pivotRows = items.map(item => {
            const stocksByWarehouse = {};
            let itemTotalStock = 0;
            let itemTotalQuarantined = 0;
            let lowCountForItem = 0;

            warehouses.forEach(w => {
                const stockRec = warehouseStocks.find(s => s.warehouse_id === w.warehouse_id && s.item_id === item.item_id);
                const dmgCount = damagedInventory
                    .filter(d => d.warehouse_id === w.warehouse_id && d.item_id === item.item_id && d.quarantine_status === 'Quarantined')
                    .reduce((sum, d) => sum + d.quantity, 0);
                const expCount = expiredInventory
                    .filter(e => e.warehouse_id === w.warehouse_id && e.item_id === item.item_id && e.quarantine_status === 'Quarantined')
                    .reduce((sum, e) => sum + e.quantity, 0);

                const qty = stockRec ? stockRec.stock_quantity : 0;
                const quarantinedQty = dmgCount + expCount;

                itemTotalStock += qty;
                totalNetworkUnits += qty;
                itemTotalQuarantined += quarantinedQty;
                totalQuarantinedNetwork += quarantinedQty;

                let cellStatus = 'Healthy';
                if (qty === 0) {
                    cellStatus = 'Out of Stock';
                    outOfStockNodesCount++;
                    lowCountForItem++;
                } else if (qty <= (item.safety_threshold * 0.35)) {
                    cellStatus = 'Critical';
                    lowStockNodesCount++;
                    lowCountForItem++;
                } else if (qty < item.safety_threshold) {
                    cellStatus = 'Low Stock';
                    lowStockNodesCount++;
                    lowCountForItem++;
                } else {
                    optimalNodesCount++;
                }

                stocksByWarehouse[w.warehouse_id] = {
                    stock_quantity: qty,
                    quarantined_quantity: quarantinedQty,
                    status: cellStatus,
                    deficit: Math.max(0, item.safety_threshold - qty),
                    percentage: parseFloat(((qty / item.safety_threshold) * 100).toFixed(1))
                };
            });

            let overallStatus = 'Healthy';
            if (itemTotalStock === 0) overallStatus = 'Out of Stock';
            else if (lowCountForItem > 0) overallStatus = 'Attention Needed';

            return {
                item_id: item.item_id,
                name: item.name,
                sku: item.sku,
                safety_threshold: item.safety_threshold,
                total_stock: itemTotalStock,
                total_quarantined: itemTotalQuarantined,
                overall_status: overallStatus,
                low_stock_warehouses: lowCountForItem,
                warehouse_stocks: stocksByWarehouse
            };
        });

        return res.json({
            success: true,
            warehouses: warehouses,
            itemsCount: items.length,
            warehousesCount: warehouses.length,
            summary: {
                totalCatalogItems: items.length,
                totalWarehouses: warehouses.length,
                totalStoragePoints: items.length * warehouses.length,
                totalNetworkUnits,
                totalQuarantinedNetwork,
                optimalNodesCount,
                lowStockNodesCount,
                outOfStockNodesCount
            },
            pivot: pivotRows
        });
    }
});

// 1.3 GET /api/inventory/matrix/kpis - Stock Matrix KPIs
router.get('/matrix/kpis', async (req, res) => {
    try {
        const [itemCountRows] = await pool.promise().query('SELECT COUNT(*) as total_items FROM Items');
        const [warehouseCountRows] = await pool.promise().query('SELECT COUNT(*) as total_warehouses FROM Warehouses');
        const [stockRows] = await pool.promise().query('SELECT stock_quantity FROM Warehouse_Stocks');
        const [lowStockRows] = await pool.promise().query(`
            SELECT ws.stock_quantity, i.safety_threshold
            FROM Warehouse_Stocks ws
            JOIN Items i ON ws.item_id = i.item_id
            WHERE ws.stock_quantity < i.safety_threshold
        `);
        const [damagedRows] = await pool.promise().query(`SELECT quantity FROM Damaged_Inventory WHERE quarantine_status = 'Quarantined'`);
        const [expiredRows] = await pool.promise().query(`SELECT quantity FROM Expired_Inventory WHERE quarantine_status = 'Quarantined'`);

        const totalItems = itemCountRows[0]?.total_items || 0;
        const totalWarehouses = warehouseCountRows[0]?.total_warehouses || 0;
        const totalStockUnits = stockRows.reduce((sum, s) => sum + (s.stock_quantity || 0), 0);
        const totalStoragePoints = totalItems * totalWarehouses;

        const outOfStockNodes = lowStockRows.filter(r => r.stock_quantity === 0).length;
        const criticalAlerts = lowStockRows.filter(r => r.stock_quantity <= (r.safety_threshold * 0.35)).length;
        const totalQuarantinedUnits =
            damagedRows.reduce((sum, d) => sum + (d.quantity || 0), 0) +
            expiredRows.reduce((sum, e) => sum + (e.quantity || 0), 0);

        return res.json({
            success: true,
            kpis: {
                totalCatalogItems: totalItems,
                totalWarehouses: totalWarehouses,
                totalStoragePoints: totalStoragePoints,
                totalStockUnits: totalStockUnits,
                totalLowStockAlerts: lowStockRows.length,
                outOfStockNodes,
                criticalAlerts,
                totalQuarantinedUnits
            }
        });
    } catch (err) {
        console.error('Matrix KPIs error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch matrix KPIs' });
    }
});

// 1.4 POST /api/inventory/transfer - Safe Inter-Warehouse Stock Mover (Transactional)
router.post('/transfer', async (req, res) => {
    const { item_id, source_warehouse_id, dest_warehouse_id, quantity } = req.body;

    const itemId = parseInt(item_id, 10);
    const srcId = parseInt(source_warehouse_id, 10);
    const dstId = parseInt(dest_warehouse_id, 10);
    const qty = parseInt(quantity, 10);

    if (!itemId || !srcId || !dstId || !qty || qty <= 0) {
        return res.status(400).json({ error: 'Please specify valid item_id, source_warehouse_id, dest_warehouse_id, and positive quantity.' });
    }

    if (srcId === dstId) {
        return res.status(400).json({ error: 'Source and destination warehouses cannot be the same.' });
    }

    let conn;
    try {
        conn = await pool.promise().getConnection();
        await conn.beginTransaction();

        // 1. Check source stock
        const [sourceRows] = await conn.query(
            'SELECT stock_quantity FROM Warehouse_Stocks WHERE warehouse_id = ? AND item_id = ? FOR UPDATE',
            [srcId, itemId]
        );

        const currentSourceStock = sourceRows.length ? sourceRows[0].stock_quantity : 0;
        if (currentSourceStock < qty) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({
                error: `Insufficient stock at source warehouse. Available: ${currentSourceStock} units, Requested: ${qty} units.`
            });
        }

        // 2. Decrement source warehouse
        await conn.query(
            'UPDATE Warehouse_Stocks SET stock_quantity = stock_quantity - ? WHERE warehouse_id = ? AND item_id = ?',
            [qty, srcId, itemId]
        );

        // 3. Increment / Insert destination warehouse
        await conn.query(
            `INSERT INTO Warehouse_Stocks (warehouse_id, item_id, stock_quantity)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE stock_quantity = stock_quantity + ?`,
            [dstId, itemId, qty, qty]
        );

        // 4. Fetch updated names and stocks for confirmation
        const [itemRows] = await conn.query('SELECT name, sku FROM Items WHERE item_id = ?', [itemId]);
        const [srcWarehouseRows] = await conn.query('SELECT name FROM Warehouses WHERE warehouse_id = ?', [srcId]);
        const [dstWarehouseRows] = await conn.query('SELECT name FROM Warehouses WHERE warehouse_id = ?', [dstId]);

        await conn.commit();
        conn.release();

        return res.json({
            success: true,
            message: `Successfully transferred ${qty} units of "${itemRows[0]?.name || 'Item'}" from ${srcWarehouseRows[0]?.name || 'Source'} to ${dstWarehouseRows[0]?.name || 'Destination'}.`,
            transfer: {
                item_id: itemId,
                item_name: itemRows[0]?.name,
                source_warehouse: srcWarehouseRows[0]?.name,
                dest_warehouse: dstWarehouseRows[0]?.name,
                quantity: qty
            }
        });
    } catch (err) {
        if (conn) {
            try { await conn.rollback(); conn.release(); } catch (_) {}
        }
        console.error('Transfer DB Error:', err.message);

        // Fallback in-memory transfer
        const srcStock = warehouseStocks.find(ws => ws.warehouse_id === srcId && ws.item_id === itemId);
        const available = srcStock ? srcStock.stock_quantity : 0;

        if (available < qty) {
            return res.status(400).json({
                error: `Insufficient stock at source warehouse (Demo session). Available: ${available} units, Requested: ${qty} units.`
            });
        }

        srcStock.stock_quantity -= qty;

        let dstStock = warehouseStocks.find(ws => ws.warehouse_id === dstId && ws.item_id === itemId);
        if (dstStock) {
            dstStock.stock_quantity += qty;
        } else {
            warehouseStocks.push({
                warehouse_id: dstId,
                item_id: itemId,
                stock_quantity: qty
            });
        }

        const item = items.find(i => i.item_id === itemId);
        const srcW = warehouses.find(w => w.warehouse_id === srcId);
        const dstW = warehouses.find(w => w.warehouse_id === dstId);

        return res.json({
            success: true,
            message: `Successfully transferred ${qty} units of "${item ? item.name : 'Item'}" from ${srcW ? srcW.name : 'Source'} to ${dstW ? dstW.name : 'Destination'} (Demo session).`,
            transfer: {
                item_id: itemId,
                item_name: item?.name,
                source_warehouse: srcW?.name,
                dest_warehouse: dstW?.name,
                quantity: qty
            }
        });
    }
});

// ============================================================================
// ============================================================================
// SECTION 2: LOW STOCK ALERT (Features.md Shafein's - Feature 2)
// Query warehouse_stocks where stock_quantity is below item's safety_threshold
// Tables: warehouse_stocks, items, warehouses
// ============================================================================
// ============================================================================

// 2.1 GET /api/inventory/low-stock - Low Stock Query
router.get('/low-stock', async (req, res) => {
    const { warehouse_id, severity } = req.query;

    try {
        let sql = `
            SELECT 
                ws.warehouse_id,
                w.name AS warehouse_name,
                w.location_zone,
                i.item_id,
                i.name AS item_name,
                i.sku,
                i.safety_threshold,
                ws.stock_quantity,
                (i.safety_threshold - ws.stock_quantity) AS deficit,
                ROUND((ws.stock_quantity / i.safety_threshold) * 100, 1) AS stock_percentage,
                CASE 
                    WHEN ws.stock_quantity = 0 THEN 'Out of Stock'
                    WHEN ws.stock_quantity <= (i.safety_threshold * 0.35) THEN 'Critical'
                    ELSE 'Low Stock'
                END AS alert_severity
            FROM Warehouse_Stocks ws
            JOIN Items i ON ws.item_id = i.item_id
            JOIN Warehouses w ON ws.warehouse_id = w.warehouse_id
            WHERE ws.stock_quantity < i.safety_threshold
        `;
        const params = [];

        if (warehouse_id && warehouse_id !== 'all') {
            sql += ' AND ws.warehouse_id = ?';
            params.push(parseInt(warehouse_id, 10));
        }

        sql += ' ORDER BY ws.stock_quantity ASC, (i.safety_threshold - ws.stock_quantity) DESC';

        const [rows] = await pool.promise().query(sql, params);

        let filteredRows = rows;
        if (severity && severity !== 'all') {
            filteredRows = rows.filter(r => r.alert_severity.toLowerCase() === severity.toLowerCase());
        }

        return res.json({
            success: true,
            totalAlerts: filteredRows.length,
            alerts: filteredRows
        });
    } catch (err) {
        console.error('Low Stock DB Query Fallback:', err.message);

        let alerts = [];
        warehouseStocks.forEach(ws => {
            const item = items.find(i => i.item_id === ws.item_id);
            const warehouse = warehouses.find(w => w.warehouse_id === ws.warehouse_id);

            if (item && ws.stock_quantity < item.safety_threshold) {
                const deficit = item.safety_threshold - ws.stock_quantity;
                const percentage = parseFloat(((ws.stock_quantity / item.safety_threshold) * 100).toFixed(1));
                const alertSeverity = determineSeverity(ws.stock_quantity, item.safety_threshold);

                alerts.push({
                    warehouse_id: ws.warehouse_id,
                    warehouse_name: warehouse ? warehouse.name : `Warehouse #${ws.warehouse_id}`,
                    location_zone: warehouse ? warehouse.location_zone : 'General',
                    item_id: item.item_id,
                    item_name: item.name,
                    sku: item.sku,
                    safety_threshold: item.safety_threshold,
                    stock_quantity: ws.stock_quantity,
                    deficit: deficit,
                    stock_percentage: percentage,
                    alert_severity: alertSeverity
                });
            }
        });

        if (warehouse_id && warehouse_id !== 'all') {
            const wId = parseInt(warehouse_id, 10);
            alerts = alerts.filter(a => a.warehouse_id === wId);
        }

        if (severity && severity !== 'all') {
            alerts = alerts.filter(a => a.alert_severity.toLowerCase() === severity.toLowerCase());
        }

        alerts.sort((a, b) => a.stock_quantity - b.stock_quantity || b.deficit - a.deficit);

        return res.json({
            success: true,
            totalAlerts: alerts.length,
            alerts
        });
    }
});

// 2.2 GET /api/inventory/warehouses - List all warehouses
router.get('/warehouses', async (req, res) => {
    try {
        const [rows] = await pool.promise().query('SELECT warehouse_id, name, location_zone FROM Warehouses ORDER BY warehouse_id ASC');
        return res.json({ success: true, warehouses: rows });
    } catch (err) {
        return res.json({ success: true, warehouses: warehouses });
    }
});

// 2.3 GET /api/inventory/kpis - Inventory Summary Metrics
router.get('/kpis', async (req, res) => {
    try {
        const [itemCountRows] = await pool.promise().query('SELECT COUNT(*) as total_items FROM Items');
        const [warehouseCountRows] = await pool.promise().query('SELECT COUNT(*) as total_warehouses FROM Warehouses');
        const [stockRows] = await pool.promise().query('SELECT stock_quantity FROM Warehouse_Stocks');

        const [lowRows] = await pool.promise().query(`
            SELECT ws.stock_quantity, i.safety_threshold
            FROM Warehouse_Stocks ws
            JOIN Items i ON ws.item_id = i.item_id
            WHERE ws.stock_quantity < i.safety_threshold
        `);

        const totalStockUnits = stockRows.reduce((sum, s) => sum + (s.stock_quantity || 0), 0);
        const criticalAlerts = lowRows.filter(r => r.stock_quantity <= (r.safety_threshold * 0.35)).length;
        const totalDeficitUnits = lowRows.reduce((sum, r) => sum + (r.safety_threshold - r.stock_quantity), 0);

        return res.json({
            success: true,
            kpis: {
                totalItems: itemCountRows[0].total_items || 0,
                totalWarehouses: warehouseCountRows[0].total_warehouses || 0,
                totalStockUnits,
                totalLowStockAlerts: lowRows.length,
                criticalAlerts,
                totalDeficitUnits
            }
        });
    } catch (err) {
        console.error('Inventory KPIs error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch inventory KPIs' });
    }
});

// 2.4 POST /api/inventory/restock - Replenish Stock for Item at Warehouse
router.post('/restock', async (req, res) => {
    const { warehouse_id, item_id, quantity } = req.body;

    const wId = parseInt(warehouse_id, 10);
    const iId = parseInt(item_id, 10);
    const qty = parseInt(quantity, 10);

    if (!wId || !iId || !qty || qty <= 0) {
        return res.status(400).json({ error: 'Please specify a valid warehouse, item, and positive restock quantity.' });
    }

    try {
        await pool.promise().query(
            `INSERT INTO Warehouse_Stocks (warehouse_id, item_id, stock_quantity)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE stock_quantity = stock_quantity + ?`,
            [wId, iId, qty, qty]
        );

        const [updatedRows] = await pool.promise().query(
            `SELECT ws.stock_quantity, i.safety_threshold, i.name AS item_name, w.name AS warehouse_name
             FROM Warehouse_Stocks ws
             JOIN Items i ON ws.item_id = i.item_id
             JOIN Warehouses w ON ws.warehouse_id = w.warehouse_id
             WHERE ws.warehouse_id = ? AND ws.item_id = ?`,
            [wId, iId]
        );

        const updated = updatedRows[0];
        const isStillLow = updated ? updated.stock_quantity < updated.safety_threshold : false;

        return res.json({
            success: true,
            message: `Successfully restocked +${qty} units of "${updated?.item_name || 'Item'}" at ${updated?.warehouse_name || 'Warehouse'}. New Stock: ${updated?.stock_quantity} (Safety: ${updated?.safety_threshold}).`,
            stock: {
                warehouse_id: wId,
                item_id: iId,
                new_quantity: updated?.stock_quantity,
                safety_threshold: updated?.safety_threshold,
                is_low_stock: isStillLow
            }
        });
    } catch (err) {
        console.error('Restock DB Error:', err.message);
        const stockRecord = warehouseStocks.find(ws => ws.warehouse_id === wId && ws.item_id === iId);
        const item = items.find(i => i.item_id === iId);
        const warehouse = warehouses.find(w => w.warehouse_id === wId);

        let newQty = qty;
        if (stockRecord) {
            stockRecord.stock_quantity += qty;
            newQty = stockRecord.stock_quantity;
        } else {
            warehouseStocks.push({
                warehouse_id: wId,
                item_id: iId,
                stock_quantity: qty
            });
        }

        const thresh = item ? item.safety_threshold : 10;
        const isStillLow = newQty < thresh;

        return res.json({
            success: true,
            message: `Successfully restocked +${qty} units of "${item ? item.name : 'Item'}" at ${warehouse ? warehouse.name : 'Warehouse'} (Demo session). New Stock: ${newQty} (Safety: ${thresh}).`,
            stock: {
                warehouse_id: wId,
                item_id: iId,
                new_quantity: newQty,
                safety_threshold: thresh,
                is_low_stock: isStillLow
            }
        });
    }
});

// 2.5 PUT /api/inventory/items/:itemId/threshold - Adjust Item Safety Threshold
router.put('/items/:itemId/threshold', async (req, res) => {
    const itemId = parseInt(req.params.itemId, 10);
    const { safety_threshold } = req.body;

    const threshold = parseInt(safety_threshold, 10);
    if (isNaN(threshold) || threshold < 1) {
        return res.status(400).json({ error: 'Safety threshold must be a positive integer.' });
    }

    try {
        const [result] = await pool.promise().query(
            'UPDATE Items SET safety_threshold = ? WHERE item_id = ?',
            [threshold, itemId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Item not found.' });
        }

        return res.json({
            success: true,
            message: `Safety threshold updated to ${threshold} units for Item #${itemId}.`,
            item_id: itemId,
            safety_threshold: threshold
        });
    } catch (err) {
        console.error('Threshold update DB Error:', err.message);
        const item = items.find(i => i.item_id === itemId);
        if (!item) return res.status(404).json({ error: 'Item not found.' });

        item.safety_threshold = threshold;
        return res.json({
            success: true,
            message: `Safety threshold updated to ${threshold} units for "${item.name}" (Demo session).`,
            item_id: itemId,
            safety_threshold: threshold
        });
    }
});

// ============================================================================
// ============================================================================
// SECTION 3: GOODS MONITORING & QUARANTINE CONTROL (Features.md Shafein's - Feature 3)
// Report/insert view over damaged_inventory and expired_inventory so quarantined
// stock can NEVER be resold or dispatched to customer orders.
// Tables: Damaged_Inventory, Expired_Inventory, Quarantined_Goods_View
// ============================================================================
// ============================================================================

// 3.1 GET /api/inventory/goods-monitoring - Report View Over Damaged & Expired Inventory
router.get('/goods-monitoring', async (req, res) => {
    const { type, warehouse_id, status, search } = req.query;

    try {
        let sql = `
            SELECT 
                quarantine_type,
                record_id,
                warehouse_id,
                warehouse_name,
                location_zone,
                item_id,
                item_name,
                sku,
                quantity,
                reason,
                condition_grade,
                batch_lot_number,
                expiration_date,
                quarantine_status,
                date_logged,
                logged_by,
                notes
            FROM Quarantined_Goods_View
            WHERE 1=1
        `;
        const params = [];

        if (type && type !== 'all') {
            sql += ' AND LOWER(quarantine_type) = ?';
            params.push(type.toLowerCase());
        }

        if (warehouse_id && warehouse_id !== 'all') {
            sql += ' AND warehouse_id = ?';
            params.push(parseInt(warehouse_id, 10));
        }

        if (status && status !== 'all') {
            sql += ' AND LOWER(quarantine_status) = ?';
            params.push(status.toLowerCase());
        }

        if (search && search.trim()) {
            sql += ' AND (item_name LIKE ? OR sku LIKE ? OR reason LIKE ? OR logged_by LIKE ? OR batch_lot_number LIKE ?)';
            const s = `%${search.trim()}%`;
            params.push(s, s, s, s, s);
        }

        sql += ' ORDER BY date_logged DESC, record_id DESC';

        const [rows] = await pool.promise().query(sql, params);

        return res.json({
            success: true,
            totalRecords: rows.length,
            records: rows
        });
    } catch (err) {
        console.error('Goods Monitoring DB fallback:', err.message);

        // Fallback in-memory unification
        let records = [];

        damagedInventory.forEach(d => {
            const item = items.find(i => i.item_id === d.item_id);
            const warehouse = warehouses.find(w => w.warehouse_id === d.warehouse_id);

            records.push({
                quarantine_type: 'Damaged',
                record_id: d.damage_id,
                warehouse_id: d.warehouse_id,
                warehouse_name: warehouse ? warehouse.name : `Warehouse #${d.warehouse_id}`,
                location_zone: warehouse ? warehouse.location_zone : 'General',
                item_id: d.item_id,
                item_name: item ? item.name : `Item #${d.item_id}`,
                sku: item ? item.sku : 'N/A',
                quantity: d.quantity,
                reason: d.damage_reason,
                condition_grade: d.severity || 'Severe',
                batch_lot_number: null,
                expiration_date: null,
                quarantine_status: d.quarantine_status || 'Quarantined',
                date_logged: d.date_logged,
                logged_by: d.logged_by || 'Warehouse Staff',
                notes: d.notes || ''
            });
        });

        expiredInventory.forEach(e => {
            const item = items.find(i => i.item_id === e.item_id);
            const warehouse = warehouses.find(w => w.warehouse_id === e.warehouse_id);

            records.push({
                quarantine_type: 'Expired',
                record_id: e.expiry_id,
                warehouse_id: e.warehouse_id,
                warehouse_name: warehouse ? warehouse.name : `Warehouse #${e.warehouse_id}`,
                location_zone: warehouse ? warehouse.location_zone : 'General',
                item_id: e.item_id,
                item_name: item ? item.name : `Item #${e.item_id}`,
                sku: item ? item.sku : 'N/A',
                quantity: e.quantity,
                reason: `Expired Batch: ${e.batch_lot_number}`,
                condition_grade: 'Expired',
                batch_lot_number: e.batch_lot_number,
                expiration_date: e.expiration_date,
                quarantine_status: e.quarantine_status || 'Quarantined',
                date_logged: e.date_logged,
                logged_by: e.logged_by || 'Inventory Control',
                notes: e.notes || ''
            });
        });

        if (type && type !== 'all') {
            records = records.filter(r => r.quarantine_type.toLowerCase() === type.toLowerCase());
        }

        if (warehouse_id && warehouse_id !== 'all') {
            const wId = parseInt(warehouse_id, 10);
            records = records.filter(r => r.warehouse_id === wId);
        }

        if (status && status !== 'all') {
            records = records.filter(r => r.quarantine_status.toLowerCase() === status.toLowerCase());
        }

        if (search && search.trim()) {
            const s = search.trim().toLowerCase();
            records = records.filter(r => 
                r.item_name.toLowerCase().includes(s) || 
                r.sku.toLowerCase().includes(s) || 
                r.reason.toLowerCase().includes(s) || 
                r.logged_by.toLowerCase().includes(s) || 
                (r.batch_lot_number && r.batch_lot_number.toLowerCase().includes(s))
            );
        }

        records.sort((a, b) => new Date(b.date_logged) - new Date(a.date_logged) || b.record_id - a.record_id);

        return res.json({
            success: true,
            totalRecords: records.length,
            records
        });
    }
});

// 3.2 GET /api/inventory/goods-monitoring/kpis - Goods Monitoring Summary Metrics
router.get('/goods-monitoring/kpis', async (req, res) => {
    try {
        const [damagedRows] = await pool.promise().query(`SELECT quantity, quarantine_status, warehouse_id FROM Damaged_Inventory`);
        const [expiredRows] = await pool.promise().query(`SELECT quantity, quarantine_status, warehouse_id FROM Expired_Inventory`);

        const damagedUnits = damagedRows.reduce((sum, d) => sum + (d.quantity || 0), 0);
        const expiredUnits = expiredRows.reduce((sum, e) => sum + (e.quantity || 0), 0);
        const activeDamaged = damagedRows.filter(d => d.quarantine_status === 'Quarantined').reduce((sum, d) => sum + (d.quantity || 0), 0);
        const activeExpired = expiredRows.filter(e => e.quarantine_status === 'Quarantined').reduce((sum, e) => sum + (e.quantity || 0), 0);
        const writtenOff = damagedRows.filter(d => d.quarantine_status === 'Written Off' || d.quarantine_status === 'Disposed').reduce((sum, d) => sum + (d.quantity || 0), 0) +
                           expiredRows.filter(e => e.quarantine_status === 'Written Off' || e.quarantine_status === 'Disposed').reduce((sum, e) => sum + (e.quantity || 0), 0);

        const affectedWSet = new Set([
            ...damagedRows.filter(d => d.quarantine_status === 'Quarantined').map(d => d.warehouse_id),
            ...expiredRows.filter(e => e.quarantine_status === 'Quarantined').map(e => e.warehouse_id)
        ]);

        return res.json({
            success: true,
            kpis: {
                totalQuarantinedRecords: damagedRows.length + expiredRows.length,
                totalQuarantinedUnits: damagedUnits + expiredUnits,
                damagedUnits,
                expiredUnits,
                activeQuarantineUnits: activeDamaged + activeExpired,
                writtenOffUnits: writtenOff,
                affectedWarehouses: affectedWSet.size
            }
        });
    } catch (err) {
        console.error('Goods Monitoring KPIs error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch goods monitoring KPIs' });
    }
});

// 3.3 POST /api/inventory/goods-monitoring/damage - Insert Damaged Inventory Record (Quarantine Isolation)
router.post('/goods-monitoring/damage', async (req, res) => {
    const {
        warehouse_id,
        item_id,
        quantity,
        damage_reason,
        severity,
        logged_by,
        notes,
        deduct_active_stock = true
    } = req.body;

    const wId = parseInt(warehouse_id, 10);
    const iId = parseInt(item_id, 10);
    const qty = parseInt(quantity, 10);

    if (!wId || !iId || !qty || qty <= 0 || !damage_reason || !damage_reason.trim()) {
        return res.status(400).json({ error: 'Please specify valid warehouse_id, item_id, positive quantity, and damage_reason.' });
    }

    const sev = severity || 'Severe';
    const staff = logged_by && logged_by.trim() ? logged_by.trim() : 'Warehouse QA Lead';
    const noteStr = notes && notes.trim() ? notes.trim() : 'Quarantined from shelf stock to prevent resale.';
    const dateLogged = new Date().toISOString().substring(0, 10);

    let conn;
    try {
        conn = await pool.promise().getConnection();
        await conn.beginTransaction();

        // 1. Insert into Damaged_Inventory
        const [insertRes] = await conn.query(
            `INSERT INTO Damaged_Inventory (warehouse_id, item_id, quantity, damage_reason, severity, quarantine_status, date_logged, logged_by, notes)
             VALUES (?, ?, ?, ?, ?, 'Quarantined', ?, ?, ?)`,
            [wId, iId, qty, damage_reason.trim(), sev, dateLogged, staff, noteStr]
        );

        // 2. Safely deduct from active sellable stock if requested so it can never be resold
        if (deduct_active_stock) {
            await conn.query(
                `UPDATE Warehouse_Stocks 
                 SET stock_quantity = GREATEST(0, stock_quantity - ?) 
                 WHERE warehouse_id = ? AND item_id = ?`,
                [qty, wId, iId]
            );
        }

        const [itemRows] = await conn.query('SELECT name, sku FROM Items WHERE item_id = ?', [iId]);
        const [warehouseRows] = await conn.query('SELECT name FROM Warehouses WHERE warehouse_id = ?', [wId]);

        await conn.commit();
        conn.release();

        return res.json({
            success: true,
            message: `Successfully logged ${qty} damaged units of "${itemRows[0]?.name || 'Item'}" into Quarantine Isolation at ${warehouseRows[0]?.name || 'Warehouse'}. Stock isolated from order dispatch.`,
            damage_id: insertRes.insertId,
            quarantined: {
                damage_id: insertRes.insertId,
                warehouse_id: wId,
                warehouse_name: warehouseRows[0]?.name,
                item_id: iId,
                item_name: itemRows[0]?.name,
                quantity: qty,
                damage_reason: damage_reason.trim(),
                severity: sev,
                quarantine_status: 'Quarantined',
                date_logged: dateLogged
            }
        });
    } catch (err) {
        if (conn) {
            try { await conn.rollback(); conn.release(); } catch (_) {}
        }
        console.error('Damaged Inventory DB Error:', err.message);

        // Fallback in-memory
        const newId = damagedInventory.length ? Math.max(...damagedInventory.map(d => d.damage_id)) + 1 : 1;
        const newRecord = {
            damage_id: newId,
            warehouse_id: wId,
            item_id: iId,
            quantity: qty,
            damage_reason: damage_reason.trim(),
            severity: sev,
            quarantine_status: 'Quarantined',
            date_logged: dateLogged,
            logged_by: staff,
            notes: noteStr
        };
        damagedInventory.unshift(newRecord);

        if (deduct_active_stock) {
            const stockRec = warehouseStocks.find(ws => ws.warehouse_id === wId && ws.item_id === iId);
            if (stockRec) {
                stockRec.stock_quantity = Math.max(0, stockRec.stock_quantity - qty);
            }
        }

        const item = items.find(i => i.item_id === iId);
        const warehouse = warehouses.find(w => w.warehouse_id === wId);

        return res.json({
            success: true,
            message: `Successfully logged ${qty} damaged units of "${item ? item.name : 'Item'}" into Quarantine Isolation at ${warehouse ? warehouse.name : 'Warehouse'} (Demo session). Stock locked from resale.`,
            damage_id: newId,
            quarantined: {
                damage_id: newId,
                warehouse_id: wId,
                warehouse_name: warehouse?.name,
                item_id: iId,
                item_name: item?.name,
                quantity: qty,
                damage_reason: damage_reason.trim(),
                severity: sev,
                quarantine_status: 'Quarantined',
                date_logged: dateLogged
            }
        });
    }
});

// 3.4 POST /api/inventory/goods-monitoring/expiry - Insert Expired Inventory Record (Quarantine Isolation)
router.post('/goods-monitoring/expiry', async (req, res) => {
    const {
        warehouse_id,
        item_id,
        batch_lot_number,
        quantity,
        expiration_date,
        logged_by,
        notes,
        deduct_active_stock = true
    } = req.body;

    const wId = parseInt(warehouse_id, 10);
    const iId = parseInt(item_id, 10);
    const qty = parseInt(quantity, 10);

    if (!wId || !iId || !qty || qty <= 0 || !batch_lot_number || !batch_lot_number.trim() || !expiration_date) {
        return res.status(400).json({ error: 'Please specify warehouse_id, item_id, positive quantity, batch_lot_number, and expiration_date.' });
    }

    const staff = logged_by && logged_by.trim() ? logged_by.trim() : 'Inventory Compliance Officer';
    const noteStr = notes && notes.trim() ? notes.trim() : 'Shelf-life expired. Quarantined for disposal.';
    const dateLogged = new Date().toISOString().substring(0, 10);

    let conn;
    try {
        conn = await pool.promise().getConnection();
        await conn.beginTransaction();

        // 1. Insert into Expired_Inventory
        const [insertRes] = await conn.query(
            `INSERT INTO Expired_Inventory (warehouse_id, item_id, batch_lot_number, quantity, expiration_date, quarantine_status, date_logged, logged_by, notes)
             VALUES (?, ?, ?, ?, ?, 'Quarantined', ?, ?, ?)`,
            [wId, iId, batch_lot_number.trim(), qty, expiration_date, dateLogged, staff, noteStr]
        );

        // 2. Safely deduct from active sellable stock if requested so it can never be resold
        if (deduct_active_stock) {
            await conn.query(
                `UPDATE Warehouse_Stocks 
                 SET stock_quantity = GREATEST(0, stock_quantity - ?) 
                 WHERE warehouse_id = ? AND item_id = ?`,
                [qty, wId, iId]
            );
        }

        const [itemRows] = await conn.query('SELECT name, sku FROM Items WHERE item_id = ?', [iId]);
        const [warehouseRows] = await conn.query('SELECT name FROM Warehouses WHERE warehouse_id = ?', [wId]);

        await conn.commit();
        conn.release();

        return res.json({
            success: true,
            message: `Successfully logged ${qty} units of expired batch "${batch_lot_number}" (${itemRows[0]?.name || 'Item'}) into Quarantine Isolation at ${warehouseRows[0]?.name || 'Warehouse'}.`,
            expiry_id: insertRes.insertId,
            quarantined: {
                expiry_id: insertRes.insertId,
                warehouse_id: wId,
                warehouse_name: warehouseRows[0]?.name,
                item_id: iId,
                item_name: itemRows[0]?.name,
                batch_lot_number: batch_lot_number.trim(),
                quantity: qty,
                expiration_date: expiration_date,
                quarantine_status: 'Quarantined',
                date_logged: dateLogged
            }
        });
    } catch (err) {
        if (conn) {
            try { await conn.rollback(); conn.release(); } catch (_) {}
        }
        console.error('Expired Inventory DB Error:', err.message);

        // Fallback in-memory
        const newId = expiredInventory.length ? Math.max(...expiredInventory.map(e => e.expiry_id)) + 1 : 1;
        const newRecord = {
            expiry_id: newId,
            warehouse_id: wId,
            item_id: iId,
            batch_lot_number: batch_lot_number.trim(),
            quantity: qty,
            expiration_date: expiration_date,
            quarantine_status: 'Quarantined',
            date_logged: dateLogged,
            logged_by: staff,
            notes: noteStr
        };
        expiredInventory.unshift(newRecord);

        if (deduct_active_stock) {
            const stockRec = warehouseStocks.find(ws => ws.warehouse_id === wId && ws.item_id === iId);
            if (stockRec) {
                stockRec.stock_quantity = Math.max(0, stockRec.stock_quantity - qty);
            }
        }

        const item = items.find(i => i.item_id === iId);
        const warehouse = warehouses.find(w => w.warehouse_id === wId);

        return res.json({
            success: true,
            message: `Successfully logged ${qty} units of expired batch "${batch_lot_number}" (${item ? item.name : 'Item'}) into Quarantine Isolation at ${warehouse ? warehouse.name : 'Warehouse'} (Demo session).`,
            expiry_id: newId,
            quarantined: {
                expiry_id: newId,
                warehouse_id: wId,
                warehouse_name: warehouse?.name,
                item_id: iId,
                item_name: item?.name,
                batch_lot_number: batch_lot_number.trim(),
                quantity: qty,
                expiration_date: expiration_date,
                quarantine_status: 'Quarantined',
                date_logged: dateLogged
            }
        });
    }
});

// 3.5 PUT /api/inventory/goods-monitoring/:type/:id/status - Advance Quarantine Status (e.g. Quarantined -> Written Off / Disposed)
router.put('/goods-monitoring/:type/:id/status', async (req, res) => {
    const { type, id } = req.params;
    const { status, notes } = req.body;

    const recordId = parseInt(id, 10);
    const validStatuses = ['Quarantined', 'Inspected', 'Written Off', 'Disposed'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Valid values: ${validStatuses.join(', ')}` });
    }

    const isDamaged = type.toLowerCase() === 'damaged';
    const isExpired = type.toLowerCase() === 'expired';

    if (!isDamaged && !isExpired) {
        return res.status(400).json({ error: 'Type must be "damaged" or "expired".' });
    }

    try {
        const table = isDamaged ? 'Damaged_Inventory' : 'Expired_Inventory';
        const idCol = isDamaged ? 'damage_id' : 'expiry_id';

        let newNotes = null;
        if (notes && notes.trim()) {
            const [existingRows] = await pool.promise().query(
                `SELECT notes FROM ${table} WHERE ${idCol} = ?`,
                [recordId]
            );
            if (existingRows.length === 0) {
                return res.status(404).json({ error: 'Quarantine record not found.' });
            }
            const currentNotes = existingRows[0].notes || '';
            newNotes = `${currentNotes} | [Status Update: ${status}] ${notes.trim()}`;
        }

        let updateSql = `UPDATE ${table} SET quarantine_status = ?`;
        const params = [status];

        if (newNotes !== null) {
            updateSql += ', notes = ?';
            params.push(newNotes);
        }

        updateSql += ` WHERE ${idCol} = ?`;
        params.push(recordId);

        const [result] = await pool.promise().query(updateSql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Quarantine record not found.' });
        }

        return res.json({
            success: true,
            message: `Quarantine status advanced to "${status}" for ${isDamaged ? 'Damaged' : 'Expired'} Record #${recordId}.`,
            record_id: recordId,
            type: isDamaged ? 'Damaged' : 'Expired',
            new_status: status
        });
    } catch (err) {
        console.error('Update Quarantine Status DB Error:', err.message);

        const targetArray = isDamaged ? damagedInventory : expiredInventory;
        const idKey = isDamaged ? 'damage_id' : 'expiry_id';
        const record = targetArray.find(r => r[idKey] === recordId);

        if (!record) {
            return res.status(404).json({ error: 'Quarantine record not found.' });
        }

        record.quarantine_status = status;
        if (notes && notes.trim()) {
            record.notes = (record.notes ? record.notes + ' | ' : '') + `[Status Update: ${status}] ${notes.trim()}`;
        }

        return res.json({
            success: true,
            message: `Quarantine status advanced to "${status}" for ${isDamaged ? 'Damaged' : 'Expired'} Record #${recordId} (Demo session).`,
            record_id: recordId,
            type: isDamaged ? 'Damaged' : 'Expired',
            new_status: status
        });
    }
});

module.exports = {
    router
};
