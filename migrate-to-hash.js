require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { hashKey } = require('./src/utils/hash');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function migrateTenantKeys() {
  console.log('\n=== Migrating Tenant Keys ===\n');

  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, api_admin_key')
    .is('api_admin_key_hash', null)
    .not('api_admin_key', 'is', null);

  if (error) {
    console.error('Error fetching tenants:', error);
    return;
  }

  console.log(`Found ${tenants.length} tenants to migrate`);

  for (const tenant of tenants) {
    const hash = hashKey(tenant.api_admin_key);

    const { error: updateError } = await supabase
      .from('tenants')
      .update({ api_admin_key_hash: hash })
      .eq('id', tenant.id);

    if (updateError) {
      console.error(`Failed to migrate tenant ${tenant.id}:`, updateError);
    } else {
      console.log(`✓ Migrated tenant ${tenant.id}`);
    }
  }

  console.log('\n✓ Tenant migration complete\n');
}

async function migrateLicenseKeys() {
  console.log('\n=== Migrating License Keys ===\n');

  const { data: licenses, error } = await supabase
    .from('licenses')
    .select('id, api_key')
    .is('api_key_hash', null)
    .not('api_key', 'is', null);

  if (error) {
    console.error('Error fetching licenses:', error);
    return;
  }

  console.log(`Found ${licenses.length} licenses to migrate`);

  for (const license of licenses) {
    const hash = hashKey(license.api_key);

    const { error: updateError } = await supabase
      .from('licenses')
      .update({ api_key_hash: hash })
      .eq('id', license.id);

    if (updateError) {
      console.error(`Failed to migrate license ${license.id}:`, updateError);
    } else {
      console.log(`✓ Migrated license ${license.id}`);
    }
  }

  console.log('\n✓ License migration complete\n');
}

async function migrate() {
  console.log('\n========================================');
  console.log('  API Key Hash Migration');
  console.log('========================================\n');

  await migrateTenantKeys();
  await migrateLicenseKeys();

  console.log('\n========================================');
  console.log('  Migration Complete!');
  console.log('========================================\n');
  console.log('⚠️  IMPORTANT:');
  console.log('   - Old plaintext keys still work (backward compatibility)');
  console.log('   - New keys are created with hash only');
  console.log('   - You can remove plaintext columns later after confirming all works\n');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
