# CryptoRealm: Guardians of the Void - Guia de Instalacao

## Pre-requisitos

Instale estes programas antes de comecar:

- **Node.js 20+** - https://nodejs.org
- **Docker Desktop** - https://docker.com/products/docker-desktop
- **Git** - https://git-scm.com
- **Telegram Bot Token** - Fale com @BotFather no Telegram

---

## Instalacao Rapida (Docker)

O jeito mais facil de rodar tudo de uma vez:

```bash
# 1. Entre na pasta do projeto
cd "jogo telegram"

# 2. Configure as variaveis de ambiente (veja secao abaixo)

# 3. Suba tudo com Docker
docker compose up -d

# 4. Acesse:
#    - Jogo (TMA): http://localhost:8080
#    - Admin: http://localhost:3000
#    - Backend API: http://localhost:3001/health
```

---

## Instalacao Manual (Desenvolvimento)

Se preferir rodar cada servico separado para desenvolvimento:

### 1. Banco de Dados PostgreSQL + Redis

**Opcao A - Docker (recomendado):**
```bash
docker compose up postgres redis -d
```

**Opcao B - Instalacao local:**
- Windows: https://www.postgresql.org/download/windows/
- Mac: `brew install postgresql@16 redis`
- Linux: `sudo apt install postgresql redis-server`

Criar o banco:
```bash
psql -U postgres -c "CREATE DATABASE cryptorealm;"
```

### 2. Backend API (server/backend)

```bash
cd server/backend

# Instalar dependencias
npm install

# Gerar o Prisma Client
npx prisma generate

# Criar as tabelas no banco
npx prisma db push

# (Opcional) Popular com dados de teste
npx tsx prisma/seed.ts

# Rodar em modo desenvolvimento
npm run dev
```

O backend rodara em: `http://localhost:3001`

**Endpoints principais:**
- `POST /api/auth/telegram` - Login/Registro
- `GET /api/players/me` - Perfil do jogador
- `POST /api/farming/collect` - Coletar recursos
- `POST /api/guardians/buy` - Comprar guardiao
- `POST /api/guardians/:id/upgrade` - Upar guardiao
- `POST /api/withdrawals` - Solicitar saque

### 3. Frontend TMA - Jogo (server/tma)

```bash
cd server/tma

# Instalar dependencias
npm install

# Rodar em modo desenvolvimento
npm run dev
```

O jogo rodara em: `http://localhost:5173`

**Para testar dentro do Telegram:**
1. Crie um bot com @BotFather
2. Configure o Web App URL para sua URL de producao
3. Use ngrok para testar localmente: `ngrok http 5173`

### 4. Admin Dashboard (admin/)

```bash
cd admin

# Instalar dependencias
npm install

# Rodar em modo desenvolvimento
npm run dev
```

O admin rodara em: `http://localhost:3000`

**Contas de teste:**
| Email | Senha | Permissao |
|---|---|---|
| admin@cryptorealm.io | admin123 | Super Admin (tudo) |
| moderator@cryptorealm.io | mod123 | Admin (telas 1-3,5-6) |
| viewer@cryptorealm.io | view123 | Viewer (somente leitura) |

### 5. Telegram Bot (server/bot)

```bash
cd server/bot

# Instalar dependencias
npm install

# Configure o token no .env
# Edite o arquivo .env e coloque seu BOT_TOKEN

# Rodar
npm run dev
```

**Como obter o BOT_TOKEN:**
1. Abra o Telegram e procure por @BotFather
2. Envie `/newbot`
3. Siga as instrucoes para criar o bot
4. Copie o token que ele te der
5. Cole no arquivo `server/bot/.env`

---

## Variaveis de Ambiente

Crie/edite os arquivos `.env` em cada pasta:

### server/backend/.env
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cryptorealm"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="uma-chave-secreta-aqui"
PORT=3001
```

### server/bot/.env
```
BOT_TOKEN="7012345678:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
WEBAPP_URL="https://seu-dominio.com"
API_BASE="http://localhost:3001/api"
```

### admin/.env (opcional)
```
NEXTAUTH_SECRET="outra-chave-secreta"
```

---

## Estrutura de Pastas

```
jogo telegram/
├── admin/              # Painel Admin (Next.js)
│   ├── src/
│   │   ├── app/        # Paginas (7 telas)
│   │   ├── components/ # Componentes UI
│   │   ├── data/       # Mock data
│   │   └── lib/        # Utils, auth
│   └── package.json
│
├── server/             # Arquivos do jogo
│   ├── backend/        # API Server (Fastify)
│   │   ├── prisma/     # Schema do banco
│   │   ├── src/
│   │   │   ├── routes/     # Endpoints da API
│   │   │   ├── jobs/       # Filas (BullMQ)
│   │   │   └── middleware/ # Auth
│   │   └── package.json
│   │
│   ├── tma/            # Jogo (React + Vite)
│   │   ├── src/
│   │   │   ├── pages/      # 5 paginas do jogo
│   │   │   ├── components/ # UI e Game components
│   │   │   ├── assets/     # SVGs dos guardioes
│   │   │   └── utils/      # API client, store
│   │   └── package.json
│   │
│   ├── bot/            # Telegram Bot (telegraf.js)
│   │   ├── src/
│   │   │   └── index.ts    # Bot principal
│   │   └── package.json
│   │
│   └── contracts/      # Smart Contracts (TON)
│       ├── treasury/   # Contrato da Treasury
│       ├── ve_token/   # Contrato do token VE
│       └── scripts/    # Deploy scripts
│
├── terraform/          # Infraestrutura (AWS)
│   └── main.tf         # EKS, RDS, Redis
│
├── docker-compose.yml  # Docker para todos os servicos
├── SETUP.md            # Este arquivo
└── .github/workflows/  # CI/CD com GitHub Actions
```

---

## Comandos Uteis

```bash
# Ver logs do backend
docker compose logs backend -f

# Resetar o banco de dados
cd server/backend && npx prisma db push --force-reset

# Rodar seed (dados de teste)
cd server/backend && npx tsx prisma/seed.ts

# Build para producao
cd server/backend && npm run build
cd server/tma && npm run build
cd admin && npm run build

# Parar tudo
docker compose down

# Parar e limpar volumes (apaga dados do banco)
docker compose down -v
```

---

## Deploy em Producao

### 1. Configure os segredos
```bash
# Gere chaves seguras
openssl rand -hex 32  # Use para JWT_SECRET
openssl rand -hex 32  # Use para NEXTAUTH_SECRET
```

### 2. Configure o dominio
- Aponte seu dominio para o servidor
- Configure SSL com Let's Encrypt ou Cloudflare

### 3. Deploy com Docker
```bash
# No servidor
git clone <seu-repo>
cd jogo-telegram

# Configure os .env com valores reais
# Suba tudo
docker compose up -d --build
```

### 4. Configure o Telegram Bot
- No @BotFather, configure o Web App URL
- Use o dominio do TMA em producao

### 5. Deploy Smart Contracts (TON)
```bash
cd server/contracts
npm install
npx blueprint build
npx blueprint run --testnet  # Primeiro em testnet
npx blueprint run --mainnet  # Depois em mainnet
```

---

## Troubleshooting

**Erro: "Can't reach database server"**
- Verifique se o PostgreSQL esta rodando: `docker compose ps`
- Verifique a DATABASE_URL no .env

**Erro: "Redis connection refused"**
- Verifique se o Redis esta rodando: `docker compose ps`
- Verifique a REDIS_URL no .env

**Erro: "Module not found"**
- Delete node_modules e instale de novo:
```bash
rm -rf node_modules package-lock.json
npm install
```

**Bot nao responde no Telegram**
- Verifique se o BOT_TOKEN esta correto no .env
- Verifique se o bot esta rodando: `docker compose logs bot`

**Pagina fica branca no TMA**
- Abra o console do navegador (F12) para ver erros
- Verifique se o backend esta rodando na porta 3001

---

## Arquitetura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Telegram    │────>│  TMA        │────>│  Backend    │
│  Bot         │     │  (React)    │     │  (Fastify)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐     ┌──────┴──────┐
                    │  Admin      │────>│  PostgreSQL │
                    │  (Next.js)  │     │  + Redis    │
                    └─────────────┘     └──────┬──────┘
                                               │
                                        ┌──────┴──────┐
                                        │  TON        │
                                        │  Blockchain │
                                        └─────────────┘
```
