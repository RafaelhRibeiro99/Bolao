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
APISPORTS_KEY=sua_chave_api_football
APISPORTS_BASE_URL=https://v3.football.api-sports.io
APISPORTS_WORLD_CUP_LEAGUE_ID=1
APISPORTS_WORLD_CUP_SEASON=2026
OPENLIGADB_BASE_URL=https://api.openligadb.de
OPENLIGADB_LEAGUE_SHORTCUT=wmk
OPENLIGADB_SEASON=2022
WIKIPEDIA_API_URL=https://en.wikipedia.org/w/api.php
```

`APISPORTS_KEY` é usada apenas no backend. Não coloque essa chave em arquivos HTML ou JavaScript do frontend.

OpenLigaDB não exige chave, mas depende de a liga/temporada existir no serviço. Para Copa 2022, use `OPENLIGADB_LEAGUE_SHORTCUT=wmk` e `OPENLIGADB_SEASON=2022`.

A fonte Wikipedia 2026 não exige chave e pode ser usada no admin pelo botão `Buscar Wikipedia 2026`.

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
