import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    summary: { caregivers: 58, expiring_soon: 7, route_conflicts: 4, blocked_visits: 2 },
    credentials: [
      { caregiver: 'Leah Grant', credential: 'RN license', expires_in_days: 9, affected_visits: 5, action: 'renew before weekend route' },
      { caregiver: 'Samir Patel', credential: 'Wound care cert', expires_in_days: 18, affected_visits: 3, action: 'assign backup clinician' },
      { caregiver: 'Iris Wong', credential: 'CPR', expires_in_days: 29, affected_visits: 1, action: 'schedule renewal' },
    ],
  });
});

router.post('/route-check', (req, res) => {
  const { caregiver = 'caregiver', expiresInDays = 30 } = req.body || {};
  res.json({ caregiver, route_allowed: expiresInDays > 14, recommendation: expiresInDays <= 14 ? 'remove from long-range schedule until renewed' : 'eligible for assignment' });
});

export default router;
