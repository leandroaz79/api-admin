const supabase = require('../config/supabase');
const { hashKey, compareKey } = require('../utils/hash');
const licenseCache = require('../utils/cache');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    // Check if master admin key
    if (token === process.env.ADMIN_MASTER_KEY) {
      req.isMasterAdmin = true;
      req.tenant = null;
      req.license = null;
      return next();
    }

    // Check cache first for tenant admin keys
    const cachedTenant = licenseCache.get(`tenant:${token}`);
    if (cachedTenant) {
      if (cachedTenant.status !== 'active') {
        return res.status(403).json({ error: 'Tenant is not active' });
      }
      req.isMasterAdmin = false;
      req.tenant = cachedTenant;
      req.license = null;
      return next();
    }

    // Try to validate as tenant admin key (with hash support)
    const tokenHash = hashKey(token);

    // First try with hash
    let { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('api_admin_key_hash', tokenHash);

    // Fallback to plaintext for backward compatibility
    if (!tenants || tenants.length === 0) {
      const { data: plainTenants, error: plainError } = await supabase
        .from('tenants')
        .select('*')
        .eq('api_admin_key', token);

      if (plainTenants && plainTenants.length > 0) {
        tenants = plainTenants;
        console.log('[AUTH] Using plaintext tenant key (migrate to hash)');
      }
    }

    if (tenants && tenants.length > 0) {
      const tenant = tenants[0];

      if (tenant.status !== 'active') {
        return res.status(403).json({ error: 'Tenant is not active' });
      }

      // Cache tenant
      licenseCache.set(`tenant:${token}`, tenant);

      req.isMasterAdmin = false;
      req.tenant = tenant;
      req.license = null;
      return next();
    }

    // Check cache for license keys
    const cachedLicense = licenseCache.get(`license:${token}`);
    if (cachedLicense) {
      console.log('[CACHE MISS]', token.substring(0, 20) + '...');

      // Validate expiry
      if (new Date(cachedLicense.expires_at) < new Date()) {
        licenseCache.delete(`license:${token}`);
        return res.status(403).json({ error: 'License expired' });
      }

      if (cachedLicense.status !== 'active') {
        return res.status(403).json({ error: 'License is not active' });
      }

      req.isMasterAdmin = false;
      req.tenant = { id: cachedLicense.tenant_id };
      req.license = cachedLicense;
      return next();
    }

    // Try to validate as license key (with hash support)
    const { data: licenses, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('api_key_hash', tokenHash);

    // Fallback to plaintext for backward compatibility
    let license = null;
    if (!licenses || licenses.length === 0) {
      const { data: plainLicenses, error: plainLicenseError } = await supabase
        .from('licenses')
        .select('*')
        .eq('api_key', token);

      if (plainLicenses && plainLicenses.length > 0) {
        license = plainLicenses[0];
        console.log('[AUTH] Using plaintext license key (migrate to hash)');
      }
    } else {
      license = licenses[0];
    }

    if (license) {
      console.log('[CACHE MISS]', token.substring(0, 20) + '...');

      // Validate expiry
      if (new Date(license.expires_at) < new Date()) {
        return res.status(403).json({ error: 'License expired' });
      }

      if (license.status !== 'active') {
        return res.status(403).json({ error: 'License is not active' });
      }

      // Cache license
      licenseCache.set(`license:${token}`, license);

      req.isMasterAdmin = false;
      req.tenant = { id: license.tenant_id };
      req.license = license;
      return next();
    }

    return res.status(401).json({ error: 'Invalid API key' });
  } catch (err) {
    console.error('[AUTH ERROR]', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = authMiddleware;
