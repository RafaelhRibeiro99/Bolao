const FIFA_BASE_URL = process.env.FIFA_BASE_URL || 'https://api.fifa.com/api/v3';
const FIFA_WORLD_CUP_COMPETITION_ID = process.env.FIFA_WORLD_CUP_COMPETITION_ID || '17';
const FIFA_WORLD_CUP_SEASON_ID = process.env.FIFA_WORLD_CUP_SEASON_ID || '285023';
const FIFA_WORLD_CUP_FROM = process.env.FIFA_WORLD_CUP_FROM || '2026-06-01';
const FIFA_WORLD_CUP_TO = process.env.FIFA_WORLD_CUP_TO || '2026-07-31';

const CACHE_MS = 10000;
let cacheFifa = { expiresAt: 0, jogos: [] };

function doisDigitos(valor) {
  return String(valor).padStart(2, '0');
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
  const status = String(item.MatchStatus || item.Status || item.MatchStatusCode || '').toLowerCase();
  if (/(live|in progress|first|second|half|halftime|playing)/i.test(status)) return 'LIVE';
  if (/(full|final|played|finished|ft)/i.test(status)) return 'FT';

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

function statusLocalPorFifa(status) {
  if (status === 'LIVE') return 'em_andamento';
  if (status === 'FT') return 'finalizado';
  return 'aberto';
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
    status_local: statusLocalPorFifa(statusPorFifa(item)),
    gols_casa: golsCasa,
    gols_fora: golsFora,
    estadio: textoLocalizado(item.Stadium?.Name, ''),
    cidade: textoLocalizado(item.Stadium?.CityName, ''),
    fonte: 'FIFA 2026',
  };
}

function chaveTime(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function mesmaPartida(local, fifa) {
  if (local.api_jogo_id && String(local.api_jogo_id) === String(fifa.fixture_id)) return true;
  return chaveTime(local.time_casa) === chaveTime(fifa.time_casa)
    && chaveTime(local.time_fora) === chaveTime(fifa.time_fora)
    && String(local.data_jogo || '').slice(0, 16) === String(fifa.data_jogo || '').slice(0, 16);
}

async function buscarJogosFifa(force = false) {
  if (!force && cacheFifa.expiresAt > Date.now()) return cacheFifa.jogos;

  const url = new URL('/api/v3/calendar/matches', FIFA_BASE_URL);
  url.searchParams.set('language', 'pt-BR');
  url.searchParams.set('count', '500');
  url.searchParams.set('idCompetition', FIFA_WORLD_CUP_COMPETITION_ID);
  url.searchParams.set('idSeason', FIFA_WORLD_CUP_SEASON_ID);
  url.searchParams.set('from', FIFA_WORLD_CUP_FROM);
  url.searchParams.set('to', FIFA_WORLD_CUP_TO);

  const resposta = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const error = new Error('Erro ao consultar a API gratuita da FIFA.');
    error.statusCode = 502;
    throw error;
  }

  const jogos = (dados.Results || [])
    .map(mapearFifa)
    .filter((jogo) => jogo.time_casa && jogo.time_fora && jogo.data_jogo);
  cacheFifa = { expiresAt: Date.now() + CACHE_MS, jogos };
  return jogos;
}

async function garantirApiJogoId(conn) {
  try {
    await conn.query('ALTER TABLE jogos ADD COLUMN IF NOT EXISTS api_jogo_id VARCHAR(80) NULL');
  } catch (error) {
    if (!/already exists|duplicate column/i.test(error.message || '')) throw error;
  }
}

async function sincronizarPlacarFifa(conn, jogosLocais) {
  const locais = Array.isArray(jogosLocais) ? jogosLocais : [];
  const sincronizaveis = locais.filter((jogo) => jogo.api_jogo_id || jogo.fonte === 'FIFA 2026');
  if (!sincronizaveis.length && !locais.length) return;
  await garantirApiJogoId(conn);

  let jogosFifa;
  try {
    jogosFifa = await buscarJogosFifa();
  } catch (error) {
    console.warn('Nao foi possivel sincronizar placares FIFA:', error.message);
    return;
  }

  for (const local of locais) {
    const fifa = jogosFifa.find((jogo) => mesmaPartida(local, jogo));
    if (!fifa) continue;

    const golsCasa = fifa.gols_casa === null || fifa.gols_casa === undefined ? null : Number(fifa.gols_casa);
    const golsFora = fifa.gols_fora === null || fifa.gols_fora === undefined ? null : Number(fifa.gols_fora);
    const temPlacar = golsCasa !== null && golsFora !== null;
    const statusLocal = temPlacar ? fifa.status_local : 'aberto';
    const liberado = statusLocal === 'aberto' ? Number(local.liberado_palpite || 0) : 0;

    if (
      String(local.api_jogo_id || '') === String(fifa.fixture_id || '')
      && Number(local.placar_casa ?? -1) === Number(golsCasa ?? -1)
      && Number(local.placar_fora ?? -1) === Number(golsFora ?? -1)
      && String(local.status) === statusLocal
    ) {
      continue;
    }

    await conn.query(
      `UPDATE jogos
       SET api_jogo_id = ?, placar_casa = ?, placar_fora = ?, status = ?, liberado_palpite = ?, jogo_validado = 0
       WHERE id = ?`,
      [fifa.fixture_id || null, golsCasa, golsFora, statusLocal, liberado, local.id]
    );
  }
}

module.exports = {
  buscarJogosFifa,
  garantirApiJogoId,
  mapearFifa,
  sincronizarPlacarFifa,
};
