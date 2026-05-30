const pool = require('../config/db');
const { avaliarConquistas } = require('./conquistas');

async function processAchievements(usuarioId) {
  let conn;
  try {
    conn = await pool.getConnection();
    const palpites = await conn.query(`
      SELECT p.*, j.time_casa, j.time_fora, j.placar_casa, j.placar_fora, j.fase, j.status, j.data_jogo
      FROM palpites p
      INNER JOIN jogos j ON j.id = p.jogo_id
      WHERE p.usuario_id = ?
      ORDER BY p.data_palpite ASC
    `, [usuarioId]);
    const jogos = await conn.query('SELECT * FROM jogos ORDER BY data_jogo ASC');
    const conquistas = avaliarConquistas(palpites, jogos);

    for (const conquista of conquistas) {
      const desbloqueadaEm = conquista.desbloqueada ? new Date() : null;
      await conn.query(`
        INSERT INTO usuario_conquistas (usuario_id, conquista_id, progresso, desbloqueada_em, exibida)
        VALUES (?, ?, ?, ?, 1)
        ON CONFLICT (usuario_id, conquista_id) DO UPDATE SET
          progresso = EXCLUDED.progresso,
          desbloqueada_em = COALESCE(usuario_conquistas.desbloqueada_em, EXCLUDED.desbloqueada_em),
          exibida = 1
      `, [usuarioId, conquista.id, conquista.progresso || 0, desbloqueadaEm]);
    }
  } catch (error) {
    // O sistema principal calcula conquistas em tempo real. A persistencia e complementar.
    console.warn('Não foi possível sincronizar conquistas persistidas:', error.message || error);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { processAchievements };
