# Bolão Copa 2026

Sistema de bolão com usuários, apostas, administração e transparência.

## Como rodar localmente

```bash
npm install
npm start
```

Depois acesse:

```text
http://localhost:3000
```

## Variáveis de ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```env
APP_URL=http://localhost:3000
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu_usuario
SMTP_PASS=sua_senha
SMTP_FROM="Bolão Copa 2026 <no-reply@seuprovedor.com>"
JWT_SECRET=uma_chave_secreta
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua_senha_db
DB_NAME=bolao_copa
USE_MEMORY_DB=false
FIFA_BASE_URL=https://api.fifa.com/api/v3
FIFA_WORLD_CUP_COMPETITION_ID=17
FIFA_WORLD_CUP_SEASON_ID=285023
FIFA_WORLD_CUP_FROM=2026-06-01
FIFA_WORLD_CUP_TO=2026-07-31
```

A busca de jogos usa a API gratuita do site da FIFA no backend. Ela não exige chave e retorna jogos da Copa do Mundo 2026, horários, status e placar quando a FIFA disponibiliza esses dados.

No painel administrativo, use `Buscar FIFA 2026`, importe os jogos desejados e libere as apostas manualmente.

## Criar banco PostgreSQL

```bash
createdb -U postgres bolao_copa
psql -U postgres -d bolao_copa -f database/bolao.sql
```

## Deploy

Para deixar online, suba o código para o GitHub e publique em um serviço que rode Node.js com PostgreSQL, como Render, Railway, Fly.io ou VPS.

Comando de start:

```bash
npm start
```

Configure as mesmas variáveis do `.env` no painel da hospedagem. Não envie `.env` nem arquivos com senhas para o GitHub.
