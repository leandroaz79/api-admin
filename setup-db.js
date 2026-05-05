require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  console.log('Setting up database...');

  const sql = fs.readFileSync('./schema.sql', 'utf8');

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Error executing SQL:', error);

    // Try executing each statement separately
    console.log('\nTrying to execute statements one by one...');
    const statements = sql.split(';').filter(s => s.trim());

    for (const statement of statements) {
      if (!statement.trim()) continue;

      console.log(`\nExecuting: ${statement.substring(0, 50)}...`);
      const { error: stmtError } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      });

      if (stmtError) {
        console.error('Error:', stmtError.message);
      } else {
        console.log('✓ Success');
      }
    }
  } else {
    console.log('✓ Database setup complete!');
  }
}

setupDatabase();
