const supabase = require('../config/supabase');

/**
 * Log API usage for billing and analytics
 * @param {object} params - Usage parameters
 * @param {string} params.tenant_id - Tenant ID
 * @param {string} params.license_id - License ID
 * @param {string} params.model - Model used (e.g., claude-3-opus)
 * @param {number} params.tokens_prompt - Prompt tokens
 * @param {number} params.tokens_completion - Completion tokens
 */
async function logUsage({ tenant_id, license_id, model, tokens_prompt, tokens_completion }) {
  try {
    const { error } = await supabase
      .from('usage_logs')
      .insert({
        tenant_id,
        license_id,
        model: model || null,
        tokens_prompt: tokens_prompt || null,
        tokens_completion: tokens_completion || null
      });

    if (error) {
      console.error('[USAGE LOG ERROR]', error.message);
      return false;
    }

    console.log('[USAGE LOGGED]', {
      tenant_id: tenant_id.substring(0, 8) + '...',
      license_id: license_id.substring(0, 8) + '...',
      model,
      tokens: (tokens_prompt || 0) + (tokens_completion || 0)
    });

    return true;
  } catch (err) {
    console.error('[USAGE LOG EXCEPTION]', err.message);
    return false;
  }
}

/**
 * Get usage stats for a tenant
 * @param {string} tenant_id - Tenant ID
 * @param {object} options - Query options
 * @returns {Promise<object>} - Usage statistics
 */
async function getUsageStats(tenant_id, options = {}) {
  try {
    const { start_date, end_date, license_id } = options;

    let query = supabase
      .from('usage_logs')
      .select('*')
      .eq('tenant_id', tenant_id);

    if (license_id) {
      query = query.eq('license_id', license_id);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[USAGE STATS ERROR]', error.message);
      return null;
    }

    // Calculate totals
    const stats = {
      total_requests: data.length,
      total_tokens_prompt: 0,
      total_tokens_completion: 0,
      total_tokens: 0,
      by_model: {},
      by_license: {}
    };

    data.forEach(log => {
      const prompt = log.tokens_prompt || 0;
      const completion = log.tokens_completion || 0;

      stats.total_tokens_prompt += prompt;
      stats.total_tokens_completion += completion;
      stats.total_tokens += prompt + completion;

      // By model
      if (log.model) {
        if (!stats.by_model[log.model]) {
          stats.by_model[log.model] = { count: 0, tokens: 0 };
        }
        stats.by_model[log.model].count++;
        stats.by_model[log.model].tokens += prompt + completion;
      }

      // By license
      if (log.license_id) {
        if (!stats.by_license[log.license_id]) {
          stats.by_license[log.license_id] = { count: 0, tokens: 0 };
        }
        stats.by_license[log.license_id].count++;
        stats.by_license[log.license_id].tokens += prompt + completion;
      }
    });

    return stats;
  } catch (err) {
    console.error('[USAGE STATS EXCEPTION]', err.message);
    return null;
  }
}

module.exports = {
  logUsage,
  getUsageStats
};
