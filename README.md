# Bolao Copa 2026

Sistema de bolao com usuarios, apostas, ranking, conquistas, administracao e transparencia.

## Como rodar localmente

```bash
npm install
npm start
```

Depois acesse:

```text
http://localhost:3000
```

## Variaveis de ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```env
APP_URL=http://localhost:3000
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu_usuario
SMTP_PASS=sua_senha
SMTP_FROM="Bolao Copa 2026 <no-reply@seuprovedor.com>"
JWT_SECRET=uma_chave_secreta
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua_senha_db
DB_NAME=bolao_copa
USE_MEMORY_DB=false
```

## Criar banco PostgreSQL

```bash
createdb -U postgres bolao_copa
psql -U postgres -d bolao_copa -f database/bolao.sql
psql -U postgres -d bolao_copa -f database/2026_achievements.sql
```

## Deploy

Para deixar online, suba o codigo para o GitHub e publique em um servico que rode Node.js com PostgreSQL, como Render, Railway, Fly.io ou VPS.

Comando de start:

```bash
npm start
```

Configure as mesmas variaveis do `.env` no painel da hospedagem. Nao envie `.env` nem arquivos com senhas para o GitHub.
