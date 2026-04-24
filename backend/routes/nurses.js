import { Router } from 'express';
const router = Router();

// Get all nurses
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('SELECT * FROM nurses ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single nurse
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('SELECT * FROM nurses WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Nurse not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create nurse
router.post('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { first_name, last_name, email, phone, license_number, specialization, status, hire_date, address, city, state, zip } = req.body;
    const result = await db.query(
      `INSERT INTO nurses (first_name, last_name, email, phone, license_number, specialization, status, hire_date, address, city, state, zip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [first_name, last_name, email, phone, license_number, specialization, status || 'active', hire_date, address, city, state, zip]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update nurse
router.put('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { first_name, last_name, email, phone, license_number, specialization, status, hire_date, address, city, state, zip } = req.body;
    const result = await db.query(
      `UPDATE nurses SET first_name=$1, last_name=$2, email=$3, phone=$4, license_number=$5, specialization=$6, status=$7, hire_date=$8, address=$9, city=$10, state=$11, zip=$12
       WHERE id=$13 RETURNING *`,
      [first_name, last_name, email, phone, license_number, specialization, status, hire_date, address, city, state, zip, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Nurse not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete nurse
router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('DELETE FROM nurses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Nurse not found' });
    res.json({ message: 'Nurse deleted', nurse: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
