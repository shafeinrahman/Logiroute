const express = require('express');
const router = express.Router();
const pool = require('../db');
const { drivers, trips, paychecks, warehouses, orders } = require('./dataStore');

// Helper: Calculate trip earning
function calculateTripPay(baseRate, perKmBonus, distanceMiles) {
    const base = parseFloat(baseRate) || 0;
    const bonus = parseFloat(perKmBonus) || 0;
    const dist = parseFloat(distanceMiles) || 0;
    return parseFloat((base + (bonus * dist)).toFixed(2));
}

// ============================================================================
// 1. GET /api/drivers - List all drivers with calculated stats & zone
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const [driverRows] = await pool.promise().query(
            `SELECT driver_id, full_name, rating, per_km_bonus, base_rate, status_flag, location_zone FROM Drivers ORDER BY driver_id ASC`
        );
        const [tripRows] = await pool.promise().query(`SELECT driver_id, distance_miles FROM Trips`);
        const [paycheckRows] = await pool.promise().query(`SELECT driver_id, total_amount FROM Paycheck`);
        const [activeOrderRows] = await pool.promise().query(
            `SELECT driver_id FROM Orders WHERE order_status IN ('Out for Delivery', 'Dispatched')`
        );

        const driversWithStats = driverRows.map(d => {
            const driverTrips = tripRows.filter(t => t.driver_id === d.driver_id);
            const totalDistance = driverTrips.reduce((sum, t) => sum + (parseFloat(t.distance_miles) || 0), 0);
            const lifetimeEarnings = driverTrips.reduce((sum, t) => sum + calculateTripPay(d.base_rate, d.per_km_bonus, t.distance_miles), 0);

            const driverPaychecks = paycheckRows.filter(p => p.driver_id === d.driver_id);
            const totalPaid = driverPaychecks.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);

            return {
                ...d,
                total_trips: driverTrips.length,
                total_distance_miles: totalDistance.toFixed(2),
                calculated_lifetime_earnings: lifetimeEarnings.toFixed(2),
                paychecks_issued_count: driverPaychecks.length,
                total_paid_amount: totalPaid.toFixed(2),
                active_deliveries: activeOrderRows.filter(o => o.driver_id === d.driver_id).length
            };
        });

        return res.json({ success: true, drivers: driversWithStats });
    } catch (err) {
        console.error('Drivers list error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch drivers' });
    }
});

// ============================================================================
// 2. GET /api/drivers/kpis - Overall Driver Earnings KPI Metrics
// ============================================================================
router.get('/kpis', async (req, res) => {
    try {
        const [driverRows] = await pool.promise().query('SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM Drivers');
        const [tripRows] = await pool.promise().query('SELECT COUNT(*) as total_trips, SUM(distance_miles) as total_distance FROM Trips');
        const [payRows] = await pool.promise().query('SELECT COUNT(*) as paychecks_count, SUM(total_amount) as total_payout FROM Paycheck');

        const [tripDriverRows] = await pool.promise().query(`
            SELECT t.distance_miles, d.base_rate, d.per_km_bonus
            FROM Trips t
            JOIN Drivers d ON t.driver_id = d.driver_id
        `);
        const totalEarningsGenerated = tripDriverRows.reduce(
            (sum, r) => sum + calculateTripPay(r.base_rate, r.per_km_bonus, r.distance_miles), 0
        );

        return res.json({
            success: true,
            kpis: {
                totalDrivers: driverRows[0].count || 0,
                avgRating: driverRows[0].avg_rating ? parseFloat(driverRows[0].avg_rating).toFixed(2) : '5.00',
                totalTrips: tripRows[0].total_trips || 0,
                totalDistanceMiles: parseFloat(tripRows[0].total_distance || 0).toFixed(1),
                totalPaychecksIssued: payRows[0].paychecks_count || 0,
                totalPayoutRecorded: parseFloat(payRows[0].total_payout || 0).toFixed(2),
                totalEarningsGenerated: totalEarningsGenerated.toFixed(2)
            }
        });
    } catch (err) {
        console.error('Driver KPIs fallback:', err.message);
        const totalDrivers = drivers.length;
        const avgRating = (drivers.reduce((sum, d) => sum + d.rating, 0) / (totalDrivers || 1)).toFixed(2);
        const totalTrips = trips.length;
        const totalDistanceMiles = trips.reduce((sum, t) => sum + t.distance_miles, 0).toFixed(1);
        const totalPaychecksIssued = paychecks.length;
        const totalPayoutRecorded = paychecks.reduce((sum, p) => sum + p.total_amount, 0).toFixed(2);
        
        const totalEarningsGenerated = trips.reduce((sum, t) => {
            const driver = drivers.find(d => d.driver_id === t.driver_id);
            if (!driver) return sum;
            return sum + calculateTripPay(driver.base_rate, driver.per_km_bonus, t.distance_miles);
        }, 0).toFixed(2);

        return res.json({
            success: true,
            kpis: {
                totalDrivers,
                avgRating,
                totalTrips,
                totalDistanceMiles,
                totalPaychecksIssued,
                totalPayoutRecorded,
                totalEarningsGenerated
            }
        });
    }
});

// ============================================================================
// 3. GET /api/drivers/coverage-map
// FEATURE: Driver–Warehouse Coverage Map (Features.md - Moin's, Feature 1)
// Join drivers with warehouses on location_zone to show which drivers can realistically service which warehouse.
// Tables: drivers, warehouses
// ============================================================================
router.get('/coverage-map', async (req, res) => {
    const { zone } = req.query;

    try {
        const [warehouseBaseRows] = await pool.promise().query(
            `SELECT warehouse_id, name AS warehouse_name, location_zone FROM Warehouses`
        );
        const [allDriverRows] = await pool.promise().query(
            `SELECT driver_id, full_name, rating, status_flag, base_rate, per_km_bonus, location_zone FROM Drivers`
        );
        const [activeOrderRows] = await pool.promise().query(
            `SELECT driver_id FROM Orders WHERE order_status IN ('Out for Delivery', 'Dispatched')`
        );
        const [pendingOrderRows] = await pool.promise().query(
            `SELECT address FROM Orders WHERE order_status = 'Pending'`
        );

        // Match drivers/warehouses on location_zone (same logic as old JOIN)
        let matchedPairs = [];
        warehouseBaseRows.forEach(w => {
            const zoneDrivers = allDriverRows
                .filter(d => d.location_zone === w.location_zone)
                .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
            const pendingOrdersInZone = pendingOrderRows.filter(o => o.address && o.address.includes(w.location_zone)).length;

            zoneDrivers.forEach(d => {
                matchedPairs.push({
                    warehouse_id: w.warehouse_id,
                    warehouse_name: w.warehouse_name,
                    location_zone: w.location_zone,
                    driver_id: d.driver_id,
                    driver_name: d.full_name,
                    driver_rating: d.rating,
                    driver_status: d.status_flag,
                    base_rate: d.base_rate,
                    per_km_bonus: d.per_km_bonus,
                    active_deliveries: activeOrderRows.filter(o => o.driver_id === d.driver_id).length,
                    pending_orders_in_zone: pendingOrdersInZone
                });
            });
        });

        if (zone && zone !== 'all') {
            matchedPairs = matchedPairs.filter(p => p.location_zone === zone);
        }

        const coverageByWarehouse = warehouseBaseRows.map(w => {
            const matchedDrivers = matchedPairs.filter(p => p.warehouse_id === w.warehouse_id);
            const availCount = matchedDrivers.filter(d => d.driver_status === 'Available').length;
            const busyCount = matchedDrivers.filter(d => ['Busy', 'On Trip'].includes(d.driver_status)).length;
            const reviewCount = matchedDrivers.filter(d => d.driver_status === 'Under Review').length;
            const avgRating = matchedDrivers.length
                ? (matchedDrivers.reduce((sum, d) => sum + (parseFloat(d.driver_rating) || 0), 0) / matchedDrivers.length)
                : 0;

            return {
                warehouse_id: w.warehouse_id,
                warehouse_name: w.warehouse_name,
                location_zone: w.location_zone,
                total_assigned_drivers: matchedDrivers.length,
                available_drivers: availCount,
                busy_drivers: busyCount,
                under_review_drivers: reviewCount,
                avg_driver_rating: avgRating,
                drivers: matchedDrivers
            };
        });

        const warehouseByZone = {};
        warehouseBaseRows.forEach(w => { warehouseByZone[w.location_zone] = w; });
        const allDriversRows = allDriverRows.map(d => ({
            ...d,
            warehouse_id: warehouseByZone[d.location_zone]?.warehouse_id ?? null,
            warehouse_name: warehouseByZone[d.location_zone]?.warehouse_name ?? 'Unassigned / Cross-Zone'
        }));

        return res.json({
            success: true,
            totalMappedPairs: matchedPairs.length,
            coverage: coverageByWarehouse,
            detailedRows: matchedPairs,
            allDrivers: allDriversRows,
            warehouses: coverageByWarehouse
        });
    } catch (err) {
        console.error('Coverage Map error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch coverage map' });
    }
});

// ============================================================================
// 4. GET /api/drivers/coverage-kpis
// Summary KPIs for the Coverage Map
// ============================================================================
router.get('/coverage-kpis', async (req, res) => {
    try {
        const [warehouseRows] = await pool.promise().query('SELECT location_zone FROM Warehouses');
        const [driverRows] = await pool.promise().query('SELECT status_flag, location_zone FROM Drivers');

        const totalWarehouses = warehouseRows.length;
        const activeZones = new Set(warehouseRows.map(w => w.location_zone)).size;
        const warehouseZones = new Set(warehouseRows.map(w => w.location_zone));

        const totalDrivers = driverRows.length;
        const coveredDrivers = driverRows.filter(d => d.location_zone && warehouseZones.has(d.location_zone)).length;
        const availableDrivers = driverRows.filter(d => d.status_flag === 'Available').length;
        const busyDrivers = driverRows.filter(d => ['Busy', 'On Trip'].includes(d.status_flag)).length;
        const coverageRatio = totalWarehouses > 0 ? (coveredDrivers / totalWarehouses).toFixed(1) : '0.0';

        return res.json({
            success: true,
            kpis: {
                totalWarehouses,
                activeZones,
                totalDrivers,
                coveredDrivers,
                availableDrivers,
                busyDrivers,
                driverWarehouseRatio: `${coverageRatio} drivers / hub`,
                fleetReadiness: availableDrivers > 0 ? 'Ready for Dispatch' : 'All Drivers Busy'
            }
        });
    } catch (err) {
        console.error('Coverage KPIs error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch coverage KPIs' });
    }
});

// ============================================================================
// 5. PUT /api/drivers/:driverId/zone - Update Driver Location Zone
// ============================================================================
router.put('/:driverId/zone', async (req, res) => {
    const driverId = parseInt(req.params.driverId, 10);
    const { location_zone } = req.body;

    if (!location_zone) {
        return res.status(400).json({ error: 'Please provide location_zone.' });
    }

    try {
        const [result] = await pool.promise().query(
            'UPDATE Drivers SET location_zone = ? WHERE driver_id = ?',
            [location_zone, driverId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Driver not found.' });
        }

        const [driverRows] = await pool.promise().query(
            'SELECT d.*, w.name as warehouse_name FROM Drivers d LEFT JOIN Warehouses w ON d.location_zone = w.location_zone WHERE d.driver_id = ?',
            [driverId]
        );

        return res.json({
            success: true,
            message: `Driver #${driverId} reassigned to ${location_zone} (Warehouse: ${driverRows[0]?.warehouse_name || 'Cross-Zone'}).`,
            driver: driverRows[0]
        });
    } catch (err) {
        const driver = drivers.find(d => d.driver_id === driverId);
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });

        driver.location_zone = location_zone;
        const matchWarehouse = warehouses.find(w => w.location_zone === location_zone);

        return res.json({
            success: true,
            message: `Driver #${driverId} (${driver.full_name}) reassigned to ${location_zone} (Warehouse: ${matchWarehouse ? matchWarehouse.name : 'Cross-Zone'}).`,
            driver: {
                ...driver,
                warehouse_name: matchWarehouse ? matchWarehouse.name : 'Cross-Zone'
            }
        });
    }
});

// ============================================================================
// 6. GET /api/drivers/:driverId - Single Driver Profile & Rate Config
// ============================================================================
router.get('/:driverId', async (req, res) => {
    const driverId = parseInt(req.params.driverId, 10);
    try {
        const [rows] = await pool.promise().query(
            'SELECT driver_id, full_name, rating, per_km_bonus, base_rate, status_flag, location_zone FROM Drivers WHERE driver_id = ?',
            [driverId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Driver not found.' });
        }
        return res.json({ success: true, driver: rows[0] });
    } catch (err) {
        const driver = drivers.find(d => d.driver_id === driverId);
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });
        return res.json({ success: true, driver });
    }
});

// ============================================================================
// 7. GET /api/drivers/:driverId/trips - Completed Trips for a Driver
// ============================================================================
router.get('/:driverId/trips', async (req, res) => {
    const driverId = parseInt(req.params.driverId, 10);
    try {
        const query = `
            SELECT 
                t.trip_id,
                t.start_time,
                t.end_time,
                t.distance_miles,
                t.driver_id,
                d.full_name AS driver_name,
                d.base_rate,
                d.per_km_bonus,
                (d.base_rate + (d.per_km_bonus * t.distance_miles)) AS calculated_trip_pay
            FROM Trips t
            JOIN Drivers d ON t.driver_id = d.driver_id
            WHERE t.driver_id = ?
            ORDER BY t.start_time DESC
        `;
        const [rows] = await pool.promise().query(query, [driverId]);
        return res.json({ success: true, trips: rows });
    } catch (err) {
        const driver = drivers.find(d => d.driver_id === driverId);
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });

        const driverTrips = trips
            .filter(t => t.driver_id === driverId)
            .map(t => ({
                ...t,
                driver_name: driver.full_name,
                base_rate: driver.base_rate,
                per_km_bonus: driver.per_km_bonus,
                calculated_trip_pay: calculateTripPay(driver.base_rate, driver.per_km_bonus, t.distance_miles)
            }))
            .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

        return res.json({ success: true, trips: driverTrips });
    }
});

// ============================================================================
// 8. GET /api/drivers/:driverId/paychecks - Paychecks list for a Driver
// ============================================================================
router.get('/:driverId/paychecks', async (req, res) => {
    const driverId = parseInt(req.params.driverId, 10);
    try {
        const query = `
            SELECT 
                p.paycheck_id,
                p.week_start,
                p.week_end,
                p.total_amount,
                p.driver_id,
                d.full_name AS driver_name
            FROM Paycheck p
            JOIN Drivers d ON p.driver_id = d.driver_id
            WHERE p.driver_id = ?
            ORDER BY p.week_end DESC, p.paycheck_id DESC
        `;
        const [rows] = await pool.promise().query(query, [driverId]);
        return res.json({ success: true, paychecks: rows });
    } catch (err) {
        const driver = drivers.find(d => d.driver_id === driverId);
        const driverPaychecks = paychecks
            .filter(p => p.driver_id === driverId)
            .map(p => ({
                ...p,
                driver_name: driver ? driver.full_name : `Driver #${driverId}`
            }))
            .sort((a, b) => new Date(b.week_end) - new Date(a.week_end));

        return res.json({ success: true, paychecks: driverPaychecks });
    }
});

// ============================================================================
// 9. GET /api/drivers/:driverId/weekly-calculation
// FEATURE: Driver Earnings (Features.md - Moin's, Feature 2)
// Weekly paycheck calculation: base_rate per trip plus per_km_bonus × distance_miles,
// summed from trips into paycheck.
// ============================================================================
router.get('/:driverId/weekly-calculation', async (req, res) => {
    const driverId = parseInt(req.params.driverId, 10);
    const { week_start, week_end } = req.query;

    let start = week_start;
    let end = week_end;

    if (!start || !end) {
        const now = new Date();
        const startDay = new Date(now);
        startDay.setDate(now.getDate() - 6);
        start = startDay.toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
    }

    try {
        const [driverRows] = await pool.promise().query(
            'SELECT driver_id, full_name, rating, per_km_bonus, base_rate, status_flag, location_zone FROM Drivers WHERE driver_id = ?',
            [driverId]
        );

        if (driverRows.length === 0) {
            return res.status(404).json({ error: 'Driver not found.' });
        }
        const driver = driverRows[0];

        const query = `
            SELECT 
                t.trip_id,
                t.start_time,
                t.end_time,
                t.distance_miles,
                t.driver_id,
                (d.base_rate + (d.per_km_bonus * t.distance_miles)) AS trip_earning
            FROM Trips t
            JOIN Drivers d ON t.driver_id = d.driver_id
            WHERE t.driver_id = ?
              AND DATE(t.start_time) >= ?
              AND DATE(t.start_time) <= ?
            ORDER BY t.start_time ASC
        `;
        const [tripsList] = await pool.promise().query(query, [driverId, start, end]);

        const tripCount = tripsList.length;
        const totalDistanceMiles = tripsList.reduce((sum, t) => sum + parseFloat(t.distance_miles || 0), 0);
        const baseRate = parseFloat(driver.base_rate);
        const perKmBonus = parseFloat(driver.per_km_bonus);
        
        const baseEarningsTotal = tripCount * baseRate;
        const mileageEarningsTotal = totalDistanceMiles * perKmBonus;
        const totalWeeklyEarnings = baseEarningsTotal + mileageEarningsTotal;

        const [existingPaycheck] = await pool.promise().query(
            'SELECT paycheck_id, total_amount FROM Paycheck WHERE driver_id = ? AND week_start = ? AND week_end = ?',
            [driverId, start, end]
        );

        return res.json({
            success: true,
            calculation: {
                driver,
                week_start: start,
                week_end: end,
                trip_count: tripCount,
                total_distance_miles: parseFloat(totalDistanceMiles.toFixed(2)),
                base_rate: baseRate,
                per_km_bonus: perKmBonus,
                base_earnings_total: parseFloat(baseEarningsTotal.toFixed(2)),
                mileage_earnings_total: parseFloat(mileageEarningsTotal.toFixed(2)),
                total_weekly_earnings: parseFloat(totalWeeklyEarnings.toFixed(2)),
                trips: tripsList,
                is_already_issued: existingPaycheck.length > 0,
                existing_paycheck: existingPaycheck[0] || null
            }
        });
    } catch (err) {
        console.error('Weekly calculation fallback:', err.message);
        const driver = drivers.find(d => d.driver_id === driverId);
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });

        const tripsInRange = trips.filter(t => {
            if (t.driver_id !== driverId) return false;
            const tripDate = t.start_time.split(' ')[0];
            return tripDate >= start && tripDate <= end;
        }).map(t => ({
            ...t,
            trip_earning: calculateTripPay(driver.base_rate, driver.per_km_bonus, t.distance_miles)
        }));

        const tripCount = tripsInRange.length;
        const totalDistanceMiles = tripsInRange.reduce((sum, t) => sum + parseFloat(t.distance_miles || 0), 0);
        const baseRate = parseFloat(driver.base_rate);
        const perKmBonus = parseFloat(driver.per_km_bonus);
        
        const baseEarningsTotal = tripCount * baseRate;
        const mileageEarningsTotal = totalDistanceMiles * perKmBonus;
        const totalWeeklyEarnings = baseEarningsTotal + mileageEarningsTotal;

        const existingPaycheck = paychecks.find(
            p => p.driver_id === driverId && p.week_start === start && p.week_end === end
        );

        return res.json({
            success: true,
            calculation: {
                driver,
                week_start: start,
                week_end: end,
                trip_count: tripCount,
                total_distance_miles: parseFloat(totalDistanceMiles.toFixed(2)),
                base_rate: baseRate,
                per_km_bonus: perKmBonus,
                base_earnings_total: parseFloat(baseEarningsTotal.toFixed(2)),
                mileage_earnings_total: parseFloat(mileageEarningsTotal.toFixed(2)),
                total_weekly_earnings: parseFloat(totalWeeklyEarnings.toFixed(2)),
                trips: tripsInRange,
                is_already_issued: !!existingPaycheck,
                existing_paycheck: existingPaycheck || null
            }
        });
    }
});

// ============================================================================
// 10. POST /api/drivers/:driverId/generate-paycheck
// ============================================================================
router.post('/:driverId/generate-paycheck', async (req, res) => {
    const driverId = parseInt(req.params.driverId, 10);
    const { week_start, week_end, override_amount } = req.body;

    if (!week_start || !week_end) {
        return res.status(400).json({ error: 'Please provide week_start and week_end dates (YYYY-MM-DD).' });
    }

    try {
        const [driverRows] = await pool.promise().query(
            'SELECT driver_id, full_name, base_rate, per_km_bonus FROM Drivers WHERE driver_id = ?',
            [driverId]
        );

        if (driverRows.length === 0) {
            return res.status(404).json({ error: 'Driver not found.' });
        }
        const driver = driverRows[0];

        let finalAmount = 0;
        if (override_amount !== undefined && override_amount !== null && !isNaN(override_amount)) {
            finalAmount = parseFloat(override_amount);
        } else {
            const [tripRows] = await pool.promise().query(
                `SELECT distance_miles FROM Trips
                 WHERE driver_id = ? AND DATE(start_time) >= ? AND DATE(start_time) <= ?`,
                [driverId, week_start, week_end]
            );

            const count = tripRows.length;
            const dist = tripRows.reduce((sum, t) => sum + (parseFloat(t.distance_miles) || 0), 0);
            finalAmount = (count * parseFloat(driver.base_rate)) + (dist * parseFloat(driver.per_km_bonus));
            finalAmount = parseFloat(finalAmount.toFixed(2));
        }

        const [result] = await pool.promise().query(
            'INSERT INTO Paycheck (week_start, week_end, total_amount, driver_id) VALUES (?, ?, ?, ?)',
            [week_start, week_end, finalAmount, driverId]
        );

        return res.status(201).json({
            success: true,
            message: `Paycheck of $${finalAmount.toFixed(2)} generated and recorded for ${driver.full_name} (${week_start} to ${week_end}).`,
            paycheck: {
                paycheck_id: result.insertId,
                week_start,
                week_end,
                total_amount: finalAmount,
                driver_id: driverId,
                driver_name: driver.full_name
            }
        });
    } catch (err) {
        console.error('Paycheck Generation DB Error:', err.message);
        const driver = drivers.find(d => d.driver_id === driverId);
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });

        const tripsInRange = trips.filter(t => {
            if (t.driver_id !== driverId) return false;
            const tripDate = t.start_time.split(' ')[0];
            return tripDate >= week_start && tripDate <= week_end;
        });

        const count = tripsInRange.length;
        const dist = tripsInRange.reduce((sum, t) => sum + t.distance_miles, 0);
        let finalAmount = (count * driver.base_rate) + (dist * driver.per_km_bonus);
        finalAmount = parseFloat(finalAmount.toFixed(2));

        const newPaycheckId = paychecks.length ? Math.max(...paychecks.map(p => p.paycheck_id)) + 1 : 1;
        const newPaycheck = {
            paycheck_id: newPaycheckId,
            week_start,
            week_end,
            total_amount: finalAmount,
            driver_id: driverId,
            driver_name: driver.full_name
        };
        paychecks.push(newPaycheck);

        return res.status(201).json({
            success: true,
            message: `Paycheck of $${finalAmount.toFixed(2)} generated and recorded (Demo session) for ${driver.full_name} (${week_start} to ${week_end}).`,
            paycheck: newPaycheck
        });
    }
});

// ============================================================================
// 11. POST /api/drivers/:driverId/trips - Log completed delivery trip
// ============================================================================
router.post('/:driverId/trips', async (req, res) => {
    const driverId = parseInt(req.params.driverId, 10);
    const { start_time, end_time, distance_miles } = req.body;

    if (!start_time || !end_time || distance_miles === undefined) {
        return res.status(400).json({ error: 'Please provide start_time, end_time, and distance_miles.' });
    }

    const distance = parseFloat(distance_miles);
    if (isNaN(distance) || distance < 0) {
        return res.status(400).json({ error: 'Distance must be a valid positive number.' });
    }

    try {
        const [result] = await pool.promise().query(
            'INSERT INTO Trips (start_time, end_time, distance_miles, driver_id) VALUES (?, ?, ?, ?)',
            [start_time, end_time, distance, driverId]
        );

        const [driverRows] = await pool.promise().query('SELECT base_rate, per_km_bonus, full_name FROM Drivers WHERE driver_id = ?', [driverId]);
        const driver = driverRows[0] || { base_rate: 25.0, per_km_bonus: 0.45, full_name: `Driver #${driverId}` };
        const tripPay = calculateTripPay(driver.base_rate, driver.per_km_bonus, distance);

        return res.status(201).json({
            success: true,
            message: `Trip #${result.insertId} (${distance} miles) logged for ${driver.full_name}. Earned: $${tripPay.toFixed(2)}.`,
            trip: {
                trip_id: result.insertId,
                start_time,
                end_time,
                distance_miles: distance,
                driver_id: driverId,
                calculated_trip_pay: tripPay
            }
        });
    } catch (err) {
        console.error('Trip Logging DB Error:', err.message);
        const driver = drivers.find(d => d.driver_id === driverId);
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });

        const newTripId = trips.length ? Math.max(...trips.map(t => t.trip_id)) + 1 : 1;
        const tripPay = calculateTripPay(driver.base_rate, driver.per_km_bonus, distance);
        const newTrip = {
            trip_id: newTripId,
            start_time,
            end_time,
            distance_miles: distance,
            driver_id: driverId,
            driver_name: driver.full_name,
            calculated_trip_pay: tripPay
        };
        trips.push(newTrip);

        return res.status(201).json({
            success: true,
            message: `Trip #${newTripId} (${distance} miles) logged (Demo session) for ${driver.full_name}. Earned: $${tripPay.toFixed(2)}.`,
            trip: newTrip
        });
    }
});

module.exports = {
    router
};
