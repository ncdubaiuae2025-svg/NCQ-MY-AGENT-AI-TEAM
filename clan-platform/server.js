require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'clan_platform',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// ------------------- إنشاء الجداول (للتأكد من وجودها) -------------------
async function initDB() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS persons (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(200) NOT NULL,
                national_id VARCHAR(20) UNIQUE,
                father_id INT REFERENCES persons(id),
                mother_id INT REFERENCES persons(id),
                birth_date DATE,
                birth_place VARCHAR(200),
                city VARCHAR(100),
                wallet_balance DECIMAL(15,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ Database ready');
    } catch (err) {
        console.error('❌ DB init error:', err);
    } finally {
        client.release();
    }
}
initDB();

// ------------------- واجهات API -------------------

// 1. جلب جميع الأشخاص
app.get('/api/persons', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM persons ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. إضافة شخص جديد
app.post('/api/register', async (req, res) => {
    const { full_name, national_id, father_id, mother_id, birth_date, birth_place, city, wallet_balance } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO persons (full_name, national_id, father_id, mother_id, birth_date, birth_place, city, wallet_balance)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [full_name, national_id, father_id || null, mother_id || null, birth_date || null, birth_place || null, city || null, wallet_balance || 0]
        );
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. تحديث شخص
app.put('/api/persons/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { full_name, national_id, father_id, mother_id, birth_date, birth_place, city, wallet_balance } = req.body;
    try {
        await pool.query(
            `UPDATE persons SET
                full_name = COALESCE($1, full_name),
                national_id = COALESCE($2, national_id),
                father_id = COALESCE($3, father_id),
                mother_id = COALESCE($4, mother_id),
                birth_date = COALESCE($5, birth_date),
                birth_place = COALESCE($6, birth_place),
                city = COALESCE($7, city),
                wallet_balance = COALESCE($8, wallet_balance)
            WHERE id = $9`,
            [full_name, national_id, father_id, mother_id, birth_date, birth_place, city, wallet_balance, id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. حذف شخص
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

// 5. شجرة العائلة (نصية - أجداد فقط)
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

// 6. تحويل رصيد
app.post('/api/transfer', async (req, res) => {
    const { from_person_id, to_person_id, amount } = req.body;
    if (amount <= 0) return res.status(400).json({ error: 'المبلغ موجب' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const sender = await client.query('SELECT wallet_balance FROM persons WHERE id = $1 FOR UPDATE', [from_person_id]);
        if (sender.rows[0].wallet_balance < amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'رصيد غير كاف' });
        }
        await client.query('UPDATE persons SET wallet_balance = wallet_balance - $1 WHERE id = $2', [amount, from_person_id]);
        await client.query('UPDATE persons SET wallet_balance = wallet_balance + $1 WHERE id = $2', [amount, to_person_id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 7. البحث عن أشخاص (للاقتراحات)
app.get('/api/search', async (req, res) => {
    const searchTerm = req.query.q || '';
    try {
        const result = await pool.query(
            `SELECT id, full_name, national_id FROM persons WHERE full_name ILIKE $1 LIMIT 10`,
            [`%${searchTerm}%`]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. شجرة العائلة الرسومية (أجداد + إخوة بكامل الفروع)
app.get('/api/family-tree-graph/:id', async (req, res) => {
    const personId = parseInt(req.params.id);
    try {
        // بناء شجرة تحتوي على جميع الأجداد وجميع أبناء كل جد (إخوة)
        // سنقوم باستعلام متكرر لجمع جميع العقد المطلوبة
        const query = `
            WITH RECURSIVE ancestors AS (
                SELECT id, father_id, mother_id, full_name, 0 as depth
                FROM persons WHERE id = $1
                UNION ALL
                SELECT p.id, p.father_id, p.mother_id, p.full_name, a.depth + 1
                FROM persons p
                JOIN ancestors a ON p.id = a.father_id OR p.id = a.mother_id
                WHERE a.depth < 5
            ),
            all_nodes AS (
                SELECT DISTINCT id, full_name, father_id, mother_id FROM ancestors
                UNION
                -- إضافة جميع الإخوة (أبناء نفس الآباء)
                SELECT p.id, p.full_name, p.father_id, p.mother_id
                FROM persons p
                WHERE EXISTS (SELECT 1 FROM ancestors a WHERE a.id = p.father_id OR a.id = p.mother_id)
            )
            SELECT id, full_name, father_id, mother_id FROM all_nodes;
        `;
        const nodesResult = await pool.query(query, [personId]);
        const nodes = nodesResult.rows;

        // بناء بنية JSON (خريطة العقد ثم بناء الشجرة)
        const nodeMap = new Map();
        nodes.forEach(node => {
            nodeMap.set(node.id, {
                id: node.id,
                name: node.full_name,
                children: [],
                father_id: node.father_id,
                mother_id: node.mother_id
            });
        });

        // ربط الأبناء بالآباء (نضع كل عقدة كطفل لأبيه وأمه)
        nodes.forEach(node => {
            if (node.father_id && nodeMap.has(node.father_id)) {
                nodeMap.get(node.father_id).children.push(nodeMap.get(node.id));
            }
            if (node.mother_id && nodeMap.has(node.mother_id)) {
                nodeMap.get(node.mother_id).children.push(nodeMap.get(node.id));
            }
        });

        // العقد الجذرية هي التي ليس لها والد في المجموعة (أعلى الأجداد)
        const roots = [];
        nodeMap.forEach(node => {
            if ((!node.father_id || !nodeMap.has(node.father_id)) && (!node.mother_id || !nodeMap.has(node.mother_id))) {
                roots.push(node);
            }
        });

        // منع الدورات (لن تحدث هنا)
        res.json(roots);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ------------------- تقديم الواجهة الأمامية -------------------
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});