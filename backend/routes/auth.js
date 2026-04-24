import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = req.app.locals.db;
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    const db = req.app.locals.db;
    const hashed = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (email, password, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, role',
      [email, hashed, full_name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed default admin password (called during setup)
router.post('/seed-password', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const hashed = await bcrypt.hash('admin123', 10);
    await db.query('UPDATE users SET password = $1 WHERE email = $2', [hashed, 'admin@homehealth.com']);
    const hashed2 = await bcrypt.hash('manager123', 10);
    await db.query('UPDATE users SET password = $1 WHERE email = $2', [hashed2, 'manager@homehealth.com']);
    res.json({ message: 'Passwords seeded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
