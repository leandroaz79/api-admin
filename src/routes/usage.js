const express = require('express');
const { getUsageStats } = require('../services/usage');

const router = express.Router();

// Get usage stats for tenant
router.get('/', async (req, res) => {
  try {
    if (req.isMasterAdmin) {
      return res.status(403).json({ error: 'Use tenant credentials to view usage' });
    }

    const { start_date, end_date, license_id } = req.query;

    const stats = await getUsageStats(req.tenant.id, {
      start_date,
      end_date,
      license_id
    });

    if (!stats) {
      return res.status(500).json({ error: 'Failed to get usage stats' });
    }

    res.json(stats);
  } catch (err) {
    console.error('Get usage stats exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
