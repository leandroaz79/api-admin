const express = require('express');
const supabase = require('../config/supabase');
const { generateApiKeyWithHash } = require('../services/keyGenerator');
const licenseCache = require('../utils/cache');
const { encrypt, decrypt } = require('../utils/encryption');

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

    // Encrypt API key for secure storage
    const apiKeyEncrypted = encrypt(apiKey);

    // Create license
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .insert({
        tenant_id: req.tenant.id,
        account_id: account.id,
        api_key_hash: apiKeyHash,
        api_key_encrypted: apiKeyEncrypted,
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
      api_key: apiKey,
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
        api_key_encrypted,
        account:accounts(id, name, email, whatsapp)
      `)
      .eq('tenant_id', req.tenant.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('List licenses error:', error);
      return res.status(500).json({ error: 'Failed to list licenses' });
    }

    // Format response with masked API key
    const formattedData = data.map(license => ({
      id: license.id,
      client_name: license.account?.name || 'N/A',
      email: license.account?.email || 'N/A',
      whatsapp: license.account?.whatsapp || null,
      status: license.status,
      expires_at: license.expires_at,
      created_at: license.created_at,
      api_key_masked: license.api_key_encrypted ? 'lk_live_****' : 'N/A'
    }));

    res.json(formattedData);
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

// Get license API key (view encrypted key)
router.get('/:id/key', async (req, res) => {
  try {
    if (req.isMasterAdmin) {
      return res.status(403).json({ error: 'Use tenant credentials to view license keys' });
    }

    const { id } = req.params;

    // Fetch license with encrypted key
    const { data: license, error } = await supabase
      .from('licenses')
      .select('id, api_key_encrypted, status')
      .eq('id', id)
      .eq('tenant_id', req.tenant.id)
      .single();

    if (error || !license) {
      return res.status(404).json({ error: 'License not found' });
    }

    if (!license.api_key_encrypted) {
      return res.status(404).json({ error: 'API key not available (legacy license)' });
    }

    // Decrypt API key
    const apiKey = decrypt(license.api_key_encrypted);

    // Log key view event
    console.log('[KEY VIEWED]', {
      license_id: license.id,
      tenant_id: req.tenant.id,
      timestamp: new Date().toISOString()
    });

    // Optional: Log to database
    await supabase
      .from('usage_logs')
      .insert({
        tenant_id: req.tenant.id,
        license_id: license.id,
        model: 'key_view',
        tokens_prompt: null,
        tokens_completion: null
      })
      .select();

    res.json({
      api_key: apiKey,
      license_id: license.id,
      status: license.status
    });
  } catch (err) {
    console.error('View license key exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
