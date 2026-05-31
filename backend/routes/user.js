const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { auth } = require('../middleware/auth');
const { CONQUISTAS, avaliarConquistas, metricasConquistas } = require('../services/conquistas');
const { codigoApostaPorSequencia } = require('../services/codigosAposta');

const router = express.Router();

const AVATAR_FIELDS = ['avatar_face'];

const AVATAR_DEFAULTS = {
  avatar_face: 'messi.png',
};

function listarAvatarFaces() {
  const facesDir = path.join(__dirname, '../../frontend/static/avatar/faces');
  try {
    return fs.readdirSync(facesDir)
      .filter((file) => /^[^/\\]+\.png$/i.test(file))
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  } catch {
    return [];
  }
}

function avatarPayload(usuario) {
  const faces = listarAvatarFaces();
  const fallback = faces.includes(AVATAR_DEFAULTS.avatar_face) ? AVATAR_DEFAULTS.avatar_face : (faces[0] || AVATAR_DEFAULTS.avatar_face);
  return AVATAR_FIELDS.reduce((acc, field) => {
    acc[field] = faces.includes(usuario[field]) ? usuario[field] : fallback;
    return acc;
  }, {});
}

function normalizarTimeChave(time) {
  return String(time || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function timesJogoChave(jogo) {
  if (!jogo) return [];
  return [normalizarTimeChave(jogo.time_casa), normalizarTimeChave(jogo.time_fora)].filter(Boolean);
}

function pontuarCorrespondencia(jogo, origem) {
  const origemTimes = new Set(origem.flatMap(timesJogoChave));
  return timesJogoChave(jogo).filter((time) => origemTimes.has(time)).length;
}

function organizarRodadaPorOrigem(origem, jogos, slots) {
  const usados = new Set();
  const resultado = Array(slots).fill(null);
  const temOrigem = origem.some(Boolean);

  if (!temOrigem) {
    for (let slot = 0; slot < slots; slot += 1) {
      const jogo = jogos[slot];
      if (!jogo) break;
      resultado[slot] = {
        ...jogo,
        chaveamento_valido: false,
        chaveamento_erro: 'Cadastre os jogos da fase anterior para validar este slot.',
      };
    }
    return resultado;
  }

  for (let slot = 0; slot < slots; slot += 1) {
    const origemSlot = origem.slice(slot * 2, slot * 2 + 2).filter(Boolean);
    if (!origemSlot.length) continue;

    let escolhido = null;
    let melhorPontuacao = 0;
    for (const jogo of jogos) {
      if (usados.has(jogo.id)) continue;
      const pontuacao = pontuarCorrespondencia(jogo, origemSlot);
      if (pontuacao > melhorPontuacao) {
        escolhido = jogo;
        melhorPontuacao = pontuacao;
      }
    }

    if (escolhido) {
      usados.add(escolhido.id);
      resultado[slot] = { ...escolhido, chaveamento_valido: true };
    }
  }

  for (let slot = 0; slot < slots; slot += 1) {
    if (resultado[slot]) continue;
    const fallback = jogos.find((jogo) => !usados.has(jogo.id));
    if (!fallback) break;
    usados.add(fallback.id);
    resultado[slot] = {
      ...fallback,
      chaveamento_valido: false,
      chaveamento_erro: 'Este jogo não corresponde aos times que alimentam este slot.',
    };
  }

  return resultado;
}

function splitBracket(jogos) {
  const porFase = (fase) => jogos.filter((j) => j.fase === fase);
  const jogos16 = porFase('16_avos');
  const oitavas = porFase('oitavas');
  const quartas = porFase('quartas');
  const semi = porFase('semifinal');
  const left16 = jogos16.slice(0, 8);
  const right16 = jogos16.slice(8, 16);
  const leftOitavas = organizarRodadaPorOrigem(left16, oitavas, 4);
  const rightOitavas = organizarRodadaPorOrigem(right16, oitavas.filter((jogo) => !leftOitavas.some((slot) => slot?.id === jogo.id)), 4);
  const leftQuartas = organizarRodadaPorOrigem(leftOitavas, quartas, 2);
  const rightQuartas = organizarRodadaPorOrigem(rightOitavas, quartas.filter((jogo) => !leftQuartas.some((slot) => slot?.id === jogo.id)), 2);
  const leftSemi = organizarRodadaPorOrigem(leftQuartas, semi, 1);
  const rightSemi = organizarRodadaPorOrigem(rightQuartas, semi.filter((jogo) => !leftSemi.some((slot) => slot?.id === jogo.id)), 1);

  return {
    left_16: left16,
    right_16: right16,
    left_oitavas: leftOitavas,
    right_oitavas: rightOitavas,
    left_quartas: leftQuartas,
    right_quartas: rightQuartas,
    left_semi: leftSemi,
    right_semi: rightSemi,
    final: porFase('final')[0] || null,
  };
}

async function premiosAcumulados(conn, jogosCache = null) {
  const jogos = jogosCache || await conn.query('SELECT * FROM jogos ORDER BY data_jogo ASC');
  const final = jogos.find((jogo) => jogo.fase === 'final');
  return {
    final: Number(final?.premio_acumulado || 0),
    ranking: Number(final?.taxa_admin || 0),
  };
}

function normalizarConquista(conquista, metricas) {
  return {
    ...conquista,
    conquista_id: conquista.id,
    grau: String(conquista.grau || conquista.raridade || 'comum').toLowerCase(),
    raridade: String(conquista.grau || conquista.raridade || 'comum').toLowerCase(),
    meta: conquista.meta || conquista.valor || 1,
    progresso: conquista.progresso || 0,
    equipada: false,
    exibida: true,
  };
}

function conquistasAdmin() {
  return CONQUISTAS.map((conquista) => normalizarConquista({
    ...conquista,
    meta: conquista.valor,
    progresso: conquista.valor,
    desbloqueada: true,
  }));
}

function dataJogoMs(dataJogo) {
  if (!dataJogo) return 0;
  if (dataJogo instanceof Date) return dataJogo.getTime();
  return new Date(String(dataJogo).replace(' ', 'T')).getTime();
}

function apostasEncerradas(jogo) {
  const limiteApostas = dataJogoMs(jogo.data_jogo) - (10 * 60 * 1000);
  return Date.now() >= limiteApostas;
}

function doisDigitos(valor) {
  return String(valor).padStart(2, '0');
}

function formatarDataHoraLocal(valor) {
  if (!(valor instanceof Date)) return valor;
  return [
    valor.getFullYear(),
    doisDigitos(valor.getMonth() + 1),
    doisDigitos(valor.getDate()),
  ].join('-') + ` ${doisDigitos(valor.getHours())}:${doisDigitos(valor.getMinutes())}:${doisDigitos(valor.getSeconds())}`;
}

function serializarJogoData(row) {
  return row?.data_jogo ? { ...row, data_jogo: formatarDataHoraLocal(row.data_jogo) } : row;
}

function jogoComStatusApostas(jogo) {
  const encerradas = apostasEncerradas(jogo);
  return {
    ...jogo,
    apostas_encerradas: encerradas,
    aberto_para_apostas: Boolean(jogo.liberado_palpite) && ['aberto', 'fechado'].includes(jogo.status) && !encerradas,
  };
}

function palpiteVencedor(jogo, palpite) {
  return jogo.status === 'finalizado'
    && Number(jogo.jogo_validado || 0) === 1
    && palpite.status_aposta === 'aprovado'
    && Number(palpite.pontos || 0) > 0;
}

async function garantirMotivoReprovacao(conn) {
  try {
    await conn.query('ALTER TABLE palpites ADD COLUMN IF NOT EXISTS motivo_reprovacao TEXT NULL');
  } catch (error) {
    if (!/already exists|duplicate column/i.test(error.message || '')) {
      throw error;
    }
  }
}

function estatisticasPalpitesJogo(palpites) {
  const total = palpites.length;
  const casa = palpites.filter((p) => Number(p.palpite_casa) > Number(p.palpite_fora)).length;
  const empate = palpites.filter((p) => Number(p.palpite_casa) === Number(p.palpite_fora)).length;
  const fora = palpites.filter((p) => Number(p.palpite_casa) < Number(p.palpite_fora)).length;
  const percentual = (valor) => total ? Math.round((valor / total) * 100) : 0;

  return {
    total_palpites: total,
    valor_total_palpites: total * 5,
    premio_previsto: total * 5 * 0.8,
    taxa_plataforma: total * 5 * 0.2,
    termometro: {
      casa: percentual(casa),
      empate: percentual(empate),
      fora: percentual(fora),
    },
  };
}

async function enriquecerJogo(conn, jogo) {
  const palpites = await conn.query('SELECT * FROM palpites WHERE jogo_id = ? AND status_aposta = "aprovado"', [jogo.id]);
  const times = await conn.query('SELECT nome, codigo, escudo FROM times WHERE nome IN (?, ?)', [jogo.time_casa, jogo.time_fora]).catch(() => []);
  const timeCasaInfo = times.find((time) => String(time.nome).toLowerCase() === String(jogo.time_casa).toLowerCase());
  const timeForaInfo = times.find((time) => String(time.nome).toLowerCase() === String(jogo.time_fora).toLowerCase());
  return {
    ...serializarJogoData(jogoComStatusApostas(jogo)),
    codigo_casa: jogo.codigo_casa || timeCasaInfo?.codigo || null,
    codigo_fora: jogo.codigo_fora || timeForaInfo?.codigo || null,
    escudo_casa: jogo.bandeira_casa || timeCasaInfo?.escudo || null,
    escudo_fora: jogo.bandeira_fora || timeForaInfo?.escudo || null,
    estatisticas: estatisticasPalpitesJogo(palpites),
  };
}

router.get('/avatar-faces', auth, async (_req, res) => {
  const faces = listarAvatarFaces();
  const padrao = faces.includes(AVATAR_DEFAULTS.avatar_face) ? AVATAR_DEFAULTS.avatar_face : (faces[0] || AVATAR_DEFAULTS.avatar_face);
  res.json({ faces, padrao });
});

router.get('/me', auth, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT id, nome, nome_exibicao, email, tipo, status_pagamento, whatsapp, pix_chave, avatar,
        avatar_face,
        titulo_ativo, emoji_ativo, moldura, aura, efeito_nome
       FROM usuarios WHERE id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const usuario = rows[0];
    let conquistasRecentes = [];
    let raridadeMaxima = null;
    if (req.user.tipo === 'admin') {
      const desbloqueadasAdmin = conquistasAdmin();
      conquistasRecentes = desbloqueadasAdmin.slice(-3).reverse().map((conquista) => ({
        nome: conquista.nome,
        grau: conquista.grau,
        emoji: conquista.emoji,
      }));
      raridadeMaxima = 'mitico';
    } else {
    try {
      const conquistasRows = await conn.query(
        `SELECT c.nome, c.grau
         FROM usuario_conquistas uc
         INNER JOIN conquistas c ON c.id = uc.conquista_id
         WHERE uc.usuario_id = ? AND uc.desbloqueada_em IS NOT NULL
         ORDER BY uc.desbloqueada_em DESC
         LIMIT 3`,
        [usuario.id]
      );
      conquistasRecentes = conquistasRows;
      const graus = ['comum', 'raro', 'epico', 'lendario', 'mitico'];
      for (let i = graus.length - 1; i >= 0; i -= 1) {
        if (conquistasRows.some((row) => String(row.grau || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === graus[i])) {
          raridadeMaxima = String(graus[i]).toLowerCase();
          break;
        }
      }
    } catch (e) {
      raridadeMaxima = null;
      conquistasRecentes = [];
    }
    }

    res.json({
      id: Number(usuario.id),
      nome: usuario.nome,
      nome_exibicao: usuario.nome_exibicao || usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
      pagamento: usuario.status_pagamento,
      whatsapp: usuario.whatsapp || null,
      pix_chave: usuario.pix_chave || null,
      avatar: usuario.avatar || null,
      ...avatarPayload(usuario),
      titulo_ativo: usuario.titulo_ativo || null,
      emoji_ativo: usuario.emoji_ativo || null,
      moldura: usuario.moldura || null,
      aura: usuario.aura || null,
      efeito_nome: usuario.efeito_nome || null,
      conquistas_recentes: conquistasRecentes,
      raridade_maxima: raridadeMaxima,
    });
  } catch {
    res.status(500).json({ message: 'Erro ao buscar usuário.' });
  } finally { if (conn) conn.release(); }
});

router.put('/perfil', auth, async (req, res) => {
  const {
    nome_exibicao,
    whatsapp = null,
    pix_chave = null,
    avatar = null,
    avatar_face = AVATAR_DEFAULTS.avatar_face,
  } = req.body;
  if (!nome_exibicao) return res.status(400).json({ message: 'Informe o nome de exibição.' });

  let conn;
  try {
    conn = await pool.getConnection();
    const faces = listarAvatarFaces();
    const avatarFaceSeguro = faces.includes(avatar_face)
      ? avatar_face
      : (faces.includes(AVATAR_DEFAULTS.avatar_face) ? AVATAR_DEFAULTS.avatar_face : (faces[0] || AVATAR_DEFAULTS.avatar_face));

    await conn.query(
      `UPDATE usuarios SET
        nome_exibicao = ?, whatsapp = ?, pix_chave = ?, avatar = ?,
        avatar_face = ?
       WHERE id = ?`,
      [
        nome_exibicao, whatsapp, pix_chave, avatar,
        avatarFaceSeguro,
        req.user.id,
      ]
    );
    res.json({ message: 'Perfil atualizado.' });
  } catch {
    res.status(500).json({ message: 'Erro ao atualizar perfil.' });
  } finally { if (conn) conn.release(); }
});

router.get('/conquistas', auth, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const palpites = await conn.query(`
      SELECT p.*, j.time_casa, j.time_fora, j.placar_casa, j.placar_fora, j.fase, j.status, j.data_jogo
      FROM palpites p
      INNER JOIN jogos j ON j.id = p.jogo_id
      WHERE p.usuario_id = ?
      ORDER BY p.data_palpite ASC
    `, [req.user.id]);
    const jogos = await conn.query('SELECT * FROM jogos ORDER BY data_jogo ASC');
    const metricas = metricasConquistas(palpites, jogos);
    const conquistas = req.user.tipo === 'admin'
      ? conquistasAdmin()
      : avaliarConquistas(palpites, jogos).map((conquista) => normalizarConquista(conquista, metricas));
    const perfilRows = await conn.query(
      `SELECT id, nome, nome_exibicao, avatar,
        avatar_face,
        titulo_ativo, emoji_ativo, moldura, aura, efeito_nome
       FROM usuarios WHERE id = ?`,
      [req.user.id]
    );
    const desbloqueadas = conquistas.filter(c => c.desbloqueada);
    res.json({
      perfil: perfilRows[0] ? { ...perfilRows[0], ...avatarPayload(perfilRows[0]) } : {},
      metricas,
      total_conquistas: CONQUISTAS.length,
      conquistas_desbloqueadas: desbloqueadas.length,
      conquistas,
    });
  } catch {
    res.status(500).json({ message: 'Erro ao buscar conquistas.' });
  } finally { if (conn) conn.release(); }
});

router.put('/perfil/titulo/:id', auth, async (req, res) => {
  const conquistaId = Number(req.params.id);
  let conn;
  try {
    conn = await pool.getConnection();
    const palpites = await conn.query(`
      SELECT p.*, j.time_casa, j.time_fora, j.placar_casa, j.placar_fora, j.fase, j.status, j.data_jogo
      FROM palpites p
      INNER JOIN jogos j ON j.id = p.jogo_id
      WHERE p.usuario_id = ?
      ORDER BY p.data_palpite ASC
    `, [req.user.id]);
    const jogos = await conn.query('SELECT * FROM jogos ORDER BY data_jogo ASC');
    const def = req.user.tipo === 'admin'
      ? CONQUISTAS.find((conquista) => conquista.id === conquistaId)
      : avaliarConquistas(palpites, jogos).find((conquista) => conquista.id === conquistaId);
    if (!def || (req.user.tipo !== 'admin' && !def.desbloqueada)) {
      return res.status(400).json({ message: 'Conquista bloqueada ou inexistente.' });
    }
    await conn.query(
      'UPDATE usuarios SET titulo_ativo = ?, emoji_ativo = ?, moldura = ?, aura = ?, efeito_nome = ? WHERE id = ?',
      [def.titulo, def.emoji || null, def.moldura || null, def.aura || null, def.efeito_nome || null, req.user.id]
    );
    res.json({ message: 'Titulo equipado.', conquista: def });
  } catch {
    res.status(500).json({ message: 'Erro ao equipar titulo.' });
  } finally { if (conn) conn.release(); }
});

router.get('/jogos/liberados', auth, async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const jogos = await conn.query(`
      SELECT * FROM jogos
      WHERE liberado_palpite = 1 AND status IN ('aberto','fechado')
      ORDER BY data_jogo ASC
    `);
    const enriquecidos = await Promise.all(jogos.map((jogo) => enriquecerJogo(conn, jogo)));
    res.json(enriquecidos.filter((jogo) => jogo.aberto_para_apostas));
  } catch {
    res.status(500).json({ message: 'Erro ao buscar jogos.' });
  } finally { if (conn) conn.release(); }
});

router.get('/jogos', auth, async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const jogos = await conn.query('SELECT * FROM jogos ORDER BY data_jogo ASC');
    res.json(await Promise.all(jogos.map((jogo) => enriquecerJogo(conn, jogo))));
  } catch {
    res.status(500).json({ message: 'Erro ao buscar jogos.' });
  } finally { if (conn) conn.release(); }
});

router.get('/chaveamento', auth, async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const jogos = await conn.query(`
      SELECT * FROM jogos
      WHERE fase IN ('16_avos','oitavas','quartas','semifinal','final')
      ORDER BY CASE fase
        WHEN '16_avos' THEN 1
        WHEN 'oitavas' THEN 2
        WHEN 'quartas' THEN 3
        WHEN 'semifinal' THEN 4
        WHEN 'final' THEN 5
        ELSE 6
      END, data_jogo ASC
    `);
    res.json({
      rodadas: splitBracket(jogos),
      premios: await premiosAcumulados(conn, jogos),
    });
  } catch {
    res.status(500).json({ message: 'Erro ao buscar chaveamento.' });
  } finally { if (conn) conn.release(); }
});

router.get('/premios', auth, async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    res.json(await premiosAcumulados(conn));
  } catch {
    res.status(500).json({ message: 'Erro ao buscar prêmios acumulados.' });
  } finally { if (conn) conn.release(); }
});

router.get('/jogos/:id', auth, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const jogos = await conn.query('SELECT * FROM jogos WHERE id = ?', [req.params.id]);
    if (!jogos.length) return res.status(404).json({ message: 'Jogo não encontrado.' });
    res.json(await enriquecerJogo(conn, jogos[0]));
  } catch {
    res.status(500).json({ message: 'Erro ao buscar jogo.' });
  } finally { if (conn) conn.release(); }
});

router.post('/palpites', auth, async (req, res) => {
  const { jogo_id, palpite_casa, palpite_fora } = req.body;
  let conn;
  try {
    conn = await pool.getConnection();
    const jogos = await conn.query('SELECT * FROM jogos WHERE id = ? AND liberado_palpite = 1', [jogo_id]);
    if (!jogos.length) return res.status(404).json({ message: 'Jogo não liberado.' });

    const jogo = jogos[0];
    if (apostasEncerradas(jogo)) {
      return res.status(400).json({ message: 'Apostas encerradas. O limite é de 10 minutos antes do início do jogo.' });
    }

    const result = await conn.query(`
      INSERT INTO palpites (usuario_id, jogo_id, palpite_casa, palpite_fora, status_aposta)
      VALUES (?, ?, ?, ?, "pendente")
    `, [req.user.id, jogo_id, palpite_casa, palpite_fora]);
    const palpiteId = Number(result.insertId || result.id || 0);
    const codigo = codigoApostaPorSequencia(palpiteId || Date.now());
    await conn.query('UPDATE palpites SET codigo_aposta = ? WHERE id = ?', [codigo, palpiteId]);

    res.json({ message: `Aposta ${codigo} salva com status pendente. Aguarde a aprovação do administrador.`, codigo_aposta: codigo });
  } catch {
    res.status(500).json({ message: 'Erro ao salvar palpite.' });
  } finally { if (conn) conn.release(); }
});

router.get('/transparencia', auth, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const jogos = await conn.query('SELECT * FROM jogos ORDER BY data_jogo ASC');
    const visiveis = jogos;

    const resultado = [];
    for (const jogo of visiveis) {
      const palpites = await conn.query(`
        SELECT p.id, p.usuario_id, p.codigo_aposta, p.palpite_casa, p.palpite_fora, p.status_aposta, p.pontos, p.data_palpite,
          u.nome, u.nome_exibicao
        FROM palpites p
        INNER JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.jogo_id = ?
        ORDER BY p.codigo_aposta ASC, p.id ASC
      `, [jogo.id]);
      const palpitesAprovados = palpites.filter((palpite) => palpite.status_aposta === 'aprovado');
      const vencedores = palpitesAprovados.filter((palpite) => palpiteVencedor(jogo, palpite));
      const premioBase = palpitesAprovados.length * 5 * 0.8;
      const premioTotal = Number(jogo.jogo_validado || 0) === 1 && vencedores.length
        ? premioBase + (jogo.fase === 'final' ? Number(jogo.premio_acumulado || 0) : 0)
        : 0;
      const valorRateado = vencedores.length ? premioTotal / vencedores.length : 0;

      resultado.push({
        id: jogo.id,
        time_casa: jogo.time_casa,
        time_fora: jogo.time_fora,
        data_jogo: formatarDataHoraLocal(jogo.data_jogo),
        status: jogo.status,
        jogo_validado: Number(jogo.jogo_validado || 0),
        placar_casa: jogo.placar_casa,
        placar_fora: jogo.placar_fora,
        apostas_encerradas: apostasEncerradas(jogo),
        total_palpites: palpites.length,
        total_aprovadas: palpitesAprovados.length,
        total_vencedores: vencedores.length,
        premio_total: premioTotal,
        premio_por_vencedor: valorRateado,
        palpites: palpites.map((palpite) => ({
          ...palpite,
          codigo_aposta: palpite.codigo_aposta || codigoApostaPorSequencia(palpite.id),
          nome: palpite.nome_exibicao || palpite.nome || 'Participante',
          meu: Number(palpite.usuario_id) === Number(req.user.id),
          vencedor: palpiteVencedor(jogo, palpite),
          perdedor: jogo.status === 'finalizado'
            && Number(jogo.jogo_validado || 0) === 1
            && palpite.status_aposta === 'aprovado'
            && !palpiteVencedor(jogo, palpite),
          premio: palpiteVencedor(jogo, palpite) ? valorRateado : 0,
        })),
      });
    }

    res.json({ jogos: resultado, admin: req.user.tipo === 'admin' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar transparência.' });
  } finally { if (conn) conn.release(); }
});

router.get('/meus-palpites', auth, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await garantirMotivoReprovacao(conn);
    const rows = await conn.query(`
      SELECT p.*, j.time_casa, j.time_fora, j.data_jogo, j.placar_casa, j.placar_fora, j.status,
        j.fase, j.jogo_validado, j.premio_acumulado
      FROM palpites p
      INNER JOIN jogos j ON j.id = p.jogo_id
      WHERE p.usuario_id = ?
      ORDER BY j.data_jogo ASC
    `, [req.user.id]);
    const jogosUnicos = [...new Set(rows.map((palpite) => Number(palpite.jogo_id)).filter(Boolean))];
    const premioPorJogo = new Map();

    for (const jogoId of jogosUnicos) {
      const jogoRef = rows.find((palpite) => Number(palpite.jogo_id) === jogoId);
      const aprovados = await conn.query('SELECT * FROM palpites WHERE jogo_id = ? AND status_aposta = "aprovado"', [jogoId]);
      const vencedores = aprovados.filter((palpite) => palpiteVencedor(jogoRef, palpite));
      const premioBase = aprovados.length * 5 * 0.8;
      const premioTotal = Number(jogoRef?.jogo_validado || 0) === 1 && vencedores.length
        ? premioBase + (jogoRef?.fase === 'final' ? Number(jogoRef?.premio_acumulado || 0) : 0)
        : 0;
      premioPorJogo.set(jogoId, vencedores.length ? premioTotal / vencedores.length : 0);
    }

    res.json(rows.map((palpite) => {
      const vencedor = palpiteVencedor(palpite, palpite);
      const perdedor = palpite.status === 'finalizado'
        && Number(palpite.jogo_validado || 0) === 1
        && palpite.status_aposta === 'aprovado'
        && !vencedor;
      return {
        ...palpite,
        data_jogo: formatarDataHoraLocal(palpite.data_jogo),
        vencedor,
        perdedor,
        premio: vencedor ? premioPorJogo.get(Number(palpite.jogo_id)) || 0 : 0,
      };
    }));
  } catch {
    res.status(500).json({ message: 'Erro ao buscar palpites.' });
  } finally { if (conn) conn.release(); }
});

router.get('/ranking', auth, async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const usuarios = await conn.query(`SELECT id, nome, nome_exibicao, email, tipo, status_pagamento, criado_em,
      titulo_ativo, emoji_ativo, moldura, aura, efeito_nome, avatar,
      avatar_face
      FROM usuarios ORDER BY criado_em DESC`);
    const jogos = await conn.query('SELECT * FROM jogos ORDER BY data_jogo ASC');
    const ranking = [];
    for (const usuario of usuarios.filter((u) => u.tipo === 'user')) {
      const palpites = await conn.query(`
        SELECT p.*, j.time_casa, j.time_fora, j.placar_casa, j.placar_fora, j.fase, j.status, j.data_jogo
        FROM palpites p
        INNER JOIN jogos j ON j.id = p.jogo_id
        WHERE p.usuario_id = ?
        ORDER BY p.data_palpite ASC
      `, [usuario.id]);
      const metricas = metricasConquistas(palpites, jogos);
      const conquistasDesbloqueadas = avaliarConquistas(palpites, jogos)
        .filter((conquista) => conquista.desbloqueada)
        .map((conquista) => normalizarConquista(conquista, metricas));
      const conquistas = conquistasDesbloqueadas.length;
      const conquistas_recentes = conquistasDesbloqueadas.slice(0, 3).map((conquista) => ({
        nome: conquista.nome,
        grau: conquista.grau,
        emoji: conquista.emoji,
      }));
      const raridades = ['comum', 'raro', 'epico', 'lendario', 'mitico'];
      let raridade_maxima = 'comum';
      for (const raridade of raridades.slice().reverse()) {
        if (conquistasDesbloqueadas.some((conquista) => conquista.grau === raridade)) {
          raridade_maxima = raridade;
          break;
        }
      }
      const palpitesAprovados = palpites.filter((p) => p.status_aposta === 'aprovado');
      const apostas = palpitesAprovados.length;
      const acertos = palpitesAprovados.filter(p => Number(p.pontos || 0) > 0).length;
      const taxa_acerto = apostas ? Math.round((acertos / apostas) * 1000) / 10 : 0;
      const pontos = palpitesAprovados.reduce((sum, p) => sum + Number(p.pontos || 0), 0);
      ranking.push({
        nome: usuario.nome_exibicao || usuario.nome,
        avatar: usuario.avatar,
        pontos,
        apostas,
        acertos,
        taxa_acerto,
        conquistas,
        conquistas_recentes,
        raridade_maxima,
        titulo_ativo: usuario.titulo_ativo,
        emoji_ativo: usuario.emoji_ativo,
        moldura: usuario.moldura,
        aura: usuario.aura,
        efeito_nome: usuario.efeito_nome,
        ...avatarPayload(usuario)
      });
    }
    ranking.sort((a, b) => b.conquistas - a.conquistas || b.taxa_acerto - a.taxa_acerto || b.apostas - a.apostas || a.nome.localeCompare(b.nome));
    res.json(ranking);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar ranking.' });
  } finally { if (conn) conn.release(); }
});

router.get('/vencedores', auth, async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT p.*, u.nome, u.nome_exibicao, u.avatar, u.avatar_face, u.titulo_ativo, u.emoji_ativo, u.moldura, u.aura, u.efeito_nome,
        j.time_casa, j.time_fora, j.placar_casa, j.placar_fora, j.status
      FROM palpites p
      INNER JOIN usuarios u ON u.id = p.usuario_id
      INNER JOIN jogos j ON j.id = p.jogo_id
      WHERE p.status_aposta = "aprovado"
        AND j.status = "finalizado"
        AND p.pontos > 0
        AND p.pontos = (
          SELECT MAX(p2.pontos)
          FROM palpites p2
          WHERE p2.jogo_id = p.jogo_id AND p2.status_aposta = "aprovado"
        )
        AND (
          SELECT COUNT(DISTINCT p3.usuario_id)
          FROM palpites p3
          WHERE p3.jogo_id = p.jogo_id AND p3.status_aposta = "aprovado"
        ) >= 5
      ORDER BY p.pontos DESC, u.nome ASC
    `);
    res.json(rows);
  } catch {
    res.status(500).json({ message: 'Erro ao buscar vencedores.' });
  } finally { if (conn) conn.release(); }
});

module.exports = router;
