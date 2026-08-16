const express = require('express');
const router = express.Router();
const pool = require('../db');

// In-memory fallback datasets matching logiroute.sql
let inMemoryWarehouses = [
    { warehouse_id: 1, name: 'North Central Hub', location_zone: 'North Zone' },
    { warehouse_id: 2, name: 'South River Logistics', location_zone: 'South Zone' },
    { warehouse_id: 3, name: 'East Valley Depot', location_zone: 'East Zone' },
    { warehouse_id: 4, name: 'West Coast Fulfillment', location_zone: 'West Zone' }
];

let inMemoryItems = [
    { item_id: 1, name: 'Heavy Duty Shipping Box (L)', safety_threshold: 50, sku: 'BOX-HD-L-001' },
    { item_id: 2, name: 'Thermal Bubble Wrap Roll 50m', safety_threshold: 20, sku: 'WRAP-TH-50M' },
    { item_id: 3, name: 'Industrial Packing Tape 6pk', safety_threshold: 30, sku: 'TAPE-IND-6PK' },
    { item_id: 4, name: 'Standard Cardboard Box (M)', safety_threshold: 40, sku: 'BOX-STD-M-002' },
    { item_id: 5, name: 'Fragile Warning Sticker Roll', safety_threshold: 15, sku: 'LBL-FRG-1000' },
    { item_id: 6, name: 'Self-Sealing Poly Mailers 100pk', safety_threshold: 25, sku: 'POLY-MLR-100' },
    { item_id: 7, name: 'Stretch Wrap Film 500m', safety_threshold: 15, sku: 'STR-FLM-500' },
    { item_id: 8, name: 'Corrugated Cushioning Pads 50pk', safety_threshold: 20, sku: 'PAD-COR-50PK' }
];

let inMemoryWarehouseStocks = [
    { warehouse_id: 1, item_id: 1, stock_quantity: 150 },
    { warehouse_id: 1, item_id: 2, stock_quantity: 8 },    // Low stock (thresh: 20, deficit: 12)
    { warehouse_id: 1, item_id: 3, stock_quantity: 75 },
    { warehouse_id: 1, item_id: 4, stock_quantity: 120 },
    { warehouse_id: 1, item_id: 5, stock_quantity: 5 },    // Critical (thresh: 15, deficit: 10)
    { warehouse_id: 2, item_id: 1, stock_quantity: 80 },
    { warehouse_id: 2, item_id: 2, stock_quantity: 45 },
    { warehouse_id: 2, item_id: 3, stock_quantity: 12 },   // Low stock (thresh: 30, deficit: 18)
    { warehouse_id: 2, item_id: 6, stock_quantity: 95 },
    { warehouse_id: 3, item_id: 4, stock_quantity: 30 },   // Low stock (thresh: 40, deficit: 10)
    { warehouse_id: 3, item_id: 5, stock_quantity: 40 },
    { warehouse_id: 3, item_id: 7, stock_quantity: 60 },
    { warehouse_id: 4, item_id: 1, stock_quantity: 110 },
    { warehouse_id: 4, item_id: 7, stock_quantity: 8 },    // Low stock (thresh: 15, deficit: 7)
    { warehouse_id: 4, item_id: 8, stock_quantity: 55 }
];

// Severity helper
function determineSeverity(stockQuantity, safetyThreshold) {
    if (stockQuantity <= 0) return 'Out of Stock';
    if (stockQuantity <= (safetyThreshold * 0.35)) return 'Critical';
    return 'Low Stock';
}

// ============================================================================
// 1. GET /api/inventory/low-stock
// FEATURE: Low Stock Alert (Features.md - Teammate 3, Feature 2)
// Query warehouse_stocks where stock_quantity is below the item's safety_threshold.
// Tables: warehouse_stocks, items, warehouses
// ============================================================================
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
        console.error('Low Stock DB Error, using in-memory fallback:', err.message);

        let alerts = inMemoryWarehouseStocks
            .map(ws => {
                const item = inMemoryItems.find(i => i.item_id === ws.item_id);
                const warehouse = inMemoryWarehouses.find(w => w.warehouse_id === ws.warehouse_id);
                if (!item || !warehouse) return null;

                if (ws.stock_quantity < item.safety_threshold) {
                    const deficit = item.safety_threshold - ws.stock_quantity;
                    const stockPercentage = Math.round((ws.stock_quantity / item.safety_threshold) * 1000) / 10;
                    const alertSeverity = determineSeverity(ws.stock_quantity, item.safety_threshold);

                    return {
                        warehouse_id: ws.warehouse_id,
                        warehouse_name: warehouse.name,
                        location_zone: warehouse.location_zone,
                        item_id: item.item_id,
                        item_name: item.name,
                        sku: item.sku,
                        safety_threshold: item.safety_threshold,
                        stock_quantity: ws.stock_quantity,
                        deficit: deficit,
                        stock_percentage: stockPercentage,
                        alert_severity: alertSeverity
                    };
                }
                return null;
            })
            .filter(Boolean)
            .sort((a, b) => a.stock_quantity - b.stock_quantity || b.deficit - a.deficit);

        if (warehouse_id && warehouse_id !== 'all') {
            const wId = parseInt(warehouse_id, 10);
            alerts = alerts.filter(a => a.warehouse_id === wId);
        }

        if (severity && severity !== 'all') {
            alerts = alerts.filter(a => a.alert_severity.toLowerCase() === severity.toLowerCase());
        }

        return res.json({
            success: true,
            totalAlerts: alerts.length,
            alerts
        });
    }
});

// ============================================================================
// 2. GET /api/inventory/stock-matrix - Full Item vs Warehouse Stock Matrix
// ============================================================================
router.get('/stock-matrix', async (req, res) => {
    try {
        const query = `
            SELECT 
                ws.warehouse_id,
                w.name AS warehouse_name,
                w.location_zone,
                i.item_id,
                i.name AS item_name,
                i.sku,
                i.safety_threshold,
                ws.stock_quantity,
                (ws.stock_quantity < i.safety_threshold) AS is_low_stock,
                (i.safety_threshold - ws.stock_quantity) AS deficit,
                CASE 
                    WHEN ws.stock_quantity = 0 THEN 'Out of Stock'
                    WHEN ws.stock_quantity < i.safety_threshold THEN 'Low Stock'
                    ELSE 'Optimal'
                END AS stock_status
            FROM Warehouse_Stocks ws
            JOIN Items i ON ws.item_id = i.item_id
            JOIN Warehouses w ON ws.warehouse_id = w.warehouse_id
            ORDER BY w.warehouse_id ASC, i.item_id ASC
        `;
        const [rows] = await pool.promise().query(query);
        return res.json({ success: true, matrix: rows });
    } catch (err) {
        console.error('Stock Matrix fallback:', err.message);
        const matrix = inMemoryWarehouseStocks.map(ws => {
            const item = inMemoryItems.find(i => i.item_id === ws.item_id);
            const warehouse = inMemoryWarehouses.find(w => w.warehouse_id === ws.warehouse_id);
            const isLow = ws.stock_quantity < (item ? item.safety_threshold : 0);
            const deficit = item ? (item.safety_threshold - ws.stock_quantity) : 0;
            let status = 'Optimal';
            if (ws.stock_quantity === 0) status = 'Out of Stock';
            else if (isLow) status = 'Low Stock';

            return {
                warehouse_id: ws.warehouse_id,
                warehouse_name: warehouse ? warehouse.name : `Warehouse #${ws.warehouse_id}`,
                location_zone: warehouse ? warehouse.location_zone : 'Unknown Zone',
                item_id: ws.item_id,
                item_name: item ? item.name : `Item #${ws.item_id}`,
                sku: item ? item.sku : `SKU-${ws.item_id}`,
                safety_threshold: item ? item.safety_threshold : 10,
                stock_quantity: ws.stock_quantity,
                is_low_stock: isLow ? 1 : 0,
                deficit: deficit > 0 ? deficit : 0,
                stock_status: status
            };
        });

        return res.json({ success: true, matrix });
    }
});

// ============================================================================
// 3. GET /api/inventory/warehouses - Warehouses List with Stock Health Summary
// ============================================================================
router.get('/warehouses', async (req, res) => {
    try {
        const query = `
            SELECT 
                w.warehouse_id,
                w.name,
                w.location_zone,
                COUNT(ws.item_id) AS total_items_stocked,
                COALESCE(SUM(ws.stock_quantity), 0) AS total_units_stored,
                SUM(CASE WHEN ws.stock_quantity < i.safety_threshold THEN 1 ELSE 0 END) AS low_stock_alerts_count
            FROM Warehouses w
            LEFT JOIN Warehouse_Stocks ws ON w.warehouse_id = ws.warehouse_id
            LEFT JOIN Items i ON ws.item_id = i.item_id
            GROUP BY w.warehouse_id, w.name, w.location_zone
            ORDER BY w.warehouse_id ASC
        `;
        const [rows] = await pool.promise().query(query);
        return res.json({ success: true, warehouses: rows });
    } catch (err) {
        console.error('Warehouses fallback:', err.message);
        const warehouses = inMemoryWarehouses.map(w => {
            const stocks = inMemoryWarehouseStocks.filter(ws => ws.warehouse_id === w.warehouse_id);
            const totalUnits = stocks.reduce((sum, ws) => sum + ws.stock_quantity, 0);
            const lowStockCount = stocks.filter(ws => {
                const item = inMemoryItems.find(i => i.item_id === ws.item_id);
                return item && ws.stock_quantity < item.safety_threshold;
            }).length;

            return {
                warehouse_id: w.warehouse_id,
                name: w.name,
                location_zone: w.location_zone,
                total_items_stocked: stocks.length,
                total_units_stored: totalUnits,
                low_stock_alerts_count: lowStockCount
            };
        });

        return res.json({ success: true, warehouses });
    }
});

// ============================================================================
// 4. GET /api/inventory/kpis - Inventory & Low Stock KPI Metrics
// ============================================================================
router.get('/kpis', async (req, res) => {
    try {
        const [itemRows] = await pool.promise().query('SELECT COUNT(*) AS total_items FROM Items');
        const [whRows] = await pool.promise().query('SELECT COUNT(*) AS total_warehouses FROM Warehouses');
        const [stockRows] = await pool.promise().query('SELECT COALESCE(SUM(stock_quantity), 0) AS total_stock_units FROM Warehouse_Stocks');
        
        const [alertRows] = await pool.promise().query(`
            SELECT 
                COUNT(*) AS total_low_stock_alerts,
                COALESCE(SUM(i.safety_threshold - ws.stock_quantity), 0) AS total_deficit_units,
                SUM(CASE WHEN ws.stock_quantity <= (i.safety_threshold * 0.35) THEN 1 ELSE 0 END) AS critical_alerts
            FROM Warehouse_Stocks ws
            JOIN Items i ON ws.item_id = i.item_id
            WHERE ws.stock_quantity < i.safety_threshold
        `);

        return res.json({
            success: true,
            kpis: {
                totalItems: itemRows[0].total_items || 0,
                totalWarehouses: whRows[0].total_warehouses || 0,
                totalStockUnits: stockRows[0].total_stock_units || 0,
                totalLowStockAlerts: alertRows[0].total_low_stock_alerts || 0,
                criticalAlerts: alertRows[0].critical_alerts || 0,
                totalDeficitUnits: alertRows[0].total_deficit_units || 0
            }
        });
    } catch (err) {
        console.error('Inventory KPIs fallback:', err.message);
        const lowStockItems = inMemoryWarehouseStocks.filter(ws => {
            const item = inMemoryItems.find(i => i.item_id === ws.item_id);
            return item && ws.stock_quantity < item.safety_threshold;
        });

        const totalDeficit = lowStockItems.reduce((sum, ws) => {
            const item = inMemoryItems.find(i => i.item_id === ws.item_id);
            return sum + (item ? (item.safety_threshold - ws.stock_quantity) : 0);
        }, 0);

        const criticalCount = lowStockItems.filter(ws => {
            const item = inMemoryItems.find(i => i.item_id === ws.item_id);
            return item && ws.stock_quantity <= (item.safety_threshold * 0.35);
        }).length;

        const totalStockUnits = inMemoryWarehouseStocks.reduce((sum, ws) => sum + ws.stock_quantity, 0);

        return res.json({
            success: true,
            kpis: {
                totalItems: inMemoryItems.length,
                totalWarehouses: inMemoryWarehouses.length,
                totalStockUnits,
                totalLowStockAlerts: lowStockItems.length,
                criticalAlerts: criticalCount,
                totalDeficitUnits: totalDeficit
            }
        });
    }
});

// ============================================================================
// 5. POST /api/inventory/restock - Replenish Stock for Item at Warehouse
// ============================================================================
router.post('/restock', async (req, res) => {
    const { warehouse_id, item_id, quantity } = req.body;

    const wId = parseInt(warehouse_id, 10);
    const iId = parseInt(item_id, 10);
    const qty = parseInt(quantity, 10);

    if (!wId || !iId || !qty || qty <= 0) {
        return res.status(400).json({ error: 'Please specify a valid warehouse, item, and positive restock quantity.' });
    }

    try {
        // Upsert stock quantity
        await pool.promise().query(
            `INSERT INTO Warehouse_Stocks (warehouse_id, item_id, stock_quantity)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE stock_quantity = stock_quantity + ?`,
            [wId, iId, qty, qty]
        );

        // Fetch updated stock & safety threshold
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
        const stockRecord = inMemoryWarehouseStocks.find(ws => ws.warehouse_id === wId && ws.item_id === iId);
        const item = inMemoryItems.find(i => i.item_id === iId);
        const warehouse = inMemoryWarehouses.find(w => w.warehouse_id === wId);

        let newQty = qty;
        if (stockRecord) {
            stockRecord.stock_quantity += qty;
            newQty = stockRecord.stock_quantity;
        } else {
            inMemoryWarehouseStocks.push({
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

// ============================================================================
// 6. PUT /api/inventory/items/:itemId/threshold - Adjust Item Safety Threshold
// ============================================================================
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
        const item = inMemoryItems.find(i => i.item_id === itemId);
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

module.exports = {
    router,
    inMemoryWarehouses,
    inMemoryWarehouseStocks,
    inMemoryItems
};
