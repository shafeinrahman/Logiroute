const express = require('express');
const router = express.Router();
const pool = require('../db');
const { inMemoryItems } = require('./customer');

// GET /api/items - Catalog items list
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.promise().query(
            'SELECT item_id, name, safety_threshold, sku FROM Items ORDER BY item_id ASC'
        );
        return res.json({ success: true, items: rows });
    } catch (err) {
        return res.json({ success: true, items: inMemoryItems });
    }
});

module.exports = router;
