const express = require('express');
const supabase = require('../config/supabase');
const { generateAdminKeyWithHash } = require('../services/keyGenerator');
const licenseCache = require('../utils/cache');

const router = express.Router();

// Create tenant (master admin only)
router.post('/', async (req, res) => {
  try {
    if (!req.isMasterAdmin) {
      return res.status(403).json({ error: 'Master admin access required' });
    }

    const { name, email, status = 'active' } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const { key: apiAdminKey, hash: apiAdminKeyHash } = generateAdminKeyWithHash();

    const { data, error } = await supabase
      .from('tenants')
      .insert({
        name,
        email,
        api_admin_key_hash: apiAdminKeyHash,
        status
      })
      .select('id, name, email, status, created_at, updated_at')
      .single();

    if (error) {
      console.error('Create tenant error:', error);
      return res.status(500).json({ error: 'Failed to create tenant' });
    }

    // Return plain key only once
    res.status(201).json({
      ...data,
      api_admin_key: apiAdminKey
    });
  } catch (err) {
    console.error('Create tenant exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List tenants (master admin only)
router.get('/', async (req, res) => {
  try {
    if (!req.isMasterAdmin) {
      return res.status(403).json({ error: 'Master admin access required' });
    }

    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, email, status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('List tenants error:', error);
      return res.status(500).json({ error: 'Failed to list tenants' });
    }

    // Never return api_admin_key or api_admin_key_hash
    res.json(data);
  } catch (err) {
    console.error('List tenants exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update tenant status
router.patch('/:id/status', async (req, res) => {
  try {
    if (!req.isMasterAdmin) {
      return res.status(403).json({ error: 'Master admin access required' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required (active/inactive)' });
    }

    const { data, error } = await supabase
      .from('tenants')
      .update({ status })
      .eq('id', id)
      .select('id, name, email, status, created_at, updated_at')
      .single();

    if (error) {
      console.error('Update tenant status error:', error);
      return res.status(500).json({ error: 'Failed to update tenant status' });
    }

    // Clear cache when tenant status changes
    licenseCache.clear();

    res.json(data);
  } catch (err) {
    console.error('Update tenant status exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
