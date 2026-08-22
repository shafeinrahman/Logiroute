-- ============================================================================
-- LogiRoute Database Schema & Seed Data
-- Designed based on Logiroute SQL.pdf, Logiroute Schema.jpg & EER Diagram
-- ============================================================================

-- Create Database if not exists and switch context
CREATE DATABASE IF NOT EXISTS LogiRoute;
USE LogiRoute;

-- Disable Foreign Key checks for clean teardown
SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS Quarantined_Goods_View;
DROP TABLE IF EXISTS Warehouse_Users;
DROP TABLE IF EXISTS Notification_Queue;
DROP TABLE IF EXISTS Expired_Inventory;
DROP TABLE IF EXISTS Damaged_Inventory;
DROP TABLE IF EXISTS Defective_Inventory;
DROP TABLE IF EXISTS Warehouse_Stocks;
DROP TABLE IF EXISTS Warehouses;
DROP TABLE IF EXISTS Order_Items;
DROP TABLE IF EXISTS Items;
DROP TABLE IF EXISTS Returns;
DROP TABLE IF EXISTS Paycheck;
DROP TABLE IF EXISTS Trips;
DROP TABLE IF EXISTS Orders;
DROP TABLE IF EXISTS Drivers;
DROP TABLE IF EXISTS Customer;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. Table: Customer
-- Tracks customer account details and store credit balances for refunds
-- ============================================================================
CREATE TABLE Customer (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    address VARCHAR(255),
    store_credit_balance DECIMAL(10,2) DEFAULT 0.00
) ENGINE=InnoDB;

-- ============================================================================
-- 2. Table: Drivers
-- Stores fleet delivery drivers, performance rating, compensation rates & location zone
-- ============================================================================
CREATE TABLE Drivers (
    driver_id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(255) NOT NULL,
    rating DECIMAL(3,2) DEFAULT 5.00,
    per_km_bonus DECIMAL(10,2) DEFAULT 0.45,
    base_rate DECIMAL(10,2) DEFAULT 25.00,
    status_flag VARCHAR(50) DEFAULT 'Available',
    location_zone VARCHAR(100) DEFAULT 'North Zone'
) ENGINE=InnoDB;

-- ============================================================================
-- 3. Table: Trips
-- Logs completed driver delivery trips with mileage and timestamps
-- ============================================================================
CREATE TABLE Trips (
    trip_id INT PRIMARY KEY AUTO_INCREMENT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    distance_miles DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    driver_id INT NOT NULL,
    CONSTRAINT fk_trips_driver FOREIGN KEY (driver_id) 
        REFERENCES Drivers(driver_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 4. Table: Paycheck
-- Stores computed weekly driver earnings based on trips and mileage
-- ============================================================================
CREATE TABLE Paycheck (
    paycheck_id INT PRIMARY KEY AUTO_INCREMENT,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    driver_id INT NOT NULL,
    CONSTRAINT fk_paycheck_driver FOREIGN KEY (driver_id) 
        REFERENCES Drivers(driver_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 5. Table: Orders
-- Manages delivery orders, status progression, zip codes, and feedback
-- ============================================================================
CREATE TABLE Orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    order_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    shipping_type VARCHAR(50) NOT NULL DEFAULT 'Standard',
    zip_code VARCHAR(20) NOT NULL,
    address VARCHAR(255) NOT NULL,
    star_rating INT DEFAULT NULL,
    review_comment TEXT DEFAULT NULL,
    customer_id INT NOT NULL,
    driver_id INT DEFAULT NULL,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) 
        REFERENCES Customer(customer_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_orders_driver FOREIGN KEY (driver_id) 
        REFERENCES Drivers(driver_id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 6. Table: Returns
-- Handles customer return requests, tracking states, and refunds
-- ============================================================================
CREATE TABLE Returns (
    return_id INT PRIMARY KEY AUTO_INCREMENT,
    status VARCHAR(50) NOT NULL DEFAULT 'Return Initiated',
    refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    date_requested DATE NOT NULL,
    order_id INT NOT NULL,
    CONSTRAINT fk_returns_order FOREIGN KEY (order_id) 
        REFERENCES Orders(order_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 7. Table: Items
-- Master product catalog with SKU and safety threshold for stock alerts
-- ============================================================================
CREATE TABLE Items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    safety_threshold INT NOT NULL DEFAULT 10,
    sku VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 8. Table: Order_Items
-- Associative entity mapping items and ordered quantities to customer orders
-- ============================================================================
CREATE TABLE Order_Items (
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    PRIMARY KEY (order_id, item_id),
    CONSTRAINT fk_oi_order FOREIGN KEY (order_id) 
        REFERENCES Orders(order_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_oi_item FOREIGN KEY (item_id) 
        REFERENCES Items(item_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 9. Table: Warehouses
-- Storage facilities categorized by geographic coverage/location zone
-- ============================================================================
CREATE TABLE Warehouses (
    warehouse_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    location_zone VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 10. Table: Warehouse_Stocks
-- Composite entity tracking stock levels of items per warehouse
-- ============================================================================
CREATE TABLE Warehouse_Stocks (
    warehouse_id INT NOT NULL,
    item_id INT NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    PRIMARY KEY (warehouse_id, item_id),
    CONSTRAINT fk_ws_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES Warehouses(warehouse_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_ws_item FOREIGN KEY (item_id) 
        REFERENCES Items(item_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 11. Table: Defective_Inventory
-- Quarantined defective goods prevented from being resold
-- ============================================================================
CREATE TABLE Defective_Inventory (
    warehouse_id INT NOT NULL,
    item_id INT NOT NULL,
    quarantine_reason VARCHAR(255) NOT NULL,
    date_logged DATE NOT NULL,
    PRIMARY KEY (warehouse_id, item_id, date_logged),
    CONSTRAINT fk_defective_stock FOREIGN KEY (warehouse_id, item_id) 
        REFERENCES Warehouse_Stocks(warehouse_id, item_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 12. Table: Damaged_Inventory (Features.md Teammate 3 - Feature 3: Goods Monitoring)
-- Quarantined physically compromised goods isolated from sellable inventory
-- ============================================================================
CREATE TABLE Damaged_Inventory (
    damage_id INT PRIMARY KEY AUTO_INCREMENT,
    warehouse_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    damage_reason VARCHAR(255) NOT NULL,
    severity VARCHAR(50) DEFAULT 'Severe',
    quarantine_status VARCHAR(50) DEFAULT 'Quarantined',
    date_logged DATE NOT NULL,
    logged_by VARCHAR(100) DEFAULT 'Warehouse QA Staff',
    notes TEXT DEFAULT NULL,
    CONSTRAINT fk_damaged_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES Warehouses(warehouse_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_damaged_item FOREIGN KEY (item_id) 
        REFERENCES Items(item_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 13. Table: Expired_Inventory (Features.md Teammate 3 - Feature 3: Goods Monitoring)
-- Quarantined time-sensitive inventory past expiration threshold
-- ============================================================================
CREATE TABLE Expired_Inventory (
    expiry_id INT PRIMARY KEY AUTO_INCREMENT,
    warehouse_id INT NOT NULL,
    item_id INT NOT NULL,
    batch_lot_number VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    expiration_date DATE NOT NULL,
    quarantine_status VARCHAR(50) DEFAULT 'Quarantined',
    date_logged DATE NOT NULL,
    logged_by VARCHAR(100) DEFAULT 'Inventory Control',
    notes TEXT DEFAULT NULL,
    CONSTRAINT fk_expired_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES Warehouses(warehouse_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_expired_item FOREIGN KEY (item_id) 
        REFERENCES Items(item_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 14. View: Quarantined_Goods_View (Features.md Teammate 3 - Feature 3)
-- Unified reporting view over damaged_inventory and expired_inventory
-- ============================================================================
CREATE OR REPLACE VIEW Quarantined_Goods_View AS
SELECT 
    'Damaged' AS quarantine_type,
    d.damage_id AS record_id,
    d.warehouse_id,
    w.name AS warehouse_name,
    w.location_zone,
    d.item_id,
    i.name AS item_name,
    i.sku,
    d.quantity,
    d.damage_reason AS reason,
    d.severity AS condition_grade,
    NULL AS batch_lot_number,
    NULL AS expiration_date,
    d.quarantine_status,
    d.date_logged,
    d.logged_by,
    d.notes
FROM Damaged_Inventory d
JOIN Warehouses w ON d.warehouse_id = w.warehouse_id
JOIN Items i ON d.item_id = i.item_id
UNION ALL
SELECT 
    'Expired' AS quarantine_type,
    e.expiry_id AS record_id,
    e.warehouse_id,
    w.name AS warehouse_name,
    w.location_zone,
    e.item_id,
    i.name AS item_name,
    i.sku,
    e.quantity,
    CONCAT('Expired Batch: ', e.batch_lot_number) AS reason,
    'Expired' AS condition_grade,
    e.batch_lot_number,
    e.expiration_date,
    e.quarantine_status,
    e.date_logged,
    e.logged_by,
    e.notes
FROM Expired_Inventory e
JOIN Warehouses w ON e.warehouse_id = w.warehouse_id
JOIN Items i ON e.item_id = i.item_id;

-- ============================================================================
-- 15. Table: Notification_Queue
-- Logs outgoing customer delivery dispatch notifications, SMS & Email alerts
-- ============================================================================
CREATE TABLE Notification_Queue (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    customer_id INT DEFAULT NULL,
    channel VARCHAR(20) DEFAULT 'SMS',
    recipient VARCHAR(255) NOT NULL,
    message_payload TEXT NOT NULL,
    dispatch_status VARCHAR(50) DEFAULT 'Sent',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_order FOREIGN KEY (order_id) 
        REFERENCES Orders(order_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 16. Table: Warehouse_Users
-- Warehouse Manager & Staff Accounts using warehouse_id as credentials
-- ============================================================================
CREATE TABLE Warehouse_Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    warehouse_id INT NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'warehouse_manager',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_whuser_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES Warehouses(warehouse_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================================================
-- SEED DATA INSERTION
-- Comprehensive realistic data for testing all system modules
-- ============================================================================

-- Customers
INSERT INTO Customer (customer_id, name, phone_number, address, store_credit_balance) VALUES
(1, 'Alice Johnson', '+1-555-0101', '124 Elm Street, North Zone', 50.00),
(2, 'Bob Martinez', '+1-555-0102', '458 Pine Avenue, South Zone', 0.00),
(3, 'Charlie Davis', '+1-555-0103', '789 Oak Boulevard, East Zone', 25.50),
(4, 'Diana Prince', '+1-555-0104', '321 Maple Lane, West Zone', 10.00),
(5, 'Evan Wright', '+1-555-0105', '654 Cedar Road, Central Zone', 0.00),
(6, 'Fiona Gallagher', '+1-555-0106', '987 Birch Way, North Zone', 15.00);

-- Drivers (with location_zone mapping to Warehouses)
INSERT INTO Drivers (driver_id, full_name, rating, per_km_bonus, base_rate, status_flag, location_zone) VALUES
(1, 'David Miller', 4.85, 0.45, 25.00, 'Available', 'North Zone'),
(2, 'Sarah Jenkins', 4.90, 0.50, 28.00, 'Busy', 'South Zone'),
(3, 'Michael Scott', 3.20, 0.40, 22.00, 'Under Review', 'Central Zone'),
(4, 'Emily Watson', 4.75, 0.45, 25.00, 'Available', 'East Zone'),
(5, 'James Wilson', 4.60, 0.45, 25.00, 'Available', 'West Zone'),
(6, 'Alex Mercer', 4.95, 0.48, 26.00, 'Available', 'North Zone');

-- Warehouses
INSERT INTO Warehouses (warehouse_id, name, location_zone) VALUES
(1, 'North Central Hub', 'North Zone'),
(2, 'South River Logistics', 'South Zone'),
(3, 'East Valley Depot', 'East Zone'),
(4, 'West Coast Fulfillment', 'West Zone');

-- Items
INSERT INTO Items (item_id, name, safety_threshold, sku) VALUES
(1, 'Heavy Duty Shipping Box (L)', 50, 'BOX-HD-L-001'),
(2, 'Thermal Bubble Wrap Roll 50m', 20, 'WRAP-TH-50M'),
(3, 'Industrial Packing Tape 6pk', 30, 'TAPE-IND-6PK'),
(4, 'Standard Cardboard Box (M)', 40, 'BOX-STD-M-002'),
(5, 'Fragile Warning Sticker Roll', 15, 'LBL-FRG-1000'),
(6, 'Self-Sealing Poly Mailers 100pk', 25, 'POLY-MLR-100'),
(7, 'Stretch Wrap Film 500m', 15, 'STR-FLM-500'),
(8, 'Corrugated Cushioning Pads 50pk', 20, 'PAD-COR-50PK');

-- Warehouse Stocks (Includes normal stock and low stock below safety_threshold)
INSERT INTO Warehouse_Stocks (warehouse_id, item_id, stock_quantity) VALUES
(1, 1, 150),
(1, 2, 8),   -- Low Stock (threshold 20)
(1, 3, 75),
(1, 4, 120),
(1, 5, 5),   -- Low Stock (threshold 15)
(2, 1, 80),
(2, 2, 45),
(2, 3, 12),  -- Low Stock (threshold 30)
(2, 6, 95),
(3, 4, 30),  -- Low Stock (threshold 40)
(3, 5, 40),
(3, 7, 60),
(4, 1, 110),
(4, 7, 8),   -- Low Stock (threshold 15)
(4, 8, 55);

-- Orders
INSERT INTO Orders (order_id, order_status, shipping_type, zip_code, address, star_rating, review_comment, customer_id, driver_id) VALUES
(1, 'Delivered', 'Standard', '10001', '124 Elm Street, North Zone', 5, 'Fast and secure delivery!', 1, 1),
(2, 'Delivered', 'Express', '10002', '458 Pine Avenue, South Zone', 4, 'Driver was polite, packaging intact.', 2, 2),
(3, 'Out for Delivery', 'Express', '10001', '987 Birch Way, North Zone', NULL, NULL, 6, 2),
(4, 'Out for Delivery', 'Standard', '10001', '130 Elm Street, North Zone', NULL, NULL, 1, 2),
(5, 'Pending', 'Express', '10003', '789 Oak Boulevard, East Zone', NULL, NULL, 3, NULL),
(6, 'Pending', 'Standard', '10003', '801 Oak Boulevard, East Zone', NULL, NULL, 3, NULL),
(7, 'Pending', 'Standard', '10004', '321 Maple Lane, West Zone', NULL, NULL, 4, NULL),
(8, 'Delivered', 'Standard', '10005', '654 Cedar Road, Central Zone', 2, 'Box was damaged upon arrival.', 5, 3);

-- Order Items
INSERT INTO Order_Items (order_id, item_id, quantity) VALUES
(1, 1, 5),
(1, 3, 2),
(2, 2, 1),
(2, 6, 2),
(3, 1, 10),
(3, 5, 1),
(4, 4, 8),
(5, 7, 2),
(5, 8, 1),
(6, 3, 3),
(7, 6, 5),
(8, 2, 2);

-- Driver Trips
INSERT INTO Trips (trip_id, start_time, end_time, distance_miles, driver_id) VALUES
(1, '2026-08-10 08:30:00', '2026-08-10 11:45:00', 34.50, 1),
(2, '2026-08-11 09:00:00', '2026-08-11 12:15:00', 28.20, 1),
(3, '2026-08-12 08:00:00', '2026-08-12 11:30:00', 42.00, 2),
(4, '2026-08-13 13:00:00', '2026-08-13 16:30:00', 31.80, 2),
(5, '2026-08-14 10:00:00', '2026-08-14 14:00:00', 19.50, 3),
(6, '2026-08-15 08:15:00', '2026-08-15 11:00:00', 25.40, 4),
(7, '2026-08-15 13:30:00', '2026-08-15 17:00:00', 38.00, 5);

-- Paychecks (Weekly payroll summary)
INSERT INTO Paycheck (paycheck_id, week_start, week_end, total_amount, driver_id) VALUES
(1, '2026-08-03', '2026-08-09', 245.50, 1),
(2, '2026-08-03', '2026-08-09', 285.00, 2),
(3, '2026-08-03', '2026-08-09', 180.00, 3);

-- Returns
INSERT INTO Returns (return_id, status, refund_amount, date_requested, order_id) VALUES
(1, 'Arrived at Warehouse', 35.00, '2026-08-12', 8),
(2, 'Mailed Back', 18.50, '2026-08-14', 1);

-- Defective Inventory (Quarantined stock)
INSERT INTO Defective_Inventory (warehouse_id, item_id, quarantine_reason, date_logged) VALUES
(1, 2, 'Water damage during storage handling', '2026-08-13'),
(2, 3, 'Adhesive failure / heat exposure in transit', '2026-08-14');

-- Damaged Inventory (Features.md Teammate 3 - Feature 3: Goods Monitoring)
INSERT INTO Damaged_Inventory (damage_id, warehouse_id, item_id, quantity, damage_reason, severity, quarantine_status, date_logged, logged_by, notes) VALUES
(1, 1, 2, 4, 'Water leak in storage aisle 4B resulting in degraded bubble cells', 'Severe', 'Quarantined', '2026-08-13', 'Marcus Vance (QA Lead)', 'Locked in Bay Q1; cannot be resold.'),
(2, 2, 3, 6, 'Adhesive degradation and heat deformation during transit dock unload', 'Moderate', 'Quarantined', '2026-08-14', 'Rachel Green (Inventory Inspector)', 'Tapes lost cohesion; quarantine tag #DMG-8821.'),
(3, 4, 1, 10, 'Forklift puncture during high-bay pallet retrieval', 'Total Loss', 'Written Off', '2026-08-11', 'Kevin Chang (Floor Supervisor)', 'Crushed corner structural integrity compromised. Written off for recycling.');

-- Expired Inventory (Features.md Teammate 3 - Feature 3: Goods Monitoring)
INSERT INTO Expired_Inventory (expiry_id, warehouse_id, item_id, batch_lot_number, quantity, expiration_date, quarantine_status, date_logged, logged_by, notes) VALUES
(1, 3, 5, 'LOT-FRG-2025-08A', 15, '2026-08-01', 'Quarantined', '2026-08-10', 'Elena Rostova (Compliance QA)', 'Adhesive backing shelf-life exceeded. Barcode scanning test failed.'),
(2, 1, 7, 'LOT-STR-2025-07B', 8, '2026-07-28', 'Quarantined', '2026-08-12', 'Marcus Vance (QA Lead)', 'Tensile elasticity below ASTM packaging standard. Quarantined in shelf E-9.');

-- Notification Queue (Customer SMS & Email dispatch notifications)
INSERT INTO Notification_Queue (notification_id, order_id, customer_id, channel, recipient, message_payload, dispatch_status, created_at, sent_at) VALUES
(1, 1, 1, 'SMS', '+1-555-0101', 'LogiRoute Alert: Order #1 delivered by David Miller. Thank you for choosing LogiRoute!', 'Delivered', '2026-08-10 11:46:00', '2026-08-10 11:46:00'),
(2, 2, 2, 'SMS', '+1-555-0102', 'LogiRoute Alert: Order #2 delivered by Sarah Jenkins. Please rate your delivery experience!', 'Delivered', '2026-08-11 12:16:00', '2026-08-11 12:16:00'),
(3, 3, 6, 'SMS', '+1-555-0106', 'LogiRoute Alert: Order #3 is Out for Delivery! Assigned driver: Sarah Jenkins (South River Logistics).', 'Sent', '2026-08-15 08:30:00', '2026-08-15 08:30:00'),
(4, 4, 1, 'Email', 'alice.j@example.com', 'Your shipment for Order #4 has been dispatched with driver Sarah Jenkins and is on the way.', 'Sent', '2026-08-15 08:35:00', '2026-08-15 08:35:00');

-- Warehouse Users (Pre-seeded accounts using warehouse_id as username and password)
-- Password for all pre-seeded accounts is 'password123'
INSERT INTO Warehouse_Users (user_id, warehouse_id, username, password_hash, full_name, role) VALUES
(1, 1, '1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'North Central Hub Manager', 'warehouse_manager'),
(2, 2, '2', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'South River Logistics Manager', 'warehouse_manager'),
(3, 3, '3', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'East Valley Depot Manager', 'warehouse_manager'),
(4, 4, '4', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'West Coast Fulfillment Manager', 'warehouse_manager');

