# ⚡ Quick Start - API v2.0

## 🚀 Deploy em 5 Minutos

### 1️⃣ Executar Migration SQL (2 min)

Acesse: https://supabase.com/dashboard/project/anpdeicypxflfwzdcpkr/sql

Cole e execute:
```sql
-- Adicionar colunas de hash
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS api_admin_key_hash TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS api_key_hash TEXT;

-- Criar tabela de usage logs
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  model TEXT,
  tokens_prompt INTEGER,
  tokens_completion INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_usage_logs_tenant_id ON usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_license_id ON usage_logs(license_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_api_admin_key_hash ON tenants(api_admin_key_hash) WHERE api_admin_key_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_licenses_api_key_hash ON licenses(api_key_hash) WHERE api_key_hash IS NOT NULL;
```

### 2️⃣ Migrar Chaves Existentes (1 min)

```bash
npm run migrate:hash
```

### 3️⃣ Reiniciar Servidor (1 min)

```bash
# Parar servidor atual
# Ctrl+C ou:
pkill -f "node src/index.js"

# Iniciar novo
npm start
```

### 4️⃣ Testar (1 min)

```bash
# Health check
curl http://localhost:3001/health

# Cache stats
curl http://localhost:3001/cache/stats

# Criar tenant de teste
curl -X POST http://localhost:3001/v1/tenants \
  -H "Authorization: Bearer sk_master_a8f3c91e7b2d4f6a9e7c8b9c0e5f1a" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste v2","email":"teste@v2.com"}'
```

---

## ✅ Verificação Rápida

### Logs Esperados
```
API running on port 3001
Cache TTL: 60000ms
```

### Endpoints Funcionando
- ✅ `GET /health` → `{"status":"ok"}`
- ✅ `GET /cache/stats` → `{"size":0,"ttl":60000}`
- ✅ `POST /v1/tenants` → Retorna tenant com `api_admin_key`
- ✅ `POST /v1/licenses` → Retorna license com `ANTHROPIC_AUTH_TOKEN`
- ✅ `GET /v1/usage` → Retorna estatísticas

---

## 🎯 Teste Completo (5 min)

### 1. Criar Tenant
```bash
curl -X POST http://localhost:3001/v1/tenants \
  -H "Authorization: Bearer sk_master_a8f3c91e7b2d4f6a9e7c8b9c0e5f1a" \
  -H "Content-Type: application/json" \
  -d '{"name":"Empresa Teste","email":"teste@empresa.com"}'
```

**Guardar:** `api_admin_key` retornado

### 2. Criar Licença
```bash
curl -X POST http://localhost:3001/v1/licenses \
  -H "Authorization: Bearer sk_admin_SEU_KEY_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Cliente Teste",
    "email":"cliente@teste.com",
    "whatsapp":"11999999999",
    "expires_at":"2027-12-31"
  }'
```

**Guardar:** `ANTHROPIC_AUTH_TOKEN` retornado

### 3. Testar Cache (3 requests)
```bash
# Request 1 (CACHE MISS)
curl -X GET http://localhost:3001/v1/licenses \
  -H "Authorization: Bearer sk_admin_SEU_KEY_AQUI"

# Request 2 (CACHE HIT - mais rápida)
curl -X GET http://localhost:3001/v1/licenses \
  -H "Authorization: Bearer sk_admin_SEU_KEY_AQUI"

# Request 3 (CACHE HIT - mais rápida)
curl -X GET http://localhost:3001/v1/licenses \
  -H "Authorization: Bearer sk_admin_SEU_KEY_AQUI"
```

**Verificar logs:** Deve mostrar `[CACHE HIT]`

### 4. Ver Estatísticas
```bash
curl -X GET http://localhost:3001/v1/usage \
  -H "Authorization: Bearer sk_admin_SEU_KEY_AQUI"
```

---

## 🔍 Troubleshooting Rápido

### Erro: "Could not find api_admin_key_hash column"
```bash
# Executar migration SQL novamente
```

### Erro: "Invalid API key"
```bash
# Verificar se usou a chave correta
# Verificar se servidor reiniciou após migration
```

### Cache não funciona
```bash
# Verificar logs do servidor
# Deve mostrar: Cache TTL: 60000ms
```

### Usage logs vazios
```bash
# Normal se não houve uso ainda
# Fazer requests para popular
```

---

## 📊 Monitoramento Rápido

### Ver Cache Stats
```bash
watch -n 1 'curl -s http://localhost:3001/cache/stats'
```

### Ver Logs em Tempo Real
```bash
# Linux/Mac
tail -f logs/app.log

# Windows PowerShell
Get-Content logs/app.log -Wait
```

### Verificar Supabase
```sql
-- Ver tenants com hash
SELECT id, name, 
  CASE WHEN api_admin_key_hash IS NOT NULL THEN 'HASH' ELSE 'PLAIN' END as key_type
FROM tenants;

-- Ver licenses com hash
SELECT id, 
  CASE WHEN api_key_hash IS NOT NULL THEN 'HASH' ELSE 'PLAIN' END as key_type,
  status, expires_at
FROM licenses;

-- Ver usage logs
SELECT tenant_id, license_id, model, 
  tokens_prompt + tokens_completion as total_tokens,
  created_at
FROM usage_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎉 Pronto!

Sua API agora tem:
- ✅ Hash de API keys (segurança)
- ✅ Cache em memória (performance)
- ✅ Usage logs (billing)
- ✅ Backward compatibility (zero downtime)

**Próximos passos:**
1. Monitorar logs por 24h
2. Verificar performance
3. Confirmar que tudo funciona
4. Remover colunas plaintext (opcional, após 1 semana)

---

## 📚 Documentação Completa

- `MELHORIAS.md` - Detalhes técnicos
- `DEPLOY-CHECKLIST.md` - Checklist completo
- `EXEMPLOS.md` - Exemplos de uso
- `RESUMO-FINAL.md` - Resumo executivo

---

**🚀 Versão 2.0 rodando com sucesso!**
