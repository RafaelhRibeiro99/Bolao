const express = require('express');
const pool = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');
const { calcularPontos } = require('../services/pontuacao');
const { processAchievements } = require('../services/achievementEngine');
const { CONQUISTAS } = require('../services/conquistas');
const { seedConquistas } = require('../scripts/seed-conquistas');

const router = express.Router();
router.use(auth, adminOnly);

async function garantirMotivoReprovacao(conn) {
  try {
    await conn.query('ALTER TABLE palpites ADD COLUMN IF NOT EXISTS motivo_reprovacao TEXT NULL');
  } catch (error) {
    if (!/already exists|duplicate column/i.test(error.message || '')) {
      throw error;
    }
  }
}

router.get('/conquistas', async (_req, res) => {
  res.json(CONQUISTAS);
});

router.post('/conquistas/seed', async (_req, res) => {
  try {
    await seedConquistas();
    res.json({ message: `${CONQUISTAS.length} conquistas cadastradas/atualizadas.` });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erro ao popular conquistas.' });
  }
});

router.get('/usuarios', async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT id, nome, email, whatsapp, tipo, pix_chave, criado_em FROM usuarios ORDER BY criado_em DESC');
    res.json(rows);
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
    if (status === 'aprovado') {
      const usuarioId = apostaAtual.usuario_id;
      try {
        await processAchievements(usuarioId);
      } catch (achievementError) {
        console.warn('Não foi possível processar conquistas após aprovar aposta:', achievementError.message);
      }
    }
    res.json({
      message: 'Status da aposta atualizado.',
      motivo_reprovacao: motivoAtualizado,
    });
  } catch (err) {
    console.error('Erro ao atualizar aposta:', err);
    res.status(500).json({ message: 'Erro ao atualizar aposta.' });
  } finally { if (conn) conn.release(); }
});

router.get('/jogos', async (_req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM jogos ORDER BY data_jogo ASC');
    res.json(rows);
  } catch {
    res.status(500).json({ message: 'Erro ao listar jogos.' });
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
    await conn.query(
      'INSERT INTO jogos (time_casa, time_fora, data_jogo, fase, status, liberado_palpite) VALUES (?, ?, ?, ?, "aberto", 0)',
      [time_casa, time_fora, data_jogo, fase]
    );
    res.status(201).json({ message: 'Jogo criado.' });
  } catch {
    res.status(500).json({ message: 'Erro ao criar jogo.' });
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
    const usuariosValidos = new Set(palpites.map((palpite) => Number(palpite.usuario_id)));
    if (usuariosValidos.size < 5) {
      return res.status(400).json({ message: 'Jogo não validado: são necessários pelo menos 5 usuários diferentes com apostas aprovadas.' });
    }

    const usuariosDistintos = [...new Set(palpites.map((p) => p.usuario_id))];
    const pontosPorPalpite = new Map();
    for (const palpite of palpites) {
      const pontos = calcularPontos(jogos[0], palpite);
      pontosPorPalpite.set(Number(palpite.id), pontos);
      await conn.query('UPDATE palpites SET pontos = ? WHERE id = ?', [pontos, palpite.id]);
    }

    const jogo = jogos[0];
    const maxPontos = Math.max(0, ...[...pontosPorPalpite.values()]);
    const semVencedor = maxPontos <= 0;
    const isFinal = jogo.fase === 'final';
    const totalApostas = palpites.length;
    const arrecadado = totalApostas * 5;
    const premioBase = arrecadado * 0.8;
    const taxaPlataforma = arrecadado * 0.2;
    const premioAcumuladoFinal = Number(jogo.premio_acumulado || 0);
    const baseFinalSemVencedor = premioAcumuladoFinal + arrecadado;
    const acumuloFinal = semVencedor && !isFinal ? premioBase : 0;
    const acumuloRanking = semVencedor ? (isFinal ? baseFinalSemVencedor * 0.2 : taxaPlataforma) : 0;
    const valorPlataformaFinal = semVencedor && isFinal ? baseFinalSemVencedor * 0.8 : 0;

    if (semVencedor && !isFinal) {
      await conn.query(
        'UPDATE jogos SET premio_acumulado = premio_acumulado + ?, taxa_admin = taxa_admin + ? WHERE fase = "final"',
        [acumuloFinal, acumuloRanking]
      );
    }

    if (semVencedor && isFinal) {
      await conn.query('UPDATE jogos SET taxa_admin = taxa_admin + ? WHERE id = ?', [acumuloRanking, req.params.id]);
    }

    if (semVencedor && isFinal) {
      await conn.query('UPDATE jogos SET premio_acumulado = 0 WHERE id = ?', [req.params.id]);
    }

    await conn.query('UPDATE jogos SET jogo_validado = 1 WHERE id = ?', [req.params.id]);

    for (const usuarioId of usuariosDistintos) {
      try {
        await processAchievements(usuarioId);
      } catch (achievementError) {
        console.warn('Não foi possível processar conquistas após calcular pontuação:', achievementError.message);
      }
    }

    const taxa = semVencedor ? acumuloRanking : taxaPlataforma;
    const premiacao = semVencedor ? acumuloFinal : premioBase + (isFinal ? premioAcumuladoFinal : 0);
    let message;
    if (semVencedor && !isFinal) {
      message = `Pontuação calculada. Sem palpite vencedor: R$ ${acumuloRanking.toFixed(2)} para o 1º lugar do ranking e R$ ${acumuloFinal.toFixed(2)} acumulados para a final.`;
    } else if (semVencedor && isFinal) {
      message = `Pontuação calculada. Final sem palpite vencedor: R$ ${acumuloRanking.toFixed(2)} para o 1º lugar do ranking e R$ ${valorPlataformaFinal.toFixed(2)} destinados à plataforma.`;
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
