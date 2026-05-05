# API de Gerenciamento de Licenças - Setup

## 1. CRIAR TABELAS NO SUPABASE

Acesse o Supabase Dashboard → SQL Editor e execute o arquivo `schema.sql`:

```sql
-- Copie e cole todo o conteúdo do arquivo schema.sql
```

Ou acesse: https://supabase.com/dashboard/project/anpdeicypxflfwzdcpkr/sql

## 2. CONFIGURAR .ENV

Copie `.env.example` para `.env` e preencha:

```
PORT=3001
SUPABASE_URL=https://anpdeicypxflfwzdcpkr.supabase.co
SUPABASE_SERVICE_KEY=sua_service_key
ADMIN_MASTER_KEY=sk_master_a8f3c91e7b2d4f6a9e7c8b9c0e5f1a
```

## 3. INSTALAR E RODAR

```bash
npm install
npm start
```

## 4. TESTES

### Teste 1 - Listar tenants (master admin)
```bash
curl -X GET http://localhost:3001/v1/tenants \
  -H "Authorization: Bearer sk_master_a8f3c91e7b2d4f6a9e7c8b9c0e5f1a"
```

### Teste 2 - Criar tenant
```bash
curl -X POST http://localhost:3001/v1/tenants \
  -H "Authorization: Bearer sk_master_a8f3c91e7b2d4f6a9e7c8b9c0e5f1a" \
  -H "Content-Type: application/json" \
  -d '{"name":"Tenant Teste","email":"tenant@teste.com"}'
```

**Guarde a chave `api_admin_key` retornada!**

### Teste 3 - Criar licença (usando chave do tenant)
```bash
curl -X POST http://localhost:3001/v1/licenses \
  -H "Authorization: Bearer sk_admin_xxx" \
  -H "Content-Type: application/json" \
  -d '{"name":"Cliente Teste","email":"teste@email.com","whatsapp":"11999999999","expires_at":"2027-12-31"}'
```

### Teste 4 - Listar licenças
```bash
curl -X GET http://localhost:3001/v1/licenses \
  -H "Authorization: Bearer sk_admin_xxx"
```

## ENDPOINTS DISPONÍVEIS

### Tenants (Master Admin apenas)
- `POST /v1/tenants` - Criar tenant
- `GET /v1/tenants` - Listar tenants
- `PATCH /v1/tenants/:id/status` - Ativar/desativar tenant

### Accounts (Tenant Admin)
- `GET /v1/accounts` - Listar contas do tenant

### Licenses (Tenant Admin)
- `POST /v1/licenses` - Criar licença
- `GET /v1/licenses` - Listar licenças
- `PATCH /v1/licenses/:id/revoke` - Revogar licença
- `PATCH /v1/licenses/:id/renew` - Renovar licença (+30 dias)

## DOCKER

```bash
docker build -t api-gera-lic .
docker run -p 3001:3001 --env-file .env api-gera-lic
```
