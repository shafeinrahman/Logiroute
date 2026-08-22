/**
 * LogiRoute Unified In-Memory Data Store
 * Provides consistent shared state across all route handlers in standalone/demo mode.
 * Mirrors tables and seed data from logiroute.sql.
 */

let customers = [
    { customer_id: 1, name: 'Alice Johnson', phone_number: '+1-555-0101', address: '124 Elm Street, North Zone', store_credit_balance: 50.00 },
    { customer_id: 2, name: 'Bob Martinez', phone_number: '+1-555-0102', address: '458 Pine Avenue, South Zone', store_credit_balance: 0.00 },
    { customer_id: 3, name: 'Charlie Davis', phone_number: '+1-555-0103', address: '789 Oak Boulevard, East Zone', store_credit_balance: 25.50 },
    { customer_id: 4, name: 'Diana Prince', phone_number: '+1-555-0104', address: '321 Maple Lane, West Zone', store_credit_balance: 10.00 },
    { customer_id: 5, name: 'Evan Wright', phone_number: '+1-555-0105', address: '654 Cedar Road, Central Zone', store_credit_balance: 0.00 },
    { customer_id: 6, name: 'Fiona Gallagher', phone_number: '+1-555-0106', address: '987 Birch Way, North Zone', store_credit_balance: 15.00 }
];

let warehouses = [
    { warehouse_id: 1, name: 'North Central Hub', location_zone: 'North Zone' },
    { warehouse_id: 2, name: 'South River Logistics', location_zone: 'South Zone' },
    { warehouse_id: 3, name: 'East Valley Depot', location_zone: 'East Zone' },
    { warehouse_id: 4, name: 'West Coast Fulfillment', location_zone: 'West Zone' }
];

let drivers = [
    { driver_id: 1, full_name: 'David Miller', rating: 4.85, per_km_bonus: 0.45, base_rate: 25.00, status_flag: 'Available', location_zone: 'North Zone' },
    { driver_id: 2, full_name: 'Sarah Jenkins', rating: 4.90, per_km_bonus: 0.50, base_rate: 28.00, status_flag: 'Busy', location_zone: 'South Zone' },
    { driver_id: 3, full_name: 'Michael Scott', rating: 3.20, per_km_bonus: 0.40, base_rate: 22.00, status_flag: 'Under Review', location_zone: 'Central Zone' },
    { driver_id: 4, full_name: 'Emily Watson', rating: 4.75, per_km_bonus: 0.45, base_rate: 25.00, status_flag: 'Available', location_zone: 'East Zone' },
    { driver_id: 5, full_name: 'James Wilson', rating: 4.60, per_km_bonus: 0.45, base_rate: 25.00, status_flag: 'Available', location_zone: 'West Zone' },
    { driver_id: 6, full_name: 'Alex Mercer', rating: 4.95, per_km_bonus: 0.48, base_rate: 26.00, status_flag: 'Available', location_zone: 'North Zone' }
];

let items = [
    { item_id: 1, name: 'Heavy Duty Shipping Box (L)', safety_threshold: 50, sku: 'BOX-HD-L-001', price: 12.50 },
    { item_id: 2, name: 'Thermal Bubble Wrap Roll 50m', safety_threshold: 20, sku: 'WRAP-TH-50M', price: 24.00 },
    { item_id: 3, name: 'Industrial Packing Tape 6pk', safety_threshold: 30, sku: 'TAPE-IND-6PK', price: 15.00 },
    { item_id: 4, name: 'Standard Cardboard Box (M)', safety_threshold: 40, sku: 'BOX-STD-M-002', price: 8.50 },
    { item_id: 5, name: 'Fragile Warning Sticker Roll', safety_threshold: 15, sku: 'LBL-FRG-1000', price: 6.00 },
    { item_id: 6, name: 'Self-Sealing Poly Mailers 100pk', safety_threshold: 25, sku: 'POLY-MLR-100', price: 18.00 },
    { item_id: 7, name: 'Stretch Wrap Film 500m', safety_threshold: 15, sku: 'STR-FLM-500', price: 22.00 },
    { item_id: 8, name: 'Corrugated Cushioning Pads 50pk', safety_threshold: 20, sku: 'PAD-COR-50PK', price: 14.00 }
];

let warehouseStocks = [
    { warehouse_id: 1, item_id: 1, stock_quantity: 150 },
    { warehouse_id: 1, item_id: 2, stock_quantity: 8 },
    { warehouse_id: 1, item_id: 3, stock_quantity: 75 },
    { warehouse_id: 1, item_id: 4, stock_quantity: 120 },
    { warehouse_id: 1, item_id: 5, stock_quantity: 5 },
    { warehouse_id: 2, item_id: 1, stock_quantity: 80 },
    { warehouse_id: 2, item_id: 2, stock_quantity: 45 },
    { warehouse_id: 2, item_id: 3, stock_quantity: 12 },
    { warehouse_id: 2, item_id: 6, stock_quantity: 95 },
    { warehouse_id: 3, item_id: 4, stock_quantity: 30 },
    { warehouse_id: 3, item_id: 5, stock_quantity: 40 },
    { warehouse_id: 3, item_id: 7, stock_quantity: 60 },
    { warehouse_id: 4, item_id: 1, stock_quantity: 110 },
    { warehouse_id: 4, item_id: 7, stock_quantity: 8 },
    { warehouse_id: 4, item_id: 8, stock_quantity: 55 }
];

let orders = [
    { order_id: 1, order_status: 'Delivered', shipping_type: 'Standard', zip_code: '10001', address: '124 Elm Street, North Zone', star_rating: 5, review_comment: 'Fast and secure delivery!', customer_id: 1, driver_id: 1 },
    { order_id: 2, order_status: 'Delivered', shipping_type: 'Express', zip_code: '10002', address: '458 Pine Avenue, South Zone', star_rating: 4, review_comment: 'Driver was polite, packaging intact.', customer_id: 2, driver_id: 2 },
    { order_id: 3, order_status: 'Out for Delivery', shipping_type: 'Express', zip_code: '10001', address: '987 Birch Way, North Zone', star_rating: null, review_comment: null, customer_id: 6, driver_id: 2 },
    { order_id: 4, order_status: 'Out for Delivery', shipping_type: 'Standard', zip_code: '10001', address: '130 Elm Street, North Zone', star_rating: null, review_comment: null, customer_id: 1, driver_id: 2 },
    { order_id: 5, order_status: 'Pending', shipping_type: 'Express', zip_code: '10003', address: '789 Oak Boulevard, East Zone', star_rating: null, review_comment: null, customer_id: 3, driver_id: null },
    { order_id: 6, order_status: 'Pending', shipping_type: 'Standard', zip_code: '10003', address: '801 Oak Boulevard, East Zone', star_rating: null, review_comment: null, customer_id: 3, driver_id: null },
    { order_id: 7, order_status: 'Pending', shipping_type: 'Standard', zip_code: '10004', address: '321 Maple Lane, West Zone', star_rating: null, review_comment: null, customer_id: 4, driver_id: null },
    { order_id: 8, order_status: 'Delivered', shipping_type: 'Standard', zip_code: '10005', address: '654 Cedar Road, Central Zone', star_rating: 2, review_comment: 'Box was damaged upon arrival.', customer_id: 5, driver_id: 3 }
];

let orderItems = [
    { order_id: 1, item_id: 1, quantity: 5 },
    { order_id: 1, item_id: 3, quantity: 2 },
    { order_id: 2, item_id: 2, quantity: 1 },
    { order_id: 2, item_id: 6, quantity: 2 },
    { order_id: 3, item_id: 1, quantity: 10 },
    { order_id: 3, item_id: 5, quantity: 1 },
    { order_id: 4, item_id: 4, quantity: 8 },
    { order_id: 5, item_id: 7, quantity: 2 },
    { order_id: 5, item_id: 8, quantity: 1 },
    { order_id: 6, item_id: 3, quantity: 3 },
    { order_id: 7, item_id: 6, quantity: 5 },
    { order_id: 8, item_id: 2, quantity: 2 }
];

let trips = [
    { trip_id: 1, start_time: '2026-08-10 08:30:00', end_time: '2026-08-10 11:45:00', distance_miles: 34.50, driver_id: 1 },
    { trip_id: 2, start_time: '2026-08-11 09:00:00', end_time: '2026-08-11 12:15:00', distance_miles: 28.20, driver_id: 1 },
    { trip_id: 3, start_time: '2026-08-12 08:00:00', end_time: '2026-08-12 11:30:00', distance_miles: 42.00, driver_id: 2 },
    { trip_id: 4, start_time: '2026-08-13 13:00:00', end_time: '2026-08-13 16:30:00', distance_miles: 31.80, driver_id: 2 },
    { trip_id: 5, start_time: '2026-08-14 10:00:00', end_time: '2026-08-14 14:00:00', distance_miles: 19.50, driver_id: 3 },
    { trip_id: 6, start_time: '2026-08-15 08:15:00', end_time: '2026-08-15 11:00:00', distance_miles: 25.40, driver_id: 4 },
    { trip_id: 7, start_time: '2026-08-15 13:30:00', end_time: '2026-08-15 17:00:00', distance_miles: 38.00, driver_id: 5 }
];

let paychecks = [
    { paycheck_id: 1, week_start: '2026-08-03', week_end: '2026-08-09', total_amount: 245.50, driver_id: 1 },
    { paycheck_id: 2, week_start: '2026-08-03', week_end: '2026-08-09', total_amount: 285.00, driver_id: 2 },
    { paycheck_id: 3, week_start: '2026-08-03', week_end: '2026-08-09', total_amount: 180.00, driver_id: 3 }
];

let returns = [
    { return_id: 1, status: 'Arrived at Warehouse', refund_amount: 35.00, date_requested: '2026-08-12', order_id: 8, reason: 'Box was damaged upon arrival and product defective' },
    { return_id: 2, status: 'Mailed Back', refund_amount: 18.50, date_requested: '2026-08-14', order_id: 1, reason: 'Incorrect item specifications received' },
    { return_id: 3, status: 'Return Initiated', refund_amount: 24.00, date_requested: '2026-08-15', order_id: 2, reason: 'Package tape seal broken during transit' }
];

let notifications = [
    {
        notification_id: 1,
        order_id: 1,
        customer_id: 1,
        channel: 'SMS',
        recipient: '+1-555-0101',
        message_payload: 'LogiRoute Alert: Order #1 delivered by David Miller. Thank you for choosing LogiRoute!',
        dispatch_status: 'Delivered',
        created_at: '2026-08-10 11:46:00',
        sent_at: '2026-08-10 11:46:00'
    },
    {
        notification_id: 2,
        order_id: 2,
        customer_id: 2,
        channel: 'SMS',
        recipient: '+1-555-0102',
        message_payload: 'LogiRoute Alert: Order #2 delivered by Sarah Jenkins. Please rate your delivery experience!',
        dispatch_status: 'Delivered',
        created_at: '2026-08-11 12:16:00',
        sent_at: '2026-08-11 12:16:00'
    },
    {
        notification_id: 3,
        order_id: 3,
        customer_id: 6,
        channel: 'SMS',
        recipient: '+1-555-0106',
        message_payload: 'LogiRoute Alert: Order #3 is Out for Delivery! Assigned driver: Sarah Jenkins (South River Logistics).',
        dispatch_status: 'Sent',
        created_at: '2026-08-15 08:30:00',
        sent_at: '2026-08-15 08:30:00'
    },
    {
        notification_id: 4,
        order_id: 4,
        customer_id: 1,
        channel: 'Email',
        recipient: 'alice.j@example.com',
        message_payload: 'Your shipment for Order #4 has been dispatched with driver Sarah Jenkins and is on the way.',
        dispatch_status: 'Sent',
        created_at: '2026-08-15 08:35:00',
        sent_at: '2026-08-15 08:35:00'
    }
];

let damagedInventory = [
    {
        damage_id: 1,
        warehouse_id: 1,
        item_id: 2,
        quantity: 4,
        damage_reason: 'Water leak in storage aisle 4B resulting in degraded bubble cells',
        severity: 'Severe',
        quarantine_status: 'Quarantined',
        date_logged: '2026-08-13',
        logged_by: 'Marcus Vance (QA Lead)',
        notes: 'Locked in Bay Q1; cannot be resold.'
    },
    {
        damage_id: 2,
        warehouse_id: 2,
        item_id: 3,
        quantity: 6,
        damage_reason: 'Adhesive degradation and heat deformation during transit dock unload',
        severity: 'Moderate',
        quarantine_status: 'Quarantined',
        date_logged: '2026-08-14',
        logged_by: 'Rachel Green (Inventory Inspector)',
        notes: 'Tapes lost cohesion; quarantine tag #DMG-8821.'
    },
    {
        damage_id: 3,
        warehouse_id: 4,
        item_id: 1,
        quantity: 10,
        damage_reason: 'Forklift puncture during high-bay pallet retrieval',
        severity: 'Total Loss',
        quarantine_status: 'Written Off',
        date_logged: '2026-08-11',
        logged_by: 'Kevin Chang (Floor Supervisor)',
        notes: 'Crushed corner structural integrity compromised. Written off for recycling.'
    }
];

let expiredInventory = [
    {
        expiry_id: 1,
        warehouse_id: 3,
        item_id: 5,
        batch_lot_number: 'LOT-FRG-2025-08A',
        quantity: 15,
        expiration_date: '2026-08-01',
        quarantine_status: 'Quarantined',
        date_logged: '2026-08-10',
        logged_by: 'Elena Rostova (Compliance QA)',
        notes: 'Adhesive backing shelf-life exceeded. Barcode scanning test failed.'
    },
    {
        expiry_id: 2,
        warehouse_id: 1,
        item_id: 7,
        batch_lot_number: 'LOT-STR-2025-07B',
        quantity: 8,
        expiration_date: '2026-07-28',
        quarantine_status: 'Quarantined',
        date_logged: '2026-08-12',
        logged_by: 'Marcus Vance (QA Lead)',
        notes: 'Tensile elasticity below ASTM packaging standard. Quarantined in shelf E-9.'
    }
];

const warehouseUsers = [
    {
        user_id: 1,
        warehouse_id: 1,
        username: '1',
        password_hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        password_plain: 'password123',
        full_name: 'North Central Hub Manager',
        role: 'warehouse_manager'
    },
    {
        user_id: 2,
        warehouse_id: 2,
        username: '2',
        password_hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        password_plain: 'password123',
        full_name: 'South River Logistics Manager',
        role: 'warehouse_manager'
    },
    {
        user_id: 3,
        warehouse_id: 3,
        username: '3',
        password_hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        password_plain: 'password123',
        full_name: 'East Valley Depot Manager',
        role: 'warehouse_manager'
    },
    {
        user_id: 4,
        warehouse_id: 4,
        username: '4',
        password_hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        password_plain: 'password123',
        full_name: 'West Coast Fulfillment Manager',
        role: 'warehouse_manager'
    }
];

module.exports = {
    customers,
    warehouses,
    drivers,
    items,
    warehouseStocks,
    orders,
    orderItems,
    trips,
    paychecks,
    returns,
    notifications,
    damagedInventory,
    expiredInventory,
    warehouseUsers
};
