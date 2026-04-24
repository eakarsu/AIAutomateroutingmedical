import { Router } from 'express';
const router = Router();

router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT p.*, n.first_name as nurse_first_name, n.last_name as nurse_last_name
      FROM patients p LEFT JOIN nurses n ON p.assigned_nurse_id = n.id ORDER BY p.id
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT p.*, n.first_name as nurse_first_name, n.last_name as nurse_last_name
      FROM patients p LEFT JOIN nurses n ON p.assigned_nurse_id = n.id WHERE p.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { first_name, last_name, date_of_birth, gender, phone, email, address, city, state, zip, insurance_provider, insurance_id, primary_diagnosis, status, assigned_nurse_id } = req.body;
    const result = await db.query(
      `INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, email, address, city, state, zip, insurance_provider, insurance_id, primary_diagnosis, status, assigned_nurse_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [first_name, last_name, date_of_birth, gender, phone, email, address, city, state, zip, insurance_provider, insurance_id, primary_diagnosis, status || 'active', assigned_nurse_id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { first_name, last_name, date_of_birth, gender, phone, email, address, city, state, zip, insurance_provider, insurance_id, primary_diagnosis, status, assigned_nurse_id } = req.body;
    const result = await db.query(
      `UPDATE patients SET first_name=$1, last_name=$2, date_of_birth=$3, gender=$4, phone=$5, email=$6, address=$7, city=$8, state=$9, zip=$10, insurance_provider=$11, insurance_id=$12, primary_diagnosis=$13, status=$14, assigned_nurse_id=$15
       WHERE id=$16 RETURNING *`,
      [first_name, last_name, date_of_birth, gender, phone, email, address, city, state, zip, insurance_provider, insurance_id, primary_diagnosis, status, assigned_nurse_id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('DELETE FROM patients WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json({ message: 'Patient deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
