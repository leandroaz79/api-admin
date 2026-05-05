const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

// List accounts for current tenant
router.get('/', async (req, res) => {
  try {
    if (req.isMasterAdmin) {
      return res.status(403).json({ error: 'Use tenant credentials to access accounts' });
    }

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('tenant_id', req.tenant.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('List accounts error:', error);
      return res.status(500).json({ error: 'Failed to list accounts' });
    }

    res.json(data);
  } catch (err) {
    console.error('List accounts exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
