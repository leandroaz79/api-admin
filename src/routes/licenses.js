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

    console.log('[LICENSE CREATE] Starting for tenant:', req.tenant.id, 'email:', email);

    // STEP 1: Find or create account
    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('id, name, email')
      .eq('email', email)
      .eq('tenant_id', req.tenant.id)
      .single();

    let accountId;

    if (existingAccount) {
      accountId = existingAccount.id;
      console.log('[LICENSE CREATE] Using existing account:', accountId);
    } else {
      const { data: newAccount, error: accountError } = await supabase
        .from('accounts')
        .insert({
          tenant_id: req.tenant.id,
          name: name || email,
          email,
          whatsapp
        })
        .select()
        .single();

      if (accountError) {
        console.error('[LICENSE CREATE] Account creation error:', accountError);
        return res.status(500).json({ error: 'Failed to create account' });
      }

      accountId = newAccount.id;
      console.log('[LICENSE CREATE] Created new account:', accountId);
    }

    // STEP 2: Generate API key with hash
    const { key: apiKey, hash: apiKeyHash } = generateApiKeyWithHash();

    // STEP 3: Encrypt API key for secure storage
    const apiKeyEncrypted = encrypt(apiKey);

    // STEP 4: Create license with account_id
    console.log('[LICENSE CREATE] Creating license with account_id:', accountId);

    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .insert({
        tenant_id: req.tenant.id,
        account_id: accountId,
        api_key_hash: apiKeyHash,
        api_key_encrypted: apiKeyEncrypted,
        expires_at: expiresDate.toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (licenseError) {
      console.error('[LICENSE CREATE] License creation error:', licenseError);
      return res.status(500).json({ error: 'Failed to create license' });
    }

    console.log('[LICENSE CREATE] Success! License ID:', license.id, 'Account ID:', license.account_id);

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
    console.error('[LICENSE CREATE EXCEPTION]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List licenses
router.get('/', async (req, res) => {
  try {
    if (req.isMasterAdmin) {
      return res.status(403).json({ error: 'Use tenant credentials to list licenses' });
    }

    console.log('[LICENSE LIST] Fetching licenses for tenant:', req.tenant.id);

    // FIRST query: Get licenses
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('id, tenant_id, account_id, status, expires_at, created_at')
      .eq('tenant_id', req.tenant.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[LICENSE LIST ERROR]', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        tenant_id: req.tenant.id
      });
      return res.status(500).json({
        error: 'Failed to list licenses',
        details: error.message
      });
    }

    console.log('[LICENSE LIST] Found', licenses?.length || 0, 'licenses');

    if (!licenses || licenses.length === 0) {
      return res.json([]);
    }

    // SECOND query: Get accounts separately
    const accountIds = licenses
      .map(l => l.account_id)
      .filter(Boolean);

    console.log('[LICENSE LIST] Account IDs:', accountIds);

    let accounts = [];

    if (accountIds.length > 0) {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, email, whatsapp')
        .in('id', accountIds);

      if (error) {
        console.error('[ACCOUNTS FETCH ERROR]', error);
      }

      accounts = data || [];

      console.log('[ACCOUNTS FETCH RESULT]', accounts);
    } else {
      console.log('[ACCOUNTS FETCH] No account IDs found');
    }

    // Create accounts map for fast lookup
    const accountsMap = {};
    if (accounts) {
      accounts.forEach(acc => {
        accountsMap[acc.id] = acc;
      });
    }

    // Build response with manual join
    const result = licenses.map(license => {
      const acc = accountsMap[license.account_id];

      // Debug log to verify correct IDs
      console.log('[LICENSE LIST ITEM]', {
        license_id: license.id,
        account_id: license.account_id,
        tenant_id: license.tenant_id
      });

      console.log('[MAPPING]', {
        license_id: license.id,
        account_id: license.account_id,
        found_account: !!acc
      });

      return {
        id: license.id, // MUST be licenses.id (UUID)
        client_name: acc?.name || '—',
        email: acc?.email || '—',
        whatsapp: acc?.whatsapp || null,
        status: license.status,
        expires_at: license.expires_at,
        created_at: license.created_at,
        api_key_masked: '••••••••'
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[LICENSE LIST EXCEPTION]', {
      message: err.message,
      stack: err.stack,
      tenant_id: req.tenant?.id
    });
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
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

    console.log('[KEY VIEW REQUEST]', {
      license_id: id,
      tenant_id: req.tenant.id,
      timestamp: new Date().toISOString()
    });

    // Fetch license with encrypted key and plaintext fallback
    const { data: license, error } = await supabase
      .from('licenses')
      .select('id, api_key_encrypted, api_key, status, tenant_id')
      .eq('id', id)
      .eq('tenant_id', req.tenant.id)
      .single();

    if (error) {
      console.error('[KEY VIEW ERROR]', {
        license_id: id,
        tenant_id: req.tenant.id,
        error_message: error.message,
        error_code: error.code,
        error_details: error.details
      });
    }

    if (error || !license) {
      console.log('[KEY VIEW 404]', {
        license_id: id,
        tenant_id: req.tenant.id,
        found: !!license
      });
      return res.status(404).json({ error: 'License not found' });
    }

    console.log('[KEY VIEW FOUND]', {
      license_id: license.id,
      has_encrypted: !!license.api_key_encrypted,
      has_plaintext: !!license.api_key,
      status: license.status
    });

    let apiKey;

    // Try encrypted key first (new licenses)
    if (license.api_key_encrypted) {
      try {
        apiKey = decrypt(license.api_key_encrypted);
        console.log('[KEY VIEW] Decrypted encrypted key successfully');
      } catch (decryptError) {
        console.error('[DECRYPT ERROR]', decryptError.message);
        return res.status(500).json({ error: 'Failed to decrypt API key' });
      }
    }
    // Fallback to plaintext (legacy licenses - backward compatibility)
    else if (license.api_key) {
      apiKey = license.api_key;
      console.log('[KEY VIEW] Using plaintext fallback for legacy license:', license.id);
    }
    // No key available
    else {
      console.log('[KEY VIEW] No key available for license:', license.id);
      return res.status(404).json({ error: 'API key not available' });
    }

    // Audit log
    console.log(`[KEY VIEW SUCCESS] License ${id} viewed by tenant ${req.tenant.id} at ${new Date().toISOString()}`);

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
      config: {
        ANTHROPIC_BASE_URL: 'https://api-gw.techsysbr.space/v1',
        ANTHROPIC_AUTH_TOKEN: apiKey
      }
    });
  } catch (err) {
    console.error('[KEY VIEW EXCEPTION]', {
      message: err.message,
      stack: err.stack,
      license_id: req.params.id,
      tenant_id: req.tenant?.id
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
