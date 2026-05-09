require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// اتصال قاعدة البيانات
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'clan_platform',
    password: process.env.DB_PASSWORD,
    port: 5432,
});

// ---------- API Routes ----------

// جلب جميع الأشخاص
app.get('/api/persons', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM persons ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// إضافة شخص جديد
app.post('/api/register', async (req, res) => {
    try {
        const { full_name, national_id, father_id, mother_id, birth_date, birth_place, city, wallet_balance } = req.body;
        const result = await pool.query(
            `INSERT INTO persons (full_name, national_id, father_id, mother_id, birth_date, birth_place, city, wallet_balance)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [full_name, national_id, father_id || null, mother_id || null, birth_date || null, birth_place || null, city || null, wallet_balance || 0]
        );
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// حذف شخص (مع تحديث العلاقات)
app.delete('/api/persons/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        await pool.query('UPDATE persons SET father_id = NULL WHERE father_id = $1', [id]);
        await pool.query('UPDATE persons SET mother_id = NULL WHERE mother_id = $1', [id]);
        await pool.query('DELETE FROM persons WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// شجرة العائلة (حتى 5 أجيال)
app.get('/api/family-tree/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query(`
            WITH RECURSIVE tree AS (
                SELECT id, full_name, father_id, 0 as gen FROM persons WHERE id = $1
                UNION ALL
                SELECT p.id, p.full_name, p.father_id, t.gen + 1
                FROM persons p JOIN tree t ON p.id = t.father_id
                WHERE t.gen < 5
            ) SELECT id, full_name, gen FROM tree ORDER BY gen
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// تقديم الملفات الثابتة والواجهة الرئيسية
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});