const express = require('express');
const pool = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');
const { calcularPontos } = require('../services/pontuacao');
const fifaService = require('../services/fifa');
const fs = require('fs');
const path = require('path');

const router = express.Router();
router.use(auth, adminOnly);

const ESCUDOS_DIR = path.join(__dirname, '../../frontend/assets/times');
const FIFA_BASE_URL = process.env.FIFA_BASE_URL || 'https://api.fifa.com/api/v3';
const FIFA_WORLD_CUP_COMPETITION_ID = process.env.FIFA_WORLD_CUP_COMPETITION_ID || '17';
const FIFA_WORLD_CUP_SEASON_ID = process.env.FIFA_WORLD_CUP_SEASON_ID || '285023';
const FIFA_WORLD_CUP_FROM = process.env.FIFA_WORLD_CUP_FROM || '2026-06-01';
const FIFA_WORLD_CUP_TO = process.env.FIFA_WORLD_CUP_TO || '2026-07-31';

const TIMES_PADRAO = [
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
];

async function garantirMotivoReprovacao(conn) {
  try {
    await conn.query('ALTER TABLE palpites ADD COLUMN IF NOT EXISTS motivo_reprovacao TEXT NULL');
  } catch (error) {
    if (!/already exists|duplicate column/i.test(error.message || '')) {
      throw error;
    }
  }
}

async function garantirApiJogoId(conn) {
  await fifaService.garantirApiJogoId(conn);
}

async function garantirTimes(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS times (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(80) NOT NULL UNIQUE,
      codigo VARCHAR(10) NULL,
      escudo VARCHAR(255) NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const nome of TIMES_PADRAO) {
    const existente = await conn.query('SELECT id FROM times WHERE LOWER(nome) = LOWER(?)', [nome]);
    if (!existente.length) {
      await conn.query('INSERT INTO times (nome) VALUES (?)', [nome]);
    }
  }
}

function slugTime(nome) {
  return String(nome || 'time')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'time';
}

function salvarEscudoPng(nome, escudoPng) {
  if (!escudoPng) return null;
  const match = String(escudoPng).match(/^data:image\/png;base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) {
    const error = new Error('Envie um arquivo PNG válido para o escudo.');
    error.statusCode = 400;
    throw error;
  }

  const buffer = Buffer.from(match[1], 'base64');
  if (buffer.length > 2 * 1024 * 1024) {
    const error = new Error('O PNG do escudo deve ter no máximo 2 MB.');
    error.statusCode = 400;
    throw error;
  }

  fs.mkdirSync(ESCUDOS_DIR, { recursive: true });
  const filename = `${slugTime(nome)}-${Date.now()}.png`;
  fs.writeFileSync(path.join(ESCUDOS_DIR, filename), buffer);
  return `/assets/times/${filename}`;
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

function dataHoraSaoPaulo(valor) {
  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function textoLocalizado(lista, fallback = '') {
  if (!Array.isArray(lista)) return fallback;
  return lista.find((item) => item.Locale === 'pt-BR')?.Description
    || lista.find((item) => item.Locale === 'en-GB')?.Description
    || lista[0]?.Description
    || fallback;
}

function fasePorFifa(stageName = '') {
  const texto = String(stageName).toLowerCase();
  if (texto.includes('final') && !texto.includes('semi')) return 'final';
  if (texto.includes('semi')) return 'semifinal';
  if (texto.includes('quarta') || texto.includes('quarter')) return 'quartas';
  if (texto.includes('oitava') || texto.includes('round of 16')) return 'oitavas';
  if (texto.includes('32')) return '16_avos';
  return 'fase_grupos';
}

function statusPorFifa(item) {
  const inicio = new Date(item.Date || item.LocalDate || '');
  const agora = new Date();
  const golsCasa = item.HomeTeamScore ?? item.Home?.Score;
  const golsFora = item.AwayTeamScore ?? item.Away?.Score;
  const temPlacar = golsCasa !== null && golsCasa !== undefined && golsFora !== null && golsFora !== undefined;
  if (!Number.isNaN(inicio.getTime())) {
    const minutos = Math.abs(agora.getTime() - inicio.getTime()) / 60000;
    if (temPlacar && minutos <= 150) return 'LIVE';
    if (!temPlacar && inicio > agora) return 'NS';
  }
  return temPlacar ? 'FT' : 'NS';
}

function bandeiraFifa(time) {
  const codigo = time?.IdCountry || time?.Abbreviation;
  return codigo ? `${FIFA_BASE_URL}/picture/flags-sq-2/${encodeURIComponent(codigo)}` : null;
}

function mapearFifa(item) {
  const stageName = textoLocalizado(item.StageName, '');
  const groupName = textoLocalizado(item.GroupName, '');
  const home = item.Home || {};
  const away = item.Away || {};
  const golsCasa = item.HomeTeamScore ?? home.Score ?? null;
  const golsFora = item.AwayTeamScore ?? away.Score ?? null;
  return {
    fixture_id: item.IdMatch,
    time_casa: textoLocalizado(home.TeamName, home.ShortClubName || home.Abbreviation || item.PlaceHolderA || ''),
    time_fora: textoLocalizado(away.TeamName, away.ShortClubName || away.Abbreviation || item.PlaceHolderB || ''),
    codigo_casa: home.Abbreviation || home.IdCountry || null,
    codigo_fora: away.Abbreviation || away.IdCountry || null,
    bandeira_casa: bandeiraFifa(home),
    bandeira_fora: bandeiraFifa(away),
    data_jogo: dataHoraSaoPaulo(item.Date || item.LocalDate),
    data_api: item.Date || item.LocalDate || null,
    fase: fasePorFifa(stageName),
    rodada: groupName || stageName || 'Copa do Mundo 2026',
    status: statusPorFifa(item),
    gols_casa: golsCasa,
    gols_fora: golsFora,
    estadio: textoLocalizado(item.Stadium?.Name, ''),
    cidade: textoLocalizado(item.Stadium?.CityName, ''),
    fonte: 'FIFA 2026',
  };
}

async function garantirTimeApi(conn, nome, codigo, escudo) {
  const nomeFinal = String(nome || '').trim();
  if (!nomeFinal) return;
  const existente = await conn.query('SELECT id FROM times WHERE LOWER(nome) = LOWER(?)', [nomeFinal]);
  if (!existente.length) {
    await conn.query('INSERT INTO times (nome, codigo, escudo) VALUES (?, ?, ?)', [nomeFinal, codigo || null, escudo || null]);
  }
}

function palpitePlacarExato(jogo, palpite) {
  return Number(jogo.placar_casa) === Number(palpite.palpite_casa)
    && Number(jogo.placar_fora) === Number(palpite.palpite_fora);
}

function calcularResumoFinanceiroJogo(jogo, palpites) {
  const aprovadas = palpites.filter((palpite) => palpite.status_aposta === 'aprovado');
  const vencedores = Number(jogo.jogo_validado || 0) === 1 && jogo.status === 'finalizado'
    ? aprovadas.filter((palpite) => palpitePlacarExato(jogo, palpite))
    : [];
  const valorApostado = aprovadas.length * 5;
  const taxaPlataforma = valorApostado * 0.10;
  const arrecadado = valorApostado;
  const premioBase = valorApostado - taxaPlataforma;
  const premioTotal = vencedores.length
    ? premioBase + (jogo.fase === 'final' ? Number(jogo.premio_acumulado || 0) : 0)
    : 0;
  const valorPorVencedor = vencedores.length ? premioTotal / vencedores.length : 0;

  return {
    total_apostas: palpites.length,
    total_aprovadas: aprovadas.length,
    total_pendentes: palpites.filter((palpite) => palpite.status_aposta === 'pendente').length,
    total_reprovadas: palpites.filter((palpite) => palpite.status_aposta === 'reprovado').length,
    total_vencedores: vencedores.length,
    arrecadado,
    valor_a_pagar: premioTotal,
    valor_por_vencedor: valorPorVencedor,
    plataforma: taxaPlataforma,
  };
}

router.get('/usuarios', async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT id, nome, email, whatsapp, tipo, pix_chave, criado_em FROM usuarios ORDER BY criado_em DESC');
    res.json(rows.map(serializarJogoData));
  } catch {
    res.status(500).json({ message: 'Erro ao listar usuários.' });
  } finally { if (conn) conn.release(); }
});

router.get('/apostas', async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT p.*, u.nome, u.email, j.time_casa, j.time_fora, j.data_jogo, j.status AS status_jogo, j.jogo_validado
      FROM palpites p
      INNER JOIN usuarios u ON u.id = p.usuario_id
      INNER JOIN jogos j ON j.id = p.jogo_id
      ORDER BY p.data_palpite DESC
    `);
    res.json(rows);
  } catch {
    res.status(500).json({ message: 'Erro ao listar apostas.' });
  } finally { if (conn) conn.release(); }
});

router.get('/relatorios', async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const jogos = await conn.query('SELECT * FROM jogos ORDER BY data_jogo ASC');
    const apostas = await conn.query(`
      SELECT p.*, u.nome, u.email, u.pix_chave, j.time_casa, j.time_fora, j.data_jogo, j.placar_casa, j.placar_fora,
        j.status AS status_jogo, j.fase, j.jogo_validado, j.premio_acumulado
      FROM palpites p
      INNER JOIN usuarios u ON u.id = p.usuario_id
      INNER JOIN jogos j ON j.id = p.jogo_id
      ORDER BY j.data_jogo ASC, p.data_palpite ASC
    `);

    const jogosRelatorio = jogos.map((jogo) => {
      const jogoSerializado = serializarJogoData(jogo);
      const palpites = apostas.filter((palpite) => Number(palpite.jogo_id) === Number(jogo.id));
      const financeiro = calcularResumoFinanceiroJogo(jogo, palpites);

      const apostasFormatadas = palpites.map((palpite) => {
        const vencedor = Number(jogo.jogo_validado || 0) === 1
          && jogo.status === 'finalizado'
          && palpite.status_aposta === 'aprovado'
          && palpitePlacarExato(jogo, palpite);
        return {
          id: palpite.id,
          codigo_aposta: palpite.codigo_aposta,
          nome: palpite.nome,
          email: palpite.email,
          pix_chave: palpite.pix_chave,
          palpite_casa: palpite.palpite_casa,
          palpite_fora: palpite.palpite_fora,
          status_aposta: palpite.status_aposta,
          pontos: palpite.pontos,
          vencedor,
          valor_a_receber: vencedor ? financeiro.valor_por_vencedor : 0,
        };
      });

      return {
        ...jogoSerializado,
        financeiro,
        ganhadores: apostasFormatadas.filter((palpite) => palpite.vencedor),
        apostas: apostasFormatadas,
      };
    });

    const totalGeral = jogosRelatorio.reduce((acc, jogo) => ({
      total_apostas: acc.total_apostas + jogo.financeiro.total_apostas,
      total_aprovadas: acc.total_aprovadas + jogo.financeiro.total_aprovadas,
      total_pendentes: acc.total_pendentes + jogo.financeiro.total_pendentes,
      total_reprovadas: acc.total_reprovadas + jogo.financeiro.total_reprovadas,
      arrecadado: acc.arrecadado + jogo.financeiro.arrecadado,
      valor_a_pagar: acc.valor_a_pagar + jogo.financeiro.valor_a_pagar,
      plataforma: acc.plataforma + jogo.financeiro.plataforma,
    }), {
      total_apostas: 0,
      total_aprovadas: 0,
      total_pendentes: 0,
      total_reprovadas: 0,
      arrecadado: 0,
      valor_a_pagar: 0,
      plataforma: 0,
    });

    res.json({ jogos: jogosRelatorio, total_geral: totalGeral });
  } catch (error) {
    console.error('Erro ao gerar relatórios:', error);
    res.status(500).json({ message: 'Erro ao gerar relatórios.' });
  } finally { if (conn) conn.release(); }
});

router.put('/apostas/:id/status', async (req, res) => {
  const { status } = req.body;
  const motivoReprovacao = String(req.body.motivo_reprovacao || '').trim();
  if (!['pendente', 'aprovado', 'reprovado'].includes(status)) {
    return res.status(400).json({ message: 'Status inválido.' });
  }
  if (status === 'reprovado' && !motivoReprovacao) {
    return res.status(400).json({ message: 'Informe o motivo da reprovação.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await garantirMotivoReprovacao(conn);
    const apostas = await conn.query('SELECT * FROM palpites WHERE id = ?', [req.params.id]);
    if (!apostas.length) return res.status(404).json({ message: 'Aposta não encontrada.' });
    const apostaAtual = apostas[0];

    const motivoSalvo = status === 'reprovado' ? motivoReprovacao.slice(0, 500) : null;
    await conn.query('UPDATE palpites SET status_aposta = ? WHERE id = ?', [status, req.params.id]);
    await conn.query('UPDATE palpites SET motivo_reprovacao = ? WHERE id = ?', [motivoSalvo, req.params.id]);

    const apostaAtualizadaRows = await conn.query('SELECT motivo_reprovacao FROM palpites WHERE id = ?', [req.params.id]);
    const motivoAtualizado = apostaAtualizadaRows[0]?.motivo_reprovacao || null;
    res.json({
      message: 'Status da aposta atualizado.',
      motivo_reprovacao: motivoAtualizado,
    });
  } catch (err) {
    console.error('Erro ao atualizar aposta:', err);
    res.status(500).json({ message: 'Erro ao atualizar aposta.' });
  } finally { if (conn) conn.release(); }
});

router.get('/times', async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await garantirTimes(conn);
    const rows = await conn.query('SELECT id, nome, codigo, escudo, criado_em FROM times ORDER BY nome ASC');
    res.json(rows.map(serializarJogoData));
  } catch (error) {
    console.error('Erro ao listar times:', error);
    res.status(500).json({ message: 'Erro ao listar times.' });
  } finally { if (conn) conn.release(); }
});

router.post('/times', async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const codigo = String(req.body.codigo || '').trim().toUpperCase() || null;
  if (!nome) {
    return res.status(400).json({ message: 'Informe o nome do time.' });
  }
  if (nome.length > 80) {
    return res.status(400).json({ message: 'O nome do time deve ter no máximo 80 caracteres.' });
  }
  if (codigo && codigo.length > 10) {
    return res.status(400).json({ message: 'O código deve ter no máximo 10 caracteres.' });
  }
  let escudo;
  try {
    escudo = salvarEscudoPng(nome, req.body.escudo_png) || String(req.body.escudo || '').trim() || null;
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await garantirTimes(conn);
    const existente = await conn.query('SELECT id FROM times WHERE LOWER(nome) = LOWER(?)', [nome]);
    if (existente.length) {
      return res.status(409).json({ message: 'Este time já está cadastrado.' });
    }
    await conn.query('INSERT INTO times (nome, codigo, escudo) VALUES (?, ?, ?)', [nome, codigo, escudo]);
    res.status(201).json({ message: 'Time cadastrado.' });
  } catch (error) {
    console.error('Erro ao cadastrar time:', error);
    res.status(500).json({ message: 'Erro ao cadastrar time.' });
  } finally { if (conn) conn.release(); }
});

router.put('/times/:id', async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const codigo = req.body.codigo === undefined ? undefined : String(req.body.codigo || '').trim().toUpperCase();
  const escudoManual = req.body.escudo === undefined ? undefined : String(req.body.escudo || '').trim();

  let conn;
  try {
    conn = await pool.getConnection();
    await garantirTimes(conn);
    const rows = await conn.query('SELECT id, nome, codigo, escudo FROM times WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Time não encontrado.' });

    const atual = rows[0];
    const nomeFinal = nome || atual.nome;
    const codigoFinal = codigo === undefined ? atual.codigo : (codigo || null);
    const escudoPng = salvarEscudoPng(nomeFinal, req.body.escudo_png);
    const escudoFinal = escudoPng || (escudoManual === undefined ? atual.escudo : (escudoManual || null));

    await conn.query('UPDATE times SET nome = ?, codigo = ?, escudo = ? WHERE id = ?', [nomeFinal, codigoFinal, escudoFinal, req.params.id]);
    res.json({ message: 'Time atualizado.', escudo: escudoFinal });
  } catch (error) {
    console.error('Erro ao atualizar time:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Erro ao atualizar time.' });
  } finally { if (conn) conn.release(); }
});

router.delete('/times/:id', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await garantirTimes(conn);
    const result = await conn.query('DELETE FROM times WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Time não encontrado.' });
    res.json({ message: 'Time excluído.' });
  } catch (error) {
    console.error('Erro ao excluir time:', error);
    res.status(500).json({ message: 'Erro ao excluir time.' });
  } finally { if (conn) conn.release(); }
});

router.get('/jogos', async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await garantirApiJogoId(conn);
    const rows = await conn.query('SELECT * FROM jogos ORDER BY data_jogo ASC');
    await fifaService.sincronizarPlacarFifa(conn, rows);
    const atualizados = await conn.query('SELECT * FROM jogos ORDER BY data_jogo ASC');
    res.json(atualizados);
  } catch {
    res.status(500).json({ message: 'Erro ao listar jogos.' });
  } finally { if (conn) conn.release(); }
});

router.get('/fifa2026/jogos', async (_req, res) => {
  try {
    res.json({
      source: 'FIFA',
      season: 2026,
      jogos: await fifaService.buscarJogosFifa(true),
    });
  } catch (error) {
    console.error('Erro ao buscar jogos na FIFA:', error);
    res.status(502).json({ message: 'Não foi possível buscar os jogos da Copa 2026 na FIFA agora.' });
  }
});

router.post('/fifa2026/jogos/importar', async (req, res) => {
  const jogo = {
    fixture_id: req.body.fixture_id,
    time_casa: String(req.body.time_casa || '').trim(),
    time_fora: String(req.body.time_fora || '').trim(),
    data_jogo: String(req.body.data_jogo || '').trim(),
    fase: req.body.fase || 'fase_grupos',
    codigo_casa: req.body.codigo_casa || null,
    codigo_fora: req.body.codigo_fora || null,
    bandeira_casa: req.body.bandeira_casa || null,
    bandeira_fora: req.body.bandeira_fora || null,
  };
  if (!jogo.time_casa || !jogo.time_fora || !jogo.data_jogo) {
    return res.status(400).json({ message: 'Dados do jogo incompletos para importação.' });
  }
  if (jogo.time_casa === jogo.time_fora) {
    return res.status(400).json({ message: 'A partida importada precisa ter dois times diferentes.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await garantirApiJogoId(conn);
    await garantirTimes(conn);
    await garantirTimeApi(conn, jogo.time_casa, jogo.codigo_casa, jogo.bandeira_casa);
    await garantirTimeApi(conn, jogo.time_fora, jogo.codigo_fora, jogo.bandeira_fora);

    const existentes = await conn.query('SELECT * FROM jogos ORDER BY data_jogo ASC');
    const jaExiste = existentes.find((item) => (
      String(item.time_casa).toLowerCase() === jogo.time_casa.toLowerCase()
      && String(item.time_fora).toLowerCase() === jogo.time_fora.toLowerCase()
      && String(item.data_jogo).slice(0, 16) === jogo.data_jogo.slice(0, 16)
    ));
    if (jaExiste) {
      if (!jaExiste.api_jogo_id && jogo.fixture_id) {
        await conn.query(
          `UPDATE jogos
           SET api_jogo_id = ?, codigo_casa = ?, codigo_fora = ?, bandeira_casa = ?, bandeira_fora = ?
           WHERE id = ?`,
          [jogo.fixture_id, jogo.codigo_casa, jogo.codigo_fora, jogo.bandeira_casa, jogo.bandeira_fora, jaExiste.id]
        );
        jaExiste.api_jogo_id = jogo.fixture_id;
      }
      return res.json({ message: 'Este jogo já estava cadastrado.', jogo: serializarJogoData(jaExiste), existente: true });
    }

    await conn.query(
      'INSERT INTO jogos (time_casa, time_fora, data_jogo, fase, status, liberado_palpite, codigo_casa, codigo_fora, bandeira_casa, bandeira_fora, api_jogo_id) VALUES (?, ?, ?, ?, "aberto", 0, ?, ?, ?, ?, ?)',
      [
        jogo.time_casa,
        jogo.time_fora,
        jogo.data_jogo,
        jogo.fase,
        jogo.codigo_casa,
        jogo.codigo_fora,
        jogo.bandeira_casa,
        jogo.bandeira_fora,
        jogo.fixture_id || null,
      ]
    );
    res.status(201).json({ message: 'Jogo importado. Libere manualmente quando quiser abrir apostas.' });
  } catch (error) {
    console.error('Erro ao importar jogo da FIFA:', error);
    res.status(500).json({ message: 'Erro ao importar jogo da FIFA.' });
  } finally { if (conn) conn.release(); }
});

router.post('/jogos', async (req, res) => {
  const { time_casa, time_fora, data_jogo, fase = 'fase_grupos' } = req.body;
  if (!time_casa || !time_fora || !data_jogo) {
    return res.status(400).json({ message: 'Informe os times e a data do jogo.' });
  }
  if (String(time_casa).trim() === String(time_fora).trim()) {
    return res.status(400).json({ message: 'Selecione dois times diferentes.' });
  }
  let conn;
  try {
    conn = await pool.getConnection();
    await garantirTimes(conn);
    const times = await conn.query('SELECT nome, codigo, escudo FROM times WHERE nome IN (?, ?)', [time_casa, time_fora]);
    const timeCasaInfo = times.find((time) => String(time.nome).toLowerCase() === String(time_casa).toLowerCase());
    const timeForaInfo = times.find((time) => String(time.nome).toLowerCase() === String(time_fora).toLowerCase());
    await conn.query(
      'INSERT INTO jogos (time_casa, time_fora, data_jogo, fase, status, liberado_palpite, codigo_casa, codigo_fora, bandeira_casa, bandeira_fora) VALUES (?, ?, ?, ?, "aberto", 0, ?, ?, ?, ?)',
      [
        time_casa,
        time_fora,
        data_jogo,
        fase,
        timeCasaInfo?.codigo || null,
        timeForaInfo?.codigo || null,
        timeCasaInfo?.escudo || null,
        timeForaInfo?.escudo || null,
      ]
    );
    res.status(201).json({ message: 'Jogo criado.' });
  } catch {
    res.status(500).json({ message: 'Erro ao criar jogo.' });
  } finally { if (conn) conn.release(); }
});

router.put('/jogos/:id', async (req, res) => {
  const { time_casa, time_fora, data_jogo, fase = 'fase_grupos' } = req.body;
  if (!time_casa || !time_fora || !data_jogo) {
    return res.status(400).json({ message: 'Informe os times e a data do jogo.' });
  }
  if (String(time_casa).trim() === String(time_fora).trim()) {
    return res.status(400).json({ message: 'Selecione dois times diferentes.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await garantirTimes(conn);
    const times = await conn.query('SELECT nome, codigo, escudo FROM times WHERE nome IN (?, ?)', [time_casa, time_fora]);
    const timeCasaInfo = times.find((time) => String(time.nome).toLowerCase() === String(time_casa).toLowerCase());
    const timeForaInfo = times.find((time) => String(time.nome).toLowerCase() === String(time_fora).toLowerCase());
    const result = await conn.query(
      `UPDATE jogos
       SET time_casa = ?, time_fora = ?, data_jogo = ?, fase = ?,
           codigo_casa = ?, codigo_fora = ?, bandeira_casa = ?, bandeira_fora = ?,
           placar_casa = NULL, placar_fora = NULL, penaltis_casa = NULL, penaltis_fora = NULL,
           status = "aberto", liberado_palpite = 1, jogo_validado = 0
       WHERE id = ?`,
      [
        time_casa,
        time_fora,
        data_jogo,
        fase,
        timeCasaInfo?.codigo || null,
        timeForaInfo?.codigo || null,
        timeCasaInfo?.escudo || null,
        timeForaInfo?.escudo || null,
        req.params.id,
      ]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Jogo não encontrado.' });
    res.json({ message: 'Jogo atualizado.' });
  } catch (error) {
    console.error('Erro ao atualizar jogo:', error);
    res.status(500).json({ message: 'Erro ao atualizar jogo.' });
  } finally { if (conn) conn.release(); }
});

router.put('/jogos/:id/liberar', async (req, res) => {
  const liberado = req.body.liberado ? 1 : 0;
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query('UPDATE jogos SET liberado_palpite = ? WHERE id = ?', [liberado, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Jogo não encontrado.' });
    res.json({ message: liberado ? 'Jogo liberado.' : 'Jogo bloqueado.' });
  } catch {
    res.status(500).json({ message: 'Erro ao atualizar jogo.' });
  } finally { if (conn) conn.release(); }
});

router.delete('/jogos/:id', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query('DELETE FROM jogos WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Jogo não encontrado.' });
    res.json({ message: 'Jogo excluído.' });
  } catch {
    res.status(500).json({ message: 'Erro ao excluir jogo.' });
  } finally { if (conn) conn.release(); }
});

router.put('/jogos/:id/resultado', async (req, res) => {
  const { placar_casa, placar_fora, penaltis_casa = null, penaltis_fora = null } = req.body;
  if (!Number.isInteger(Number(placar_casa)) || !Number.isInteger(Number(placar_fora)) || Number(placar_casa) < 0 || Number(placar_fora) < 0) {
    return res.status(400).json({ message: 'Informe um placar válido.' });
  }
  if ((penaltis_casa === null) !== (penaltis_fora === null)) {
    return res.status(400).json({ message: 'Informe os pênaltis dos dois times ou deixe ambos em branco.' });
  }
  let conn;
  try {
    conn = await pool.getConnection();
    await garantirApiJogoId(conn);
    const jogos = await conn.query('SELECT id, api_jogo_id FROM jogos WHERE id = ?', [req.params.id]);
    if (!jogos.length) return res.status(404).json({ message: 'Jogo não encontrado.' });
    if (jogos[0].api_jogo_id) {
      return res.status(400).json({ message: 'Este jogo veio da FIFA. O resultado é atualizado automaticamente pela API FIFA.' });
    }
    const result = await conn.query(
      'UPDATE jogos SET placar_casa = ?, placar_fora = ?, penaltis_casa = ?, penaltis_fora = ?, status = "finalizado", liberado_palpite = 0, jogo_validado = 0 WHERE id = ?',
      [placar_casa, placar_fora, penaltis_casa, penaltis_fora, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Jogo não encontrado.' });
    res.json({ message: 'Resultado salvo.' });
  } catch {
    res.status(500).json({ message: 'Erro ao salvar resultado.' });
  } finally { if (conn) conn.release(); }
});

router.post('/jogos/:id/calcular', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const jogos = await conn.query('SELECT * FROM jogos WHERE id = ? AND status = "finalizado"', [req.params.id]);
    if (!jogos.length) return res.status(400).json({ message: 'Jogo ainda não finalizado.' });

    const palpites = await conn.query('SELECT * FROM palpites WHERE jogo_id = ? AND status_aposta = "aprovado"', [req.params.id]);
    if (palpites.length < 2) {
      return res.status(400).json({ message: 'Jogo não validado: são necessários pelo menos 2 palpites aprovados.' });
    }

    const pontosPorPalpite = new Map();
    for (const palpite of palpites) {
      const pontos = calcularPontos(jogos[0], palpite);
      pontosPorPalpite.set(Number(palpite.id), pontos);
      await conn.query('UPDATE palpites SET pontos = ? WHERE id = ?', [pontos, palpite.id]);
    }

    const jogo = jogos[0];
    const maxPontos = Math.max(0, ...[...pontosPorPalpite.values()]);
    const semVencedor = maxPontos < 10;
    const isFinal = jogo.fase === 'final';
    const totalApostas = palpites.length;
    const valorApostado = totalApostas * 5;
    const taxaPlataforma = valorApostado * 0.10;
    const arrecadado = valorApostado;
    const premioBase = valorApostado - taxaPlataforma;
    const premioAcumuladoFinal = Number(jogo.premio_acumulado || 0);
    const baseFinalSemVencedor = premioAcumuladoFinal + arrecadado;
    const acumuloFinal = semVencedor && !isFinal ? premioBase : 0;
    const acumuloRanking = 0;
    const valorPlataformaFinal = taxaPlataforma;

    if (semVencedor && !isFinal) {
      await conn.query(
        'UPDATE jogos SET premio_acumulado = premio_acumulado + ? WHERE fase = "final"',
        [acumuloFinal]
      );
    }

    if (semVencedor && isFinal) {
      await conn.query('UPDATE jogos SET premio_acumulado = 0 WHERE id = ?', [req.params.id]);
    }

    await conn.query('UPDATE jogos SET jogo_validado = 1 WHERE id = ?', [req.params.id]);

    const taxa = taxaPlataforma;
    const premiacao = semVencedor ? acumuloFinal : premioBase + (isFinal ? premioAcumuladoFinal : 0);
    let message;
    if (semVencedor && !isFinal) {
      message = `Pontuação calculada. Sem palpite vencedor: R$ ${acumuloFinal.toFixed(2)} acumulados para a final.`;
    } else if (semVencedor && isFinal) {
      message = `Pontuação calculada. Final sem palpite vencedor: não há rateio de premiação.`;
    } else {
      message = `Pontuação calculada. Apostas aprovadas: ${totalApostas}. Prêmio do jogo: R$ ${premiacao.toFixed(2)}.`;
    }
    res.json({
      message,
      total_apostas: totalApostas,
      arrecadado,
      taxa,
      premiacao,
      acumulado_final: acumuloFinal,
      acumulado_ranking: acumuloRanking,
      destinado_plataforma: valorPlataformaFinal,
    });
  } catch (error) {
    console.error('Erro ao calcular pontuação:', error);
    res.status(500).json({ message: 'Erro ao calcular pontuação.' });
  } finally { if (conn) conn.release(); }
});

module.exports = router;
