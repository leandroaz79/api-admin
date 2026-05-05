const { logUsage } = require('../services/usage');

/**
 * Middleware to log API usage after successful requests
 * Should be placed after auth middleware
 */
function usageLoggerMiddleware(req, res, next) {
  // Store original send function
  const originalSend = res.send;

  // Override send to capture response
  res.send = function (data) {
    // Only log successful requests (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Only log if we have license info (not master admin)
      if (req.license && req.tenant) {
        // Try to extract usage data from request/response
        const model = req.body?.model || null;
        let tokens_prompt = null;
        let tokens_completion = null;

        // Try to parse response for token info
        try {
          const responseData = typeof data === 'string' ? JSON.parse(data) : data;

          // Check for Anthropic API response format
          if (responseData?.usage) {
            tokens_prompt = responseData.usage.input_tokens || null;
            tokens_completion = responseData.usage.output_tokens || null;
          }
        } catch (err) {
          // Ignore parsing errors
        }

        // Log usage asynchronously (don't block response)
        setImmediate(() => {
          logUsage({
            tenant_id: req.tenant.id,
            license_id: req.license.id,
            model,
            tokens_prompt,
            tokens_completion
          }).catch(err => {
            console.error('[USAGE LOGGER ERROR]', err.message);
          });
        });
      }
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

module.exports = usageLoggerMiddleware;
