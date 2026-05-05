const express = require('express');
const supabase = require('../config/supabase');
const { generateApiKeyWithHash } = require('../services/keyGenerator');
const licenseCache = require('../utils/cache');

const router = express.Router();

// Create license
router.post('/', async (req, res) => {
  try {
    if (req.isMasterAdmin) {
      return res.status(403).json({ error: 'Use tenant credentials to create licenses' });
    }

    const { name, email, whatsapp, expires_at } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!expires_at) {
      return res.status(400).json({ error: 'expires_at is required' });
    }

    const expiresDate = new Date(expires_at);
    if (isNaN(expiresDate.getTime())) {
      return res.status(400).json({ error: 'Invalid expires_at date' });
    }

    // Find or create account
    let { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('email', email)
      .eq('tenant_id', req.tenant.id)
      .single();

    if (accountError && accountError.code !== 'PGRST116') {
      console.error('Account lookup error:', accountError);
      return res.status(500).json({ error: 'Failed to lookup account' });
    }

    if (!account) {
      const { data: newAccount, error: createError } = await supabase
        .from('accounts')
        .insert({
          tenant_id: req.tenant.id,
          name: name || email,
          email,
          whatsapp
        })
        .select()
        .single();

      if (createError) {
        console.error('Create account error:', createError);
        return res.status(500).json({ error: 'Failed to create account' });
      }

      account = newAccount;
    }

    // Generate API key with hash
    const { key: apiKey, hash: apiKeyHash } = generateApiKeyWithHash();

    // Create license
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .insert({
        tenant_id: req.tenant.id,
        account_id: account.id,
        api_key_hash: apiKeyHash,
        expires_at: expiresDate.toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (licenseError) {
      console.error('Create license error:', licenseError);
      return res.status(500).json({ error: 'Failed to create license' });
    }

    // Return response with plain key (only time it's visible)
    res.status(201).json({
      license: {
        id: license.id,
        tenant_id: license.tenant_id,
        account_id: license.account_id,
        status: license.status,
        expires_at: license.expires_at,
        created_at: license.created_at
      },
      config: {
        ANTHROPIC_BASE_URL: 'https://api-gw.techsysbr.space/v1',
        ANTHROPIC_AUTH_TOKEN: apiKey
      }
    });
  } catch (err) {
    console.error('Create license exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List licenses
router.get('/', async (req, res) => {
  try {
    if (req.isMasterAdmin) {
      return res.status(403).json({ error: 'Use tenant credentials to list licenses' });
    }

    const { data, error } = await supabase
      .from('licenses')
      .select(`
        id,
        tenant_id,
        account_id,
        status,
        expires_at,
        created_at,
        account:accounts(id, name, email, whatsapp)
      `)
      .eq('tenant_id', req.tenant.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('List licenses error:', error);
      return res.status(500).json({ error: 'Failed to list licenses' });
    }

    // Never return api_key or api_key_hash
    res.json(data);
  } catch (err) {
    console.error('List licenses exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke license
router.patch('/:id/revoke', async (req, res) => {
  try {
    if (req.isMasterAdmin) {
      return res.status(403).json({ error: 'Use tenant credentials to revoke licenses' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('licenses')
      .update({ status: 'inactive' })
      .eq('id', id)
      .eq('tenant_id', req.tenant.id)
      .select('id, tenant_id, account_id, status, expires_at, created_at')
      .single();

    if (error) {
      console.error('Revoke license error:', error);
      return res.status(500).json({ error: 'Failed to revoke license' });
    }

    // Clear cache for this license
    licenseCache.clear();

    res.json(data);
  } catch (err) {
    console.error('Revoke license exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Renew license
router.patch('/:id/renew', async (req, res) => {
  try {
    if (req.isMasterAdmin) {
      return res.status(403).json({ error: 'Use tenant credentials to renew licenses' });
    }

    const { id } = req.params;

    // Get current license
    const { data: license, error: fetchError } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', req.tenant.id)
      .single();

    if (fetchError || !license) {
      return res.status(404).json({ error: 'License not found' });
    }

    // Calculate new expiry (+30 days from now)
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 30);

    const { data, error } = await supabase
      .from('licenses')
      .update({
        expires_at: newExpiry.toISOString(),
        status: 'active'
      })
      .eq('id', id)
      .eq('tenant_id', req.tenant.id)
      .select('id, tenant_id, account_id, status, expires_at, created_at')
      .single();

    if (error) {
      console.error('Renew license error:', error);
      return res.status(500).json({ error: 'Failed to renew license' });
    }

    // Clear cache for this license
    licenseCache.clear();

    res.json(data);
  } catch (err) {
    console.error('Renew license exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
