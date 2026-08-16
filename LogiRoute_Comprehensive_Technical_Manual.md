**LOGIROUTE: COMPLETE EXHAUSTIVE TECHNICAL ARCHITECTURE MANUAL**

_Comprehensive Backend Implementation & SQL Router Reference For All 5 Modules  
Stack: Node.js (Express) | MySQL 8.0 | HTML5 / CSS3_

# 1\. System Design & Global Architecture

This reference guide breaks down the full code implementations and database mechanics for all 5 operational modules of LogiRoute. Each section details the explicit route logic, inputs, parameters, and precise underlying MySQL operations needed to build a robust system.

## 2\. Shared Infrastructure: config/db.js

const mysql = require('mysql2/promise');  
const pool = mysql.createPool({  
host: process.env.DB_HOST || 'localhost',  
user: process.env.DB_USER || 'root',  
password: process.env.DB_PASSWORD || 'secret',  
database: process.env.DB_NAME || 'logiroute_db',  
waitForConnections: true, connectionLimit: 10, queueLimit: 0  
});  
module.exports = pool;

# Module A: Managing Storage & Items (routes/inventory.js)

F1: Smart Item Counter (Add Stock record)  
SQL Operation: Ensures composite uniqueness using primary key constraints via an upsert pattern.

router.post('/stock', async (req, res) => {  
const { itemId, warehouseId, qty } = req.body;  
await pool.query('INSERT INTO warehouse_stocks (item_id, warehouse_id, stock_quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE stock_quantity = stock_quantity + ?', \[itemId, warehouseId, qty, qty\]);  
res.json({ success: true });  
});

F2: Low Stock Warning System  
SQL Operation: Selects evaluations against safety baseline thresholds.

router.get('/low-stock', async (req, res) => {  
const \[rows\] = await pool.query('SELECT w.warehouse_id, w.name as w_name, i.item_id, i.name as i_name, ws.stock_quantity, i.safety_threshold FROM warehouse_stocks ws JOIN items i ON ws.item_id = i.item_id JOIN warehouses w ON ws.warehouse_id = w.warehouse_id WHERE ws.stock_quantity < i.safety_threshold');  
res.json(rows);  
});

F3: Safe Stock Mover (Transactional Realignment)  
SQL Operation: Run multi-statement atomic changes enclosed within connection execution boundaries.

router.post('/transfer', async (req, res) => {  
const { itemId, sourceId, destId, qty } = req.body;  
const conn = await pool.getConnection();  
try {  
await conn.beginTransaction();  
const \[s\] = await conn.query('SELECT stock_quantity FROM warehouse_stocks WHERE item_id = ? AND warehouse_id = ? FOR UPDATE', \[itemId, sourceId\]);  
if(!s.length || s\[0\].stock_quantity < qty) throw new Error('Insufficient quantities.');  
await conn.query('UPDATE warehouse_stocks SET stock_quantity = stock_quantity - ? WHERE item_id = ? AND warehouse_id = ?', \[qty, itemId, sourceId\]);  
await conn.query('INSERT INTO warehouse_stocks (item_id, warehouse_id, stock_quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE stock_quantity = stock_quantity + ?', \[itemId, destId, qty, qty\]);  
await conn.commit(); res.json({ success: true });  
} catch(e) { await conn.rollback(); res.status(400).json({ error: e.message }); } finally { conn.release(); }  
});

# Module B: Orders & Driver Delivery (routes/delivery.js)

F4: Delivery Zone Grouper  
SQL Operation: Aggregates pending elements matching localized distribution regions.

router.get('/batches', async (req, res) => {  
const \[rows\] = await pool.query("SELECT zone_prefix, COUNT(\*) as pending_orders FROM orders WHERE order_status = 'Pending' GROUP BY zone_prefix ORDER BY pending_orders DESC");  
res.json(rows);  
});

F5: Driver Dispatcher (Atomic Fleet Tasking)  
SQL Operation: Updates associated parameters inside a transaction block.

router.post('/dispatch', async (req, res) => {  
const { driverId, zonePrefix } = req.body;  
const conn = await pool.getConnection();  
try {  
await conn.beginTransaction();  
await conn.query("UPDATE orders SET order_status = 'Dispatched', driver_id = ? WHERE zone_prefix = ? AND order_status = 'Pending'", \[driverId, zonePrefix\]);  
await conn.query("UPDATE drivers SET status_flag = 'On Trip' WHERE driver_id = ?", \[driverId\]);  
await conn.commit(); res.json({ success: true });  
} catch(e) { await conn.rollback(); res.status(400).json({ error: e.message }); } finally { conn.release(); }  
});

F6: Express Lane Skipper (Priority Queue Query)  
SQL Operation: Generates prioritized sequences routing high-tier shipments first.

router.get('/queue/:driverId', async (req, res) => {  
const \[rows\] = await pool.query("SELECT \* FROM orders WHERE driver_id = ? AND order_status = 'Dispatched' ORDER BY CASE WHEN shipping_type = 'Express' THEN 1 ELSE 2 END, order_id ASC", \[req.params.driverId\]);  
res.json(rows);  
});

# Module C: Driver Pay & Ratings (routes/finance.js)

F7: Digital Trip Log (Complete Trip)  
SQL Operation: Enforces trip completion states cleanly.

router.post('/trip-complete', async (req, res) => {  
const { driverId, distance, failedCount } = req.body;  
await pool.query('INSERT INTO trips (driver_id, distance_miles, start_time, end_time) VALUES (?, ?, NOW() - INTERVAL 2 HOUR, NOW())', \[driverId, distance\]);  
await pool.query("UPDATE drivers SET status_flag = 'Available' WHERE driver_id = ?", \[driverId\]);  
res.json({ success: true });  
});

F8: Automated Paycheck Calculator  
SQL Operation: Aggregates multidimensional travel parameters to compute base yields.

router.get('/payouts/:driverId', async (req, res) => {  
const \[rows\] = await pool.query('SELECT driver_id, COUNT(\*) as total_trips, SUM(distance_miles) as total_miles, (COUNT(\*) \* 25.00) + (SUM(distance_miles) \* 0.45) as weekly_pay FROM trips WHERE driver_id = ? AND start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)', \[req.params.driverId\]);  
res.json(rows\[0\]);  
});

F9: Poor Performance Flag  
SQL Operation: Scans dynamic rating levels, flagging edge anomalies.

router.post('/evaluate-performance', async (req, res) => {  
await pool.query("UPDATE drivers SET status_flag = 'Under Review' WHERE rating < 3.5");  
res.json({ status: 'Evaluation sync complete.' });  
});

# Module D: Customer Account & Updates (routes/customer.js)

F10: Arrival Time Guesser  
SQL Operation: Uses queue dimensions to approximate processing delays.

router.get('/eta/:orderId', async (req, res) => {  
const \[rows\] = await pool.query("SELECT o.order_id, o.order_status, (SELECT COUNT(\*) FROM orders o2 WHERE o2.driver_id = o.driver_id AND o2.order_id <= o.order_id AND o2.order_status = 'Dispatched') \* 20 as estimated_minutes_remaining FROM orders o WHERE o.order_id = ?", \[req.params.orderId\]);  
res.json(rows\[0\]);  
});

F11: Text & Email Simulator  
SQL Operation: Pushes message logs into operational staging grids.

router.post('/log-notification', async (req, res) => {  
const { orderId, msg } = req.body;  
await pool.query('INSERT INTO notification_queue (order_id, message_payload, dispatch_status) VALUES (?, ?, "Pending")', \[orderId, msg\]);  
res.json({ success: true });  
});

F12: Star Rating & Review Box  
SQL Operation: Attaches textual customer feedback loops directly back onto structural master records.

router.post('/feedback', async (req, res) => {  
const { orderId, driverId, stars, reviewText } = req.body;  
await pool.query('INSERT INTO customer_feedback (order_id, rating_score, feedback_text) VALUES (?, ?, ?)', \[orderId, stars, reviewText\]);  
await pool.query('UPDATE drivers SET rating = (SELECT AVG(rating_score) FROM customer_feedback cf JOIN orders o ON cf.order_id = o.order_id WHERE o.driver_id = ?) WHERE driver_id = ?', \[driverId, driverId\]);  
res.json({ success: true });  
});

# Module E: Returns & Refunds (routes/returns.js)

F13: Return Request Tracker  
SQL Operation: Coordinates customer return requests.

router.post('/return-request', async (req, res) => {  
const { orderId, reason } = req.body;  
await pool.query('INSERT INTO returns_tracker (original_order_id, return_status, issue_description) VALUES (?, "Return Initiated", ?)', \[orderId, reason\]);  
res.json({ success: true });  
});

F14: Damaged Box Quarantine  
SQL Operation: Isolates damaged returns using safe transactional pipelines.

router.post('/quarantine', async (req, res) => {  
const { itemId, warehouseId, qty, reason } = req.body;  
const conn = await pool.getConnection();  
try {  
await conn.beginTransaction();  
await conn.query('UPDATE warehouse_stocks SET stock_quantity = stock_quantity - ? WHERE item_id = ? AND warehouse_id = ?', \[qty, itemId, warehouseId\]);  
await conn.query('INSERT INTO defective_inventory (item_id, warehouse_id, quarantine_reason, date_logged) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE date_logged = NOW()', \[itemId, warehouseId, reason\]);  
await conn.commit(); res.json({ success: true });  
} catch(e) { await conn.rollback(); res.status(400).json({ error: e.message }); } finally { conn.release(); }  
});

F15: Automatic Customer Refund  
SQL Operation: Atomically processes financial allocations upon validation.

router.post('/refund', async (req, res) => {  
const { returnId, customerId, amount } = req.body;  
const conn = await pool.getConnection();  
try {  
await conn.beginTransaction();  
await conn.query('UPDATE returns_tracker SET return_status = "Approved" WHERE return_id = ?', \[returnId\]);  
await conn.query('INSERT INTO customer_credits (customer_id, balance_amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE balance_amount = balance_amount + ?', \[customerId, amount, amount\]);  
await conn.commit(); res.json({ success: true });  
} catch(e) { await conn.rollback(); res.status(400).json({ error: e.message }); } finally { conn.release(); }  
});