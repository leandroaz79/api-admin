/**
 * Exemplo de como integrar o usage logger em um proxy/gateway
 *
 * Este arquivo mostra como capturar e logar o uso da API
 * quando você tem um proxy entre o cliente e o provider (Anthropic)
 */

const express = require('express');
const authMiddleware = require('./src/middleware/auth');
const usageLoggerMiddleware = require('./src/middleware/usageLogger');
const { logUsage } = require('./src/services/usage');

const app = express();

// Middleware básico
app.use(express.json());

// Auth middleware (valida license)
app.use(authMiddleware);

// Usage logger middleware (captura automaticamente)
app.use(usageLoggerMiddleware);

// Rota de proxy para Anthropic
app.post('/v1/messages', async (req, res) => {
  try {
    // Fazer request para Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    // O usageLoggerMiddleware vai capturar automaticamente
    // os tokens de data.usage quando você enviar a resposta
    res.json(data);

  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy failed' });
  }
});

// OU: Log manual de uso (mais controle)
app.post('/v1/messages-manual', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    // Log manual (não bloqueia resposta)
    if (req.license && data.usage) {
      logUsage({
        tenant_id: req.tenant.id,
        license_id: req.license.id,
        model: data.model || req.body.model,
        tokens_prompt: data.usage.input_tokens,
        tokens_completion: data.usage.output_tokens
      }).catch(err => {
        console.error('[USAGE LOG ERROR]', err);
      });
    }

    res.json(data);

  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy failed' });
  }
});

// Exemplo: Streaming com logging
app.post('/v1/messages-stream', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        ...req.body,
        stream: true
      })
    });

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let model = req.body.model;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);

      // Parse SSE events para capturar tokens
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            // Capturar usage do evento final
            if (data.type === 'message_delta' && data.usage) {
              totalOutputTokens = data.usage.output_tokens || 0;
            }

            if (data.type === 'message_start' && data.message?.usage) {
              totalInputTokens = data.message.usage.input_tokens || 0;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      // Forward chunk to client
      res.write(chunk);
    }

    res.end();

    // Log após stream completo
    if (req.license && (totalInputTokens > 0 || totalOutputTokens > 0)) {
      logUsage({
        tenant_id: req.tenant.id,
        license_id: req.license.id,
        model,
        tokens_prompt: totalInputTokens,
        tokens_completion: totalOutputTokens
      }).catch(err => {
        console.error('[USAGE LOG ERROR]', err);
      });
    }

  } catch (err) {
    console.error('Streaming proxy error:', err);
    res.status(500).json({ error: 'Streaming failed' });
  }
});

app.listen(3002, () => {
  console.log('Proxy with usage logging running on port 3002');
});
