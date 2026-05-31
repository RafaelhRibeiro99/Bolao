const { Pool, types } = require('pg');
require('dotenv').config();

// TIMESTAMP sem timezone deve sair exatamente como foi cadastrado no banco.
types.setTypeParser(1114, (value) => value);

function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function convertMysqlSyntax(sql) {
  return sql
    .replace(/"([^"]*)"/g, "'$1'")
    .replace(
      /FIELD\(fase,\s*'16_avos',\s*'oitavas',\s*'quartas',\s*'semifinal',\s*'final'\)/g,
      "CASE fase WHEN '16_avos' THEN 1 WHEN 'oitavas' THEN 2 WHEN 'quartas' THEN 3 WHEN 'semifinal' THEN 4 WHEN 'final' THEN 5 ELSE 6 END"
    );
}

function normalizeSql(sql) {
  let normalized = convertMysqlSyntax(sql);
  if (/^\s*INSERT\s+INTO\s+palpites\b/i.test(normalized) && !/\bRETURNING\b/i.test(normalized)) {
    normalized = `${normalized.trim()} RETURNING id`;
  }
  return convertPlaceholders(normalized);
}

function decorateResult(result) {
  const rows = result.rows || [];
  rows.affectedRows = result.rowCount || 0;
  if (rows[0]?.id) rows.insertId = rows[0].id;
  return rows;
}

if (process.env.USE_MEMORY_DB === 'true') {
  let nextUserId = 2;
  let nextGameId = 2;
  let nextPalpiteId = 1;
  let nextTimeId = 52;

  const usuarios = [{
    id: 1,
    nome: 'Administrador',
    nome_exibicao: 'Administrador',
    email: 'admin@bolao.com',
    senha_hash: '$2a$10$L5dm8xwsR2dFaEKZ6ISQeuZkpdolNYEeVSHEAACv4AOleLyBIf7O.',
    tipo: 'admin',
    status_pagamento: 'pago',
    whatsapp: null,
    pix_chave: null,
    avatar: null,
    avatar_face: 'messi.png',
    titulo_ativo: null,
    emoji_ativo: null,
    moldura: null,
    aura: null,
    efeito_nome: null,
    termos_aceitos: 1,
    email_verified: 1,
    criado_em: new Date(),
  }];

  const jogos = [{
    id: 1,
    time_casa: 'Brasil',
    time_fora: 'Argentina',
    data_jogo: '2026-06-15 16:00:00',
    placar_casa: null,
    placar_fora: null,
    penaltis_casa: null,
    penaltis_fora: null,
    status: 'aberto',
    fase: 'fase_grupos',
    liberado_palpite: 1,
    premio_acumulado: 0,
    taxa_admin: 0,
    jogo_validado: 0,
    is_final: 0,
    criado_em: new Date(),
  }];

  const times = [
    'África do Sul',
    'Alemanha',
    'Argélia',
    'Argentina',
    'Arsenal',
    'Arábia Saudita',
    'Austrália',
    'Áustria',
    'Bélgica',
    'Bósnia e Herzegovina',
    'Brasil',
    'Cabo Verde',
    'Canadá',
    'Colômbia',
    'Coreia do Sul',
    'Costa do Marfim',
    'Croácia',
    'Curazao',
    'Egito',
    'Equador',
    'Escócia',
    'Espanha',
    'Estados Unidos',
    'França',
    'Gana',
    'Haiti',
    'Inglaterra',
    'Irã',
    'Iraque',
    'Japão',
    'Jordânia',
    'Marrocos',
    'México',
    'Nigéria',
    'Noruega',
    'Nova Zelândia',
    'Países Baixos',
    'Panamá',
    'Paraguai',
    'PSG',
    'Portugal',
    'Qatar',
    'República Democrática do Congo',
    'República Tcheca',
    'Senegal',
    'Suécia',
    'Suíça',
    'Tunísia',
    'Turquia',
    'Uruguai',
    'Uzbequistão',
  ].map((nome, index) => ({
    id: index + 1,
    nome,
    codigo: null,
    escudo: null,
    criado_em: new Date(),
  }));

  const palpites = [];
  const usuarioConquistas = [];

  function byDate(a, b) {
    return new Date(a.data_jogo) - new Date(b.data_jogo);
  }

  function publicUser(user) {
    const { senha_hash, ...rest } = user;
    return rest;
  }

  function approvedBetsForGame(jogoId) {
    return palpites.filter((p) => p.jogo_id === Number(jogoId) && p.status_aposta === 'aprovado');
  }

  function isValidatedGame(jogoId) {
    return new Set(approvedBetsForGame(jogoId).map((p) => p.usuario_id)).size >= 5;
  }

  function maxPointsForGame(jogoId) {
    return Math.max(0, ...approvedBetsForGame(jogoId).map((p) => Number(p.pontos || 0)));
  }

  const memoryPool = {
    async getConnection() {
      return {
        async query(sql, params = []) {
          const normalized = sql.replace(/\s+/g, ' ').trim();

          if (normalized.startsWith('ALTER TABLE palpites ADD COLUMN IF NOT EXISTS motivo_reprovacao')) {
            return { affectedRows: 0 };
          }

          if (normalized.startsWith('CREATE TABLE IF NOT EXISTS times')) {
            return { affectedRows: 0 };
          }

          if (normalized.startsWith('SELECT id FROM times WHERE LOWER(nome) = LOWER(?)')) {
            const nome = String(params[0] || '').toLowerCase();
            return times.filter((time) => time.nome.toLowerCase() === nome).map((time) => ({ id: time.id }));
          }

          if (normalized.startsWith('SELECT id, nome, codigo, escudo, criado_em FROM times ORDER BY nome ASC')) {
            return [...times].sort((a, b) => a.nome.localeCompare(b.nome));
          }

          if (normalized.startsWith('SELECT nome, codigo, escudo FROM times WHERE nome IN')) {
            const nomes = params.map((nome) => String(nome).toLowerCase());
            return times
              .filter((time) => nomes.includes(time.nome.toLowerCase()))
              .map((time) => ({ nome: time.nome, codigo: time.codigo, escudo: time.escudo }));
          }

          if (normalized.startsWith('SELECT id, nome, codigo, escudo FROM times WHERE id = ?')) {
            return times
              .filter((time) => time.id === Number(params[0]))
              .map((time) => ({ id: time.id, nome: time.nome, codigo: time.codigo, escudo: time.escudo }));
          }

          if (normalized.startsWith('INSERT INTO times')) {
            const nome = String(params[0] || '').trim();
            const existente = times.find((time) => time.nome.toLowerCase() === nome.toLowerCase());
            if (existente || !nome) return { affectedRows: 0 };
            times.push({
              id: nextTimeId++,
              nome,
              codigo: params[1] || null,
              escudo: params[2] || null,
              criado_em: new Date(),
            });
            return { affectedRows: 1 };
          }

          if (normalized.startsWith('UPDATE times SET nome = ?, codigo = ?, escudo = ? WHERE id = ?')) {
            const time = times.find((item) => item.id === Number(params[3]));
            if (time) {
              time.nome = params[0];
              time.codigo = params[1] || null;
              time.escudo = params[2] || null;
            }
            return { affectedRows: time ? 1 : 0 };
          }

          if (normalized.startsWith('DELETE FROM times WHERE id = ?')) {
            const index = times.findIndex((time) => time.id === Number(params[0]));
            if (index === -1) return { affectedRows: 0 };
            times.splice(index, 1);
            return { affectedRows: 1 };
          }

          if (normalized.startsWith('SELECT id FROM usuarios WHERE email = ?')) {
            return usuarios.filter((u) => u.email === params[0]).map((u) => ({ id: u.id }));
          }

          if (normalized.startsWith('SELECT * FROM usuarios WHERE email = ?')) {
            return usuarios.filter((u) => u.email === params[0]);
          }

          if (normalized.startsWith('INSERT INTO usuarios')) {
            const cadastroCompleto = params.length >= 9;
            usuarios.push({
              id: nextUserId++,
              nome: params[0],
              nome_exibicao: cadastroCompleto ? params[1] : params[0],
              email: cadastroCompleto ? params[2] : params[1],
              senha_hash: cadastroCompleto ? params[3] : params[2],
              tipo: cadastroCompleto ? params[4] : params[3],
              status_pagamento: cadastroCompleto ? params[5] : params[4],
              whatsapp: cadastroCompleto ? params[6] : null,
              pix_chave: null,
              avatar: cadastroCompleto ? params[7] : null,
              avatar_face: 'messi.png',
              titulo_ativo: null,
              emoji_ativo: null,
              moldura: null,
              aura: null,
              efeito_nome: null,
              termos_aceitos: cadastroCompleto ? Number(params[8]) : 0,
              email_verified: 0,
              criado_em: new Date(),
            });
            return { affectedRows: 1 };
          }

          if (normalized.startsWith('SELECT status_pagamento FROM usuarios WHERE id = ?')) {
            return usuarios
              .filter((u) => u.id === Number(params[0]))
              .map((u) => ({ status_pagamento: u.status_pagamento }));
          }

          if (normalized.startsWith('SELECT * FROM usuario_conquistas WHERE usuario_id = ?')) {
            return usuarioConquistas.filter((c) => c.usuario_id === Number(params[0]));
          }

          if (normalized.startsWith('SELECT id, nome, nome_exibicao, email, tipo, status_pagamento, whatsapp, pix_chave, avatar,')) {
            return usuarios
              .filter((u) => u.id === Number(params[0]))
              .map(publicUser);
          }

          if (normalized.startsWith('SELECT id, nome, nome_exibicao, avatar,')) {
            return usuarios
              .filter((u) => u.id === Number(params[0]))
              .map(publicUser);
          }

          if (normalized.startsWith('SELECT id, nome, email, whatsapp, tipo, status_pagamento, pix_chave, criado_em FROM usuarios')) {
            return [...usuarios].sort((a, b) => b.criado_em - a.criado_em).map(publicUser);
          }

          if (normalized.startsWith('SELECT id, nome, nome_exibicao, email, tipo, status_pagamento, criado_em, titulo_ativo, emoji_ativo, moldura, aura, efeito_nome, avatar')) {
            return [...usuarios].sort((a, b) => b.criado_em - a.criado_em).map((u) => ({
              id: u.id,
              nome: u.nome,
              nome_exibicao: u.nome_exibicao,
              email: u.email,
              tipo: u.tipo,
              status_pagamento: u.status_pagamento,
              criado_em: u.criado_em,
              titulo_ativo: u.titulo_ativo,
              emoji_ativo: u.emoji_ativo,
              moldura: u.moldura,
              aura: u.aura,
              efeito_nome: u.efeito_nome,
              avatar: u.avatar,
              avatar_face: u.avatar_face,
            }));
          }

          if (normalized.startsWith('UPDATE usuarios SET status_pagamento = ?')) {
            const user = usuarios.find((u) => u.id === Number(params[1]) && u.tipo === 'user');
            if (user) user.status_pagamento = params[0];
            return { affectedRows: user ? 1 : 0 };
          }

          if (normalized.startsWith('UPDATE usuarios SET titulo_ativo = ?, emoji_ativo = ?')) {
            const user = usuarios.find((u) => u.id === Number(params[5]));
            if (user) {
              user.titulo_ativo = params[0];
              user.emoji_ativo = params[1];
              user.moldura = params[2];
              user.aura = params[3];
              user.efeito_nome = params[4];
            }
            return { affectedRows: user ? 1 : 0 };
          }

          if (normalized.startsWith('UPDATE usuarios SET nome_exibicao = ?')) {
            const user = usuarios.find((u) => u.id === Number(params[5] ?? params[16] ?? params[4]));
            if (user) {
              user.nome_exibicao = params[0];
              user.whatsapp = params[1];
              user.pix_chave = params[2];
              user.avatar = params[3];
              if (normalized.includes('avatar_face = ?')) {
                user.avatar_face = params[4];
              } else if (params.length > 5) {
                user.avatar_face = params[4] || user.avatar_face;
              }
            }
            return { affectedRows: user ? 1 : 0 };
          }

          if (normalized.startsWith('SELECT * FROM jogos WHERE liberado_palpite = 1')) {
            return jogos
              .filter((j) => j.liberado_palpite === 1 && ['aberto', 'fechado'].includes(j.status))
              .sort(byDate);
          }

          if (normalized.startsWith('SELECT * FROM jogos WHERE id = ? AND liberado_palpite = 1')) {
            return jogos.filter((j) => j.id === Number(params[0]) && j.liberado_palpite === 1);
          }

          if (normalized.startsWith('SELECT * FROM jogos WHERE id = ? AND status = "finalizado"')) {
            return jogos.filter((j) => j.id === Number(params[0]) && j.status === 'finalizado');
          }

          if (normalized.startsWith('SELECT * FROM jogos WHERE id = ?')) {
            return jogos.filter((j) => j.id === Number(params[0]));
          }

          if (normalized.startsWith('SELECT * FROM jogos ORDER BY data_jogo ASC')) {
            return [...jogos].sort(byDate);
          }

          if (normalized.startsWith('SELECT * FROM jogos WHERE fase IN')) {
            const fases = ['16_avos', 'oitavas', 'quartas', 'semifinal', 'final'];
            return [...jogos]
              .filter((j) => fases.includes(j.fase))
              .sort((a, b) => fases.indexOf(a.fase) - fases.indexOf(b.fase) || byDate(a, b));
          }

          if (normalized.startsWith('INSERT INTO jogos')) {
            const extendedInsert = normalized.includes('codigo_casa') && params.length >= 8;
            jogos.push({
              id: nextGameId++,
              time_casa: params[0],
              time_fora: params[1],
              data_jogo: params[2],
              fase: params[3] || 'fase_grupos',
              codigo_casa: extendedInsert ? params[4] : null,
              codigo_fora: extendedInsert ? params[5] : null,
              bandeira_casa: extendedInsert ? params[6] : null,
              bandeira_fora: extendedInsert ? params[7] : null,
              placar_casa: null,
              placar_fora: null,
              penaltis_casa: null,
              penaltis_fora: null,
              status: 'aberto',
              liberado_palpite: 0,
              premio_acumulado: 0,
              taxa_admin: 0,
              jogo_validado: 0,
              is_final: params[3] === 'final' ? 1 : 0,
              criado_em: new Date(),
            });
            return { affectedRows: 1 };
          }

          if (normalized.startsWith('UPDATE jogos SET liberado_palpite = ?')) {
            const jogo = jogos.find((j) => j.id === Number(params[1]));
            if (jogo) jogo.liberado_palpite = Number(params[0]);
            return { affectedRows: jogo ? 1 : 0 };
          }

          if (normalized.startsWith('UPDATE jogos SET time_casa = ?') || normalized.startsWith('UPDATE jogos SET time_casa = ?, time_fora = ?, data_jogo = ?, fase = ?')) {
            const jogo = jogos.find((j) => j.id === Number(params[8]));
            if (jogo) {
              jogo.time_casa = params[0];
              jogo.time_fora = params[1];
              jogo.data_jogo = params[2];
              jogo.fase = params[3] || 'fase_grupos';
              jogo.codigo_casa = params[4] || null;
              jogo.codigo_fora = params[5] || null;
              jogo.bandeira_casa = params[6] || null;
              jogo.bandeira_fora = params[7] || null;
              jogo.status = 'aberto';
              jogo.liberado_palpite = 1;
              jogo.jogo_validado = 0;
            }
            return { affectedRows: jogo ? 1 : 0 };
          }

          if (normalized.startsWith('DELETE FROM jogos WHERE id = ?')) {
            const jogoId = Number(params[0]);
            const index = jogos.findIndex((j) => j.id === jogoId);
            if (index === -1) return { affectedRows: 0 };
            jogos.splice(index, 1);
            for (let i = palpites.length - 1; i >= 0; i -= 1) {
              if (palpites[i].jogo_id === jogoId) palpites.splice(i, 1);
            }
            return { affectedRows: 1 };
          }

          if (normalized.startsWith('UPDATE jogos SET placar_casa = ?, placar_fora = ?, penaltis_casa = ?, penaltis_fora = ?')) {
            const jogo = jogos.find((j) => j.id === Number(params[4]));
            if (jogo) {
              jogo.placar_casa = Number(params[0]);
              jogo.placar_fora = Number(params[1]);
              jogo.penaltis_casa = params[2] === null || params[2] === undefined || params[2] === '' ? null : Number(params[2]);
              jogo.penaltis_fora = params[3] === null || params[3] === undefined || params[3] === '' ? null : Number(params[3]);
              jogo.status = 'finalizado';
              jogo.liberado_palpite = 0;
              jogo.jogo_validado = 0;
            }
            return { affectedRows: jogo ? 1 : 0 };
          }

          if (normalized.startsWith('UPDATE jogos SET premio_acumulado = premio_acumulado + ?')) {
            const final = jogos.find((j) => j.fase === 'final');
            if (final) {
              final.premio_acumulado = Number(final.premio_acumulado || 0) + Number(params[0] || 0);
              final.taxa_admin = Number(final.taxa_admin || 0) + Number(params[1] || 0);
            }
            return { affectedRows: final ? 1 : 0 };
          }

          if (normalized.startsWith('UPDATE jogos SET premio_acumulado = 0 WHERE id = ?')) {
            const jogo = jogos.find((j) => j.id === Number(params[0]));
            if (jogo) jogo.premio_acumulado = 0;
            return { affectedRows: jogo ? 1 : 0 };
          }

          if (normalized.startsWith('UPDATE jogos SET taxa_admin = taxa_admin + ? WHERE id = ?')) {
            const jogo = jogos.find((j) => j.id === Number(params[1]));
            if (jogo) jogo.taxa_admin = Number(jogo.taxa_admin || 0) + Number(params[0] || 0);
            return { affectedRows: jogo ? 1 : 0 };
          }

          if (normalized.startsWith('UPDATE jogos SET jogo_validado = 1')) {
            const jogo = jogos.find((j) => j.id === Number(params[0]));
            if (jogo) jogo.jogo_validado = 1;
            return { affectedRows: jogo ? 1 : 0 };
          }

          if (normalized.startsWith('INSERT INTO palpites')) {
            const usuarioId = Number(params[0]);
            const jogoId = Number(params[1]);
            const id = nextPalpiteId++;
            palpites.push({
              id,
              usuario_id: usuarioId,
              jogo_id: jogoId,
              codigo_aposta: null,
              palpite_casa: Number(params[2]),
              palpite_fora: Number(params[3]),
              status_aposta: 'pendente',
              motivo_reprovacao: null,
              pontos: 0,
              data_palpite: new Date(),
            });
            return { affectedRows: 1, insertId: id };
          }

          if (normalized.startsWith('UPDATE palpites SET codigo_aposta = ?')) {
            const palpite = palpites.find((p) => p.id === Number(params[1]));
            if (palpite) palpite.codigo_aposta = params[0];
            return { affectedRows: palpite ? 1 : 0 };
          }

          if (normalized.startsWith('SELECT p.*, j.time_casa')) {
            return palpites
              .filter((p) => p.usuario_id === Number(params[0]))
              .map((p) => ({ ...p, ...jogos.find((j) => j.id === p.jogo_id) }))
              .sort(byDate);
          }

          if (normalized.startsWith('SELECT u.nome, COALESCE(SUM(p.pontos),0) AS pontos')) {
            return usuarios
              .filter((u) => u.tipo === 'user')
              .map((u) => {
                const validBets = palpites.filter((p) => {
                  const jogo = jogos.find((j) => j.id === p.jogo_id);
                  return p.usuario_id === u.id && p.status_aposta === 'aprovado' && jogo?.status === 'finalizado' && isValidatedGame(p.jogo_id);
                });
                const acertos = validBets.filter((p) => p.pontos > 0).length;
                const conquistas = validBets.filter((p) => p.pontos > 0 && p.pontos === maxPointsForGame(p.jogo_id)).length;
                return {
                  nome: u.nome,
                  pontos: validBets.reduce((sum, p) => sum + p.pontos, 0),
                  apostas: validBets.length,
                  acertos,
                  conquistas,
                };
              })
              .sort((a, b) => b.conquistas - a.conquistas || b.acertos - a.acertos || b.apostas - a.apostas || b.pontos - a.pontos || a.nome.localeCompare(b.nome));
          }

          if (normalized.startsWith('SELECT p.*, u.nome, u.email, u.status_pagamento')) {
            return palpites
              .map((p) => {
                const user = usuarios.find((u) => u.id === p.usuario_id);
                const jogo = jogos.find((j) => j.id === p.jogo_id);
                return {
                  ...p,
                  nome: user?.nome,
                  email: user?.email,
                  status_pagamento: user?.status_pagamento,
                  time_casa: jogo?.time_casa,
                  time_fora: jogo?.time_fora,
                  data_jogo: jogo?.data_jogo,
                  status_jogo: jogo?.status,
                  jogo_validado: jogo?.jogo_validado,
                };
              })
              .sort((a, b) => new Date(b.data_palpite) - new Date(a.data_palpite));
          }

          if (normalized.startsWith('UPDATE palpites SET status_aposta = ?')) {
            const palpite = palpites.find((p) => p.id === Number(params[1]));
            if (palpite) palpite.status_aposta = params[0];
            return { affectedRows: palpite ? 1 : 0 };
          }

          if (normalized.startsWith('UPDATE palpites SET motivo_reprovacao = ?')) {
            const palpite = palpites.find((p) => p.id === Number(params[1]));
            if (palpite) palpite.motivo_reprovacao = params[0] || null;
            return { affectedRows: palpite ? 1 : 0 };
          }

          if (normalized.startsWith('SELECT motivo_reprovacao FROM palpites WHERE id = ?')) {
            return palpites
              .filter((p) => p.id === Number(params[0]))
              .map((p) => ({ motivo_reprovacao: p.motivo_reprovacao || null }));
          }

          if (normalized.startsWith('SELECT p.*, u.status_pagamento')) {
            return palpites
              .filter((p) => p.id === Number(params[0]))
              .map((p) => {
                const user = usuarios.find((u) => u.id === p.usuario_id);
                return { ...p, status_pagamento: user?.status_pagamento };
              });
          }

          if (normalized.startsWith('SELECT p.*, u.nome, u.nome_exibicao')) {
            return palpites
              .filter((p) => p.status_aposta === 'aprovado' && p.pontos > 0 && isValidatedGame(p.jogo_id) && p.pontos === maxPointsForGame(p.jogo_id))
              .map((p) => {
                const user = usuarios.find((u) => u.id === p.usuario_id);
                const jogo = jogos.find((j) => j.id === p.jogo_id);
                return {
                  ...p,
                  nome: user?.nome,
                  nome_exibicao: user?.nome_exibicao,
                  avatar: user?.avatar,
                  avatar_face: user?.avatar_face,
                  titulo_ativo: user?.titulo_ativo,
                  emoji_ativo: user?.emoji_ativo,
                  moldura: user?.moldura,
                  aura: user?.aura,
                  efeito_nome: user?.efeito_nome,
                  time_casa: jogo?.time_casa,
                  time_fora: jogo?.time_fora,
                  placar_casa: jogo?.placar_casa,
                  placar_fora: jogo?.placar_fora,
                  status: jogo?.status,
                };
              })
              .filter((row) => row.status === 'finalizado')
              .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome));
          }

          if (normalized.startsWith('SELECT * FROM palpites WHERE jogo_id = ?')) {
            const rows = palpites.filter((p) => p.jogo_id === Number(params[0]));
            if (normalized.includes('status_aposta = "aprovado"')) {
              return rows.filter((p) => p.status_aposta === 'aprovado');
            }
            return rows;
          }

          if (normalized.startsWith('SELECT p.id, p.usuario_id, p.codigo_aposta')) {
            return palpites
              .filter((p) => p.jogo_id === Number(params[0]))
              .map((p) => {
                const user = usuarios.find((u) => u.id === p.usuario_id);
                return {
                  id: p.id,
                  usuario_id: p.usuario_id,
                  codigo_aposta: p.codigo_aposta,
                  palpite_casa: p.palpite_casa,
                  palpite_fora: p.palpite_fora,
                  status_aposta: p.status_aposta,
                  motivo_reprovacao: p.motivo_reprovacao,
                  pontos: p.pontos,
                  data_palpite: p.data_palpite,
                  nome: user?.nome,
                  nome_exibicao: user?.nome_exibicao,
                };
              })
              .sort((a, b) => String(a.codigo_aposta || '').localeCompare(String(b.codigo_aposta || '')) || a.id - b.id);
          }

          if (normalized.startsWith('UPDATE palpites SET pontos = ?')) {
            const palpite = palpites.find((p) => p.id === Number(params[1]));
            if (palpite) palpite.pontos = Number(params[0]);
            return { affectedRows: palpite ? 1 : 0 };
          }

          if (normalized.startsWith('INSERT INTO usuario_conquistas')) {
            const usuarioId = Number(params[0]);
            const conquistaId = Number(params[1]);
            const registro = usuarioConquistas.find((c) => c.usuario_id === usuarioId && c.conquista_id === conquistaId);
            if (registro) {
              registro.progresso = Number(params[2] || 0);
              if (!registro.desbloqueada_em && params[3]) registro.desbloqueada_em = params[3];
              registro.exibida = 1;
            } else {
              usuarioConquistas.push({
                id: usuarioConquistas.length + 1,
                usuario_id: usuarioId,
                conquista_id: conquistaId,
                progresso: Number(params[2] || 0),
                desbloqueada_em: params[3] || null,
                equipada: 0,
                exibida: 1,
              });
            }
            return { affectedRows: 1 };
          }

          throw new Error(`Consulta não suportada no banco em memória: ${normalized}`);
        },
        release() {},
      };
    },
  };

  console.log('Usando banco em memória. Acesso administrativo: admin@bolao.com / admin123');
  module.exports = memoryPool;
  return;
}

const pgConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 5432),
  };

if (!process.env.DATABASE_URL) {
  const missing = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Configuracao do banco incompleta. Variaveis faltando: ${missing.join(', ')}`);
  }
}

if (process.env.DB_SSL === 'true' || process.env.DATABASE_URL) {
  pgConfig.ssl = { rejectUnauthorized: false };
}

const pgPool = new Pool({
  ...pgConfig,
  max: 5,
  connectionTimeoutMillis: 10000,
});

function getDatabaseDiagnostics() {
  const required = process.env.DATABASE_URL
    ? []
    : ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter((key) => !process.env[key]);

  return {
    useMemoryDb: process.env.USE_MEMORY_DB === 'true',
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    dbHost: process.env.DB_HOST ? 'configurado' : 'faltando',
    dbPort: process.env.DB_PORT || '5432',
    dbUser: process.env.DB_USER ? 'configurado' : 'faltando',
    dbPassword: process.env.DB_PASSWORD ? 'configurado' : 'faltando',
    dbName: process.env.DB_NAME ? 'configurado' : 'faltando',
    dbSsl: process.env.DB_SSL === 'true' || Boolean(process.env.DATABASE_URL),
    missing: required,
  };
}

module.exports = {
  diagnostics: getDatabaseDiagnostics,
  async getConnection() {
    const client = await pgPool.connect();
    return {
      async query(sql, params = []) {
        return decorateResult(await client.query(normalizeSql(sql), params));
      },
      release() {
        client.release();
      },
    };
  },
};
