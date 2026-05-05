# 📚 Exemplos de Uso - API v2.0

## 🔑 Autenticação

### Master Admin Key
```bash
export MASTER_KEY="sk_master_a8f3c91e7b2d4f6a9e7c8b9c0e5f1a"
```

### Tenant Admin Key
```bash
export TENANT_KEY="sk_admin_xxx"
```

### License Key
```bash
export LICENSE_KEY="lk_live_xxx"
```

---

## 👥 Gerenciamento de Tenants

### Criar Tenant
```bash
curl -X POST http://localhost:3001/v1/tenants \
  -H "Authorization: Bearer $MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Empresa XYZ",
    "email": "admin@empresa.com"
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Empresa XYZ",
  "email": "admin@empresa.com",
  "status": "active",
  "api_admin_key": "sk_admin_xxx",
  "created_at": "2026-05-05T21:58:10.533Z"
}
```

⚠️ **IMPORTANTE:** Guarde a `api_admin_key` - ela só é mostrada uma vez!

### Listar Tenants
```bash
curl -X GET http://localhost:3001/v1/tenants \
  -H "Authorization: Bearer $MASTER_KEY"
```

### Desativar Tenant
```bash
curl -X PATCH http://localhost:3001/v1/tenants/{tenant_id}/status \
  -H "Authorization: Bearer $MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "inactive"}'
```

---

## 🎫 Gerenciamento de Licenças

### Criar Licença
```bash
curl -X POST http://localhost:3001/v1/licenses \
  -H "Authorization: Bearer $TENANT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@cliente.com",
    "whatsapp": "11999999999",
    "expires_at": "2027-12-31"
  }'
```

**Response:**
```json
{
  "license": {
    "id": "uuid",
    "tenant_id": "uuid",
    "account_id": "uuid",
    "status": "active",
    "expires_at": "2027-12-31T00:00:00Z",
    "created_at": "2026-05-05T21:58:10.533Z"
  },
  "config": {
    "ANTHROPIC_BASE_URL": "https://api-gw.techsysbr.space/v1",
    "ANTHROPIC_AUTH_TOKEN": "lk_live_xxx"
  }
}
```

⚠️ **IMPORTANTE:** O `ANTHROPIC_AUTH_TOKEN` só é mostrado uma vez!

### Listar Licenças
```bash
curl -X GET http://localhost:3001/v1/licenses \
  -H "Authorization: Bearer $TENANT_KEY"
```

### Revogar Licença
```bash
curl -X PATCH http://localhost:3001/v1/licenses/{license_id}/revoke \
  -H "Authorization: Bearer $TENANT_KEY"
```

### Renovar Licença (+30 dias)
```bash
curl -X PATCH http://localhost:3001/v1/licenses/{license_id}/renew \
  -H "Authorization: Bearer $TENANT_KEY"
```

---

## 👤 Gerenciamento de Contas

### Listar Contas do Tenant
```bash
curl -X GET http://localhost:3001/v1/accounts \
  -H "Authorization: Bearer $TENANT_KEY"
```

---

## 📊 Estatísticas de Uso

### Ver Uso Geral
```bash
curl -X GET http://localhost:3001/v1/usage \
  -H "Authorization: Bearer $TENANT_KEY"
```

**Response:**
```json
{
  "total_requests": 1250,
  "total_tokens_prompt": 45000,
  "total_tokens_completion": 32000,
  "total_tokens": 77000,
  "by_model": {
    "claude-3-opus-20240229": {
      "count": 800,
      "tokens": 50000
    },
    "claude-3-sonnet-20240229": {
      "count": 450,
      "tokens": 27000
    }
  },
  "by_license": {
    "uuid-1": {
      "count": 600,
      "tokens": 40000
    },
    "uuid-2": {
      "count": 650,
      "tokens": 37000
    }
  }
}
```

### Filtrar por Data
```bash
curl -X GET "http://localhost:3001/v1/usage?start_date=2026-05-01&end_date=2026-05-31" \
  -H "Authorization: Bearer $TENANT_KEY"
```

### Filtrar por Licença
```bash
curl -X GET "http://localhost:3001/v1/usage?license_id={license_id}" \
  -H "Authorization: Bearer $TENANT_KEY"
```

---

## 🔍 Monitoramento

### Health Check
```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-05T21:58:10.533Z"
}
```

### Cache Stats
```bash
curl http://localhost:3001/cache/stats
```

**Response:**
```json
{
  "size": 15,
  "ttl": 60000
}
```

---

## 🎯 Uso pelo Cliente Final

### Configuração
O cliente recebe estas credenciais ao criar a licença:

```bash
export ANTHROPIC_BASE_URL="https://api-gw.techsysbr.space/v1"
export ANTHROPIC_AUTH_TOKEN="lk_live_xxx"
```

### Exemplo com Anthropic SDK (Python)
```python
import anthropic

client = anthropic.Anthropic(
    api_key="lk_live_xxx",
    base_url="https://api-gw.techsysbr.space/v1"
)

message = client.messages.create(
    model="claude-3-opus-20240229",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello, Claude!"}
    ]
)

print(message.content)
```

### Exemplo com Anthropic SDK (Node.js)
```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: 'lk_live_xxx',
  baseURL: 'https://api-gw.techsysbr.space/v1'
});

const message = await client.messages.create({
  model: 'claude-3-opus-20240229',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: 'Hello, Claude!' }
  ]
});

console.log(message.content);
```

### Exemplo com cURL
```bash
curl https://api-gw.techsysbr.space/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: lk_live_xxx" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-opus-20240229",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Hello, Claude!"}
    ]
  }'
```

---

## 🔐 Segurança

### Boas Práticas

1. **Nunca compartilhe chaves**
   - Master key: apenas admin
   - Tenant key: apenas tenant admin
   - License key: apenas cliente final

2. **Rotação de chaves**
   - Criar nova licença
   - Migrar cliente
   - Revogar antiga

3. **Monitoramento**
   - Verificar uso anormal
   - Alertar sobre expiração
   - Auditar acessos

---

## 🚨 Tratamento de Erros

### 401 - Unauthorized
```json
{
  "error": "Invalid API key"
}
```

**Solução:** Verificar chave de autenticação

### 403 - Forbidden
```json
{
  "error": "License expired"
}
```

**Solução:** Renovar licença

### 403 - Tenant Inactive
```json
{
  "error": "Tenant is not active"
}
```

**Solução:** Contatar administrador

### 400 - Bad Request
```json
{
  "error": "Email is required"
}
```

**Solução:** Verificar campos obrigatórios

---

## 📈 Casos de Uso

### 1. SaaS Multi-Tenant
```
Master Admin (você)
  └─ Tenant A (Cliente Empresa)
      ├─ License 1 (Usuário João)
      ├─ License 2 (Usuário Maria)
      └─ License 3 (Usuário Pedro)
  └─ Tenant B (Cliente Startup)
      ├─ License 1 (Usuário Ana)
      └─ License 2 (Usuário Carlos)
```

### 2. Revenda de API
```
Você (Master) → Cria Tenants (Revendedores)
Revendedores → Criam Licenses (Clientes Finais)
Clientes Finais → Usam API com suas licenses
```

### 3. Controle Interno
```
Você (Master) → Cria Tenant (Sua Empresa)
Tenant → Cria Licenses (Departamentos/Projetos)
Cada License → Rastreia uso separadamente
```

---

## 🎓 Fluxo Completo

### Setup Inicial
1. Master admin cria tenant
2. Tenant recebe `sk_admin_xxx`
3. Tenant guarda chave em local seguro

### Onboarding Cliente
1. Tenant cria licença para cliente
2. Cliente recebe `lk_live_xxx` e `ANTHROPIC_BASE_URL`
3. Cliente configura SDK com essas credenciais
4. Cliente começa a usar API

### Monitoramento
1. Tenant verifica uso em `/v1/usage`
2. Identifica clientes com alto consumo
3. Planeja billing baseado em tokens

### Renovação
1. Licença próxima de expirar
2. Tenant renova com `/licenses/{id}/renew`
3. Cliente continua usando sem interrupção

---

## 💡 Dicas

### Performance
- Cache reduz latência em 95%
- Primeira request: ~200ms
- Requests seguintes: ~5ms

### Billing
- Use `total_tokens` para calcular custo
- Agrupe por `by_model` para pricing diferenciado
- Filtre por período para faturamento mensal

### Segurança
- Rotacione chaves periodicamente
- Monitore tentativas de acesso inválidas
- Revogue licenças suspeitas imediatamente

---

**📚 Documentação completa em:** `MELHORIAS.md`
**🚀 Checklist de deploy em:** `DEPLOY-CHECKLIST.md`
