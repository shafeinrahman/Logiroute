const express = require('express');
const router = express.Router();
const pool = require('../db');

// In-memory fallback datasets for resilient testing/offline demonstration
let inMemoryDrivers = [
    { driver_id: 1, full_name: 'David Miller', rating: 4.85, per_km_bonus: 0.45, base_rate: 25.00, status_flag: 'Available' },
    { driver_id: 2, full_name: 'Sarah Jenkins', rating: 4.90, per_km_bonus: 0.50, base_rate: 28.00, status_flag: 'On Trip' },
    { driver_id: 3, full_name: 'Michael Scott', rating: 3.20, per_km_bonus: 0.40, base_rate: 22.00, status_flag: 'Under Review' },
    { driver_id: 4, full_name: 'Emily Watson', rating: 4.75, per_km_bonus: 0.45, base_rate: 25.00, status_flag: 'Available' },
    { driver_id: 5, full_name: 'James Wilson', rating: 4.60, per_km_bonus: 0.45, base_rate: 25.00, status_flag: 'Available' }
];

let inMemoryTrips = [
    { trip_id: 1, start_time: '2026-08-10 08:30:00', end_time: '2026-08-10 11:45:00', distance_miles: 34.50, driver_id: 1 },
    { trip_id: 2, start_time: '2026-08-11 09:00:00', end_time: '2026-08-11 12:15:00', distance_miles: 28.20, driver_id: 1 },
    { trip_id: 3, start_time: '2026-08-12 08:00:00', end_time: '2026-08-12 11:30:00', distance_miles: 42.00, driver_id: 2 },
    { trip_id: 4, start_time: '2026-08-13 13:00:00', end_time: '2026-08-13 16:30:00', distance_miles: 31.80, driver_id: 2 },
    { trip_id: 5, start_time: '2026-08-14 10:00:00', end_time: '2026-08-14 14:00:00', distance_miles: 19.50, driver_id: 3 },
    { trip_id: 6, start_time: '2026-08-15 08:15:00', end_time: '2026-08-15 11:00:00', distance_miles: 25.40, driver_id: 4 },
    { trip_id: 7, start_time: '2026-08-15 13:30:00', end_time: '2026-08-15 17:00:00', distance_miles: 38.00, driver_id: 5 }
];

let inMemoryPaychecks = [
    { paycheck_id: 1, week_start: '2026-08-03', week_end: '2026-08-09', total_amount: 245.50, driver_id: 1 },
    { paycheck_id: 2, week_start: '2026-08-03', week_end: '2026-08-09', total_amount: 285.00, driver_id: 2 },
    { paycheck_id: 3, week_start: '2026-08-03', week_end: '2026-08-09', total_amount: 180.00, driver_id: 3 }
];

// Helper: Calculate trip earning
function calculateTripPay(baseRate, perKmBonus, distanceMiles) {
    const base = parseFloat(baseRate) || 0;
    const bonus = parseFloat(perKmBonus) || 0;
    const dist = parseFloat(distanceMiles) || 0;
    return parseFloat((base + (bonus * dist)).toFixed(2));
}

// ============================================================================
// 1. GET /api/drivers - List all drivers with calculated stats
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                d.driver_id, 
                d.full_name, 
                d.rating, 
                d.per_km_bonus, 
                d.base_rate, 
                d.status_flag,
                COUNT(t.trip_id) AS total_trips,
                COALESCE(SUM(t.distance_miles), 0) AS total_distance_miles,
                COALESCE(SUM(d.base_rate + (d.per_km_bonus * t.distance_miles)), 0) AS calculated_lifetime_earnings,
                (SELECT COUNT(*) FROM Paycheck p WHERE p.driver_id = d.driver_id) AS paychecks_issued_count,
                (SELECT COALESCE(SUM(p.total_amount), 0) FROM Paycheck p WHERE p.driver_id = d.driver_id) AS total_paid_amount
            FROM Drivers d
            LEFT JOIN Trips t ON d.driver_id = t.driver_id
            GROUP BY d.driver_id, d.full_name, d.rating, d.per_km_bonus, d.base_rate, d.status_flag
            ORDER BY d.driver_id ASC
        `;
        const [rows] = await pool.promise().query(query);
        return res.json({ success: true, drivers: rows });
    } catch (err) {
        console.error('Drivers query fallback:', err.message);
        // In-memory fallback calculation
        const driversWithStats = inMemoryDrivers.map(d => {
            const driverTrips = inMemoryTrips.filter(t => t.driver_id === d.driver_id);
            const totalTrips = driverTrips.length;
            const totalDistance = driverTrips.reduce((sum, t) => sum + (parseFloat(t.distance_miles) || 0), 0);
            const lifetimeEarnings = driverTrips.reduce((sum, t) => sum + calculateTripPay(d.base_rate, d.per_km_bonus, t.distance_miles), 0);
            
            const driverPaychecks = inMemoryPaychecks.filter(p => p.driver_id === d.driver_id);
            const paychecksCount = driverPaychecks.length;
            const totalPaid = driverPaychecks.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);

            return {
                ...d,
                total_trips: totalTrips,
                total_distance_miles: totalDistance.toFixed(2),
                calculated_lifetime_earnings: lifetimeEarnings.toFixed(2),
                paychecks_issued_count: paychecksCount,
                total_paid_amount: totalPaid.toFixed(2)
            };
        });

        return res.json({ success: true, drivers: driversWithStats });
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

        // Sum lifetime calculated earnings from trips + rates
        const [calcRows] = await pool.promise().query(`
            SELECT COALESCE(SUM(d.base_rate + (d.per_km_bonus * t.distance_miles)), 0) as total_earnings_generated
            FROM Trips t
            JOIN Drivers d ON t.driver_id = d.driver_id
        `);

        return res.json({
            success: true,
            kpis: {
                totalDrivers: driverRows[0].count || 0,
                avgRating: driverRows[0].avg_rating ? parseFloat(driverRows[0].avg_rating).toFixed(2) : '5.00',
                totalTrips: tripRows[0].total_trips || 0,
                totalDistanceMiles: parseFloat(tripRows[0].total_distance || 0).toFixed(1),
                totalPaychecksIssued: payRows[0].paychecks_count || 0,
                totalPayoutRecorded: parseFloat(payRows[0].total_payout || 0).toFixed(2),
                totalEarningsGenerated: parseFloat(calcRows[0].total_earnings_generated || 0).toFixed(2)
            }
        });
    } catch (err) {
        console.error('Driver KPIs fallback:', err.message);
        const totalDrivers = inMemoryDrivers.length;
        const avgRating = (inMemoryDrivers.reduce((sum, d) => sum + d.rating, 0) / (totalDrivers || 1)).toFixed(2);
        const totalTrips = inMemoryTrips.length;
        const totalDistanceMiles = inMemoryTrips.reduce((sum, t) => sum + t.distance_miles, 0).toFixed(1);
        const totalPaychecksIssued = inMemoryPaychecks.length;
        const totalPayoutRecorded = inMemoryPaychecks.reduce((sum, p) => sum + p.total_amount, 0).toFixed(2);
        
        const totalEarningsGenerated = inMemoryTrips.reduce((sum, t) => {
            const driver = inMemoryDrivers.find(d => d.driver_id === t.driver_id);
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
// 3. GET /api/drivers/:driverId - Single Driver Profile & Rate Config
// ============================================================================
router.get('/:driverId', async (req, res) => {
    const driverId = parseInt(req.params.driverId, 10);
    try {
        const [rows] = await pool.promise().query(
            'SELECT driver_id, full_name, rating, per_km_bonus, base_rate, status_flag FROM Drivers WHERE driver_id = ?',
            [driverId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Driver not found.' });
        }
        return res.json({ success: true, driver: rows[0] });
    } catch (err) {
        const driver = inMemoryDrivers.find(d => d.driver_id === driverId);
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });
        return res.json({ success: true, driver });
    }
});

// ============================================================================
// 4. GET /api/drivers/:driverId/trips - Completed Trips for a Driver
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
        const driver = inMemoryDrivers.find(d => d.driver_id === driverId);
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });

        const trips = inMemoryTrips
            .filter(t => t.driver_id === driverId)
            .map(t => ({
                ...t,
                driver_name: driver.full_name,
                base_rate: driver.base_rate,
                per_km_bonus: driver.per_km_bonus,
                calculated_trip_pay: calculateTripPay(driver.base_rate, driver.per_km_bonus, t.distance_miles)
            }))
            .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

        return res.json({ success: true, trips });
    }
});

// ============================================================================
// 5. GET /api/drivers/:driverId/paychecks - Paychecks list for a Driver
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
        const driver = inMemoryDrivers.find(d => d.driver_id === driverId);
        const paychecks = inMemoryPaychecks
            .filter(p => p.driver_id === driverId)
            .map(p => ({
                ...p,
                driver_name: driver ? driver.full_name : `Driver #${driverId}`
            }))
            .sort((a, b) => new Date(b.week_end) - new Date(a.week_end));

        return res.json({ success: true, paychecks });
    }
});

// ============================================================================
// 6. GET /api/drivers/:driverId/weekly-calculation
// FEATURE: Driver Earnings (Features.md - Teammate 2, Feature 2)
// Weekly paycheck calculation: base_rate per trip plus per_km_bonus × distance_miles,
// summed from trips into paycheck.
// ============================================================================
router.get('/:driverId/weekly-calculation', async (req, res) => {
    const driverId = parseInt(req.params.driverId, 10);
    const { week_start, week_end } = req.query;

    // Default dates to current week or last 7 days if not provided
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
        // Fetch Driver compensation rates
        const [driverRows] = await pool.promise().query(
            'SELECT driver_id, full_name, rating, per_km_bonus, base_rate, status_flag FROM Drivers WHERE driver_id = ?',
            [driverId]
        );

        if (driverRows.length === 0) {
            return res.status(404).json({ error: 'Driver not found.' });
        }
        const driver = driverRows[0];

        // Fetch Trips in the given date range
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
        const [trips] = await pool.promise().query(query, [driverId, start, end]);

        // Weekly Paycheck Calculation Formula
        const tripCount = trips.length;
        const totalDistanceMiles = trips.reduce((sum, t) => sum + parseFloat(t.distance_miles || 0), 0);
        const baseRate = parseFloat(driver.base_rate);
        const perKmBonus = parseFloat(driver.per_km_bonus);
        
        const baseEarningsTotal = tripCount * baseRate;
        const mileageEarningsTotal = totalDistanceMiles * perKmBonus;
        const totalWeeklyEarnings = baseEarningsTotal + mileageEarningsTotal;

        // Check if paycheck is already recorded for this range
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
                trips,
                is_already_issued: existingPaycheck.length > 0,
                existing_paycheck: existingPaycheck[0] || null
            }
        });
    } catch (err) {
        console.error('Weekly calculation fallback:', err.message);
        const driver = inMemoryDrivers.find(d => d.driver_id === driverId);
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });

        const tripsInRange = inMemoryTrips.filter(t => {
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

        const existingPaycheck = inMemoryPaychecks.find(
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
// 7. POST /api/drivers/:driverId/generate-paycheck
// Generates and inserts calculated weekly paycheck into the Paycheck table
// ============================================================================
router.post('/:driverId/generate-paycheck', async (req, res) => {
    const driverId = parseInt(req.params.driverId, 10);
    const { week_start, week_end, override_amount } = req.body;

    if (!week_start || !week_end) {
        return res.status(400).json({ error: 'Please provide week_start and week_end dates (YYYY-MM-DD).' });
    }

    try {
        // Fetch Driver rates
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
            // Compute sum from trips in this week range: SUM(base_rate + per_km_bonus * distance_miles)
            const [tripRows] = await pool.promise().query(
                `SELECT COUNT(*) as trip_count, COALESCE(SUM(distance_miles), 0) as total_distance
                 FROM Trips 
                 WHERE driver_id = ? AND DATE(start_time) >= ? AND DATE(start_time) <= ?`,
                [driverId, week_start, week_end]
            );

            const count = tripRows[0].trip_count || 0;
            const dist = parseFloat(tripRows[0].total_distance || 0);
            finalAmount = (count * parseFloat(driver.base_rate)) + (dist * parseFloat(driver.per_km_bonus));
            finalAmount = parseFloat(finalAmount.toFixed(2));
        }

        // Insert into Paycheck table
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
        const driver = inMemoryDrivers.find(d => d.driver_id === driverId);
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });

        const tripsInRange = inMemoryTrips.filter(t => {
            if (t.driver_id !== driverId) return false;
            const tripDate = t.start_time.split(' ')[0];
            return tripDate >= week_start && tripDate <= week_end;
        });

        const count = tripsInRange.length;
        const dist = tripsInRange.reduce((sum, t) => sum + t.distance_miles, 0);
        let finalAmount = (count * driver.base_rate) + (dist * driver.per_km_bonus);
        finalAmount = parseFloat(finalAmount.toFixed(2));

        const newPaycheckId = inMemoryPaychecks.length ? Math.max(...inMemoryPaychecks.map(p => p.paycheck_id)) + 1 : 1;
        const newPaycheck = {
            paycheck_id: newPaycheckId,
            week_start,
            week_end,
            total_amount: finalAmount,
            driver_id: driverId,
            driver_name: driver.full_name
        };
        inMemoryPaychecks.push(newPaycheck);

        return res.status(201).json({
            success: true,
            message: `Paycheck of $${finalAmount.toFixed(2)} generated and recorded (Demo session) for ${driver.full_name} (${week_start} to ${week_end}).`,
            paycheck: newPaycheck
        });
    }
});

// ============================================================================
// 8. POST /api/drivers/:driverId/trips
// Log a new completed delivery trip for a driver
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

        // Fetch driver info for calculating earning
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
        const driver = inMemoryDrivers.find(d => d.driver_id === driverId);
        if (!driver) return res.status(404).json({ error: 'Driver not found.' });

        const newTripId = inMemoryTrips.length ? Math.max(...inMemoryTrips.map(t => t.trip_id)) + 1 : 1;
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
        inMemoryTrips.push(newTrip);

        return res.status(201).json({
            success: true,
            message: `Trip #${newTripId} (${distance} miles) logged (Demo session) for ${driver.full_name}. Earned: $${tripPay.toFixed(2)}.`,
            trip: newTrip
        });
    }
});

module.exports = {
    router,
    inMemoryDrivers,
    inMemoryTrips,
    inMemoryPaychecks
};
