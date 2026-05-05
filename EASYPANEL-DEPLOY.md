# 🚀 Deploy no EasyPanel - Guia Completo

## ✅ Projeto 100% Preparado para EasyPanel

**Data:** 2026-05-05  
**Versão:** 2.1.0  
**Status:** ✅ PRONTO PARA DEPLOY  

---

## 📋 Pré-requisitos

### 1. Conta EasyPanel
- ✅ Conta criada em easypanel.io
- ✅ Servidor conectado
- ✅ Acesso ao painel

### 2. Supabase Configurado
- ✅ Projeto criado
- ✅ Tabelas criadas (executar `migration-hash-usage.sql`)
- ✅ SUPABASE_URL disponível
- ✅ SUPABASE_SERVICE_KEY disponível

### 3. Secrets Preparados
- ✅ ADMIN_MASTER_KEY gerado
- ✅ HASH_SECRET gerado (min 32 chars)

---

## 🚀 Deploy em 5 Minutos

### Passo 1: Criar App no EasyPanel (2 min)

1. **Login no EasyPanel**
   - Acesse seu painel
   - Clique em "Create App"

2. **Configurar App**
   ```
   Name: api-gera-lic
   Type: GitHub
   Repository: leandroaz79/api-admin
   Branch: main
   ```

3. **Build Settings**
   ```
   Build Command: npm install --production
   Start Command: npm start
   Port: 3001
   ```

### Passo 2: Configurar Environment Variables (2 min)

No EasyPanel, adicionar as seguintes variáveis:

```bash
# Node Environment
NODE_ENV=production
PORT=3001

# Supabase (obter do Supabase Dashboard)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Admin Master Key (gerar novo)
ADMIN_MASTER_KEY=sk_master_seu_secret_aqui

# HMAC Secret (gerar novo - min 32 chars)
HASH_SECRET=seu_hash_secret_64_caracteres_aqui
```

### Passo 3: Deploy (1 min)

1. Clicar em "Deploy"
2. Aguardar build (~2 min)
3. Verificar logs
4. Testar health check

---

## 🔐 Gerar Secrets

### ADMIN_MASTER_KEY
```bash
# Gerar master key
node -e "console.log('sk_master_' + require('crypto').randomBytes(24).toString('hex'))"
```

### HASH_SECRET
```bash
# Gerar hash secret (64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📊 Configurações do EasyPanel

### Recursos Recomendados
```
Memory: 512 MB (mínimo)
CPU: 0.5 cores (mínimo)
Disk: 1 GB
```

### Recursos Ideais (Produção)
```
Memory: 1 GB
CPU: 1 core
Disk: 2 GB
```

### Auto-scaling (Opcional)
```
Min Instances: 1
Max Instances: 3
CPU Threshold: 70%
Memory Threshold: 80%
```

---

## 🔍 Health Check

### Configuração
```
Path: /health
Interval: 30s
Timeout: 10s
Retries: 3
```

### Resposta Esperada
```json
{
  "status": "ok",
  "timestamp": "2026-05-05T22:50:00.000Z"
}
```

---

## 🌐 Domínio Customizado

### Configurar Domínio
1. No EasyPanel, ir em "Domains"
2. Adicionar domínio: `api.seudominio.com`
3. Configurar DNS:
   ```
   Type: CNAME
   Name: api
   Value: seu-app.easypanel.host
   ```
4. Aguardar propagação (~5 min)
5. SSL automático (Let's Encrypt)

---

## 🧪 Testar Deploy

### 1. Health Check
```bash
curl https://seu-app.easypanel.host/health
```

**Esperado:**
```json
{"status":"ok","timestamp":"2026-05-05T22:50:00.000Z"}
```

### 2. Cache Stats
```bash
curl https://seu-app.easypanel.host/cache/stats
```

**Esperado:**
```json
{"size":0,"ttl":60000}
```

### 3. Criar Tenant
```bash
curl -X POST https://seu-app.easypanel.host/v1/tenants \
  -H "Authorization: Bearer SEU_ADMIN_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste Deploy","email":"teste@deploy.com"}'
```

**Esperado:**
```json
{
  "id": "uuid",
  "name": "Teste Deploy",
  "email": "teste@deploy.com",
  "api_admin_key": "sk_admin_xxx",
  "status": "active"
}
```

---

## 📝 Checklist de Deploy

### Antes do Deploy
- [ ] Supabase configurado
- [ ] Migrations executadas
- [ ] Secrets gerados
- [ ] Repositório GitHub atualizado

### Durante o Deploy
- [ ] App criado no EasyPanel
- [ ] Environment variables configuradas
- [ ] Build command configurado
- [ ] Start command configurado
- [ ] Port configurado (3001)

### Após o Deploy
- [ ] Health check funcionando
- [ ] Cache stats acessível
- [ ] Criar tenant de teste
- [ ] Criar licença de teste
- [ ] Verificar logs
- [ ] Configurar domínio (opcional)

---

## 🔧 Troubleshooting

### Erro: "Build Failed"
```bash
# Verificar logs do build
# Comum: node_modules não instalado

Solução:
- Verificar package.json
- Verificar Node version (20+)
- Limpar cache e rebuild
```

### Erro: "App Crashed"
```bash
# Verificar logs da aplicação
# Comum: Environment variables faltando

Solução:
- Verificar todas as env vars
- Verificar SUPABASE_URL
- Verificar HASH_SECRET
```

### Erro: "Health Check Failed"
```bash
# Verificar se app está rodando
# Comum: Port incorreto

Solução:
- Verificar PORT=3001
- Verificar health endpoint /health
- Verificar logs de startup
```

### Erro: "HASH_SECRET not found"
```bash
# HASH_SECRET não configurado

Solução:
- Gerar novo secret
- Adicionar em Environment Variables
- Restart app
```

---

## 📊 Monitoramento

### Logs em Tempo Real
```
EasyPanel → Seu App → Logs
```

### Métricas
```
EasyPanel → Seu App → Metrics
- CPU Usage
- Memory Usage
- Network Traffic
- Request Count
```

### Alertas (Configurar)
```
- CPU > 80%
- Memory > 90%
- Health check failed
- App crashed
```

---

## 🔄 CI/CD Automático

### GitHub Actions (Opcional)

Criar `.github/workflows/deploy.yml`:

```yaml
name: Deploy to EasyPanel

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to EasyPanel
        run: |
          curl -X POST https://easypanel.io/api/deploy \
            -H "Authorization: Bearer ${{ secrets.EASYPANEL_TOKEN }}" \
            -d '{"app":"api-gera-lic","branch":"main"}'
```

---

## 💰 Custos Estimados

### EasyPanel Pricing
```
Starter: $5/mês
- 1 GB RAM
- 1 CPU core
- 10 GB storage
- Ideal para começar

Pro: $15/mês
- 4 GB RAM
- 2 CPU cores
- 50 GB storage
- Recomendado para produção
```

### Supabase Pricing
```
Free: $0/mês
- 500 MB database
- 1 GB bandwidth
- Ideal para testes

Pro: $25/mês
- 8 GB database
- 50 GB bandwidth
- Recomendado para produção
```

---

## 🚀 Otimizações para Produção

### 1. Enable Compression
```javascript
// src/index.js
const compression = require('compression');
app.use(compression());
```

### 2. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/v1/', limiter);
```

### 3. Helmet (Security Headers)
```javascript
const helmet = require('helmet');
app.use(helmet());
```

### 4. Morgan (Logging)
```javascript
const morgan = require('morgan');
app.use(morgan('combined'));
```

---

## 📞 Suporte

### EasyPanel
- Docs: https://easypanel.io/docs
- Support: support@easypanel.io

### Projeto
- GitHub: https://github.com/leandroaz79/api-admin
- Issues: https://github.com/leandroaz79/api-admin/issues

---

## ✅ Status Final

**Configuração:** ✅ COMPLETA  
**Arquivos:** ✅ docker-compose.yml, easypanel.json  
**Documentação:** ✅ EASYPANEL-DEPLOY.md  
**Status:** ✅ PRONTO PARA DEPLOY  

---

## 🎯 Próximos Passos

1. **Agora:** Fazer commit dos arquivos
2. **Depois:** Criar app no EasyPanel
3. **Por fim:** Configurar environment variables e deploy

---

**🚀 Projeto 100% preparado para EasyPanel!**

**Siga este guia passo a passo para deploy em 5 minutos!**
