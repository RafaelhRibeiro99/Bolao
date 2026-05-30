const pool = require('../config/db');
const { CONQUISTAS, validarRegrasRecompensa } = require('../services/conquistas');
const { codigoApostaPorSequencia } = require('../services/codigosAposta');

async function tryQuery(conn, sql, params = []) {
  try {
    return await conn.query(sql, params);
  } catch (error) {
    if (!/Duplicate|exists|Unknown column/i.test(error.message || '')) {
      console.warn(`Aviso seed: ${error.message || error}`);
    }
    return null;
  }
}

async function garantirSchema(conn) {
  await tryQuery(conn, 'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS emoji_ativo VARCHAR(20) NULL');
  await tryQuery(conn, 'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS efeito_nome VARCHAR(100) NULL');
  await tryQuery(conn, 'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pix_chave VARCHAR(120) NULL');
  await tryQuery(conn, "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar_face VARCHAR(80) NULL DEFAULT 'messi.png'");
  await tryQuery(conn, "UPDATE usuarios SET avatar_face = 'messi.png' WHERE avatar_face IS NULL OR avatar_face = 'face_01.png'");
  await tryQuery(conn, 'ALTER TABLE jogos ADD COLUMN IF NOT EXISTS penaltis_casa INT NULL');
  await tryQuery(conn, 'ALTER TABLE jogos ADD COLUMN IF NOT EXISTS penaltis_fora INT NULL');
  await tryQuery(conn, 'ALTER TABLE palpites ADD COLUMN IF NOT EXISTS codigo_aposta VARCHAR(6) NULL UNIQUE');
  await tryQuery(conn, 'ALTER TABLE palpites ADD COLUMN IF NOT EXISTS motivo_reprovacao TEXT NULL');

  const palpitesSemCodigo = await tryQuery(conn, 'SELECT id FROM palpites WHERE codigo_aposta IS NULL ORDER BY id ASC');
  if (Array.isArray(palpitesSemCodigo)) {
    for (const palpite of palpitesSemCodigo) {
      await tryQuery(conn, 'UPDATE palpites SET codigo_aposta = ? WHERE id = ?', [codigoApostaPorSequencia(palpite.id), palpite.id]);
    }
  }

  await conn.query(`
    CREATE TABLE IF NOT EXISTS conquistas (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(120) NOT NULL,
      descricao TEXT,
      grau VARCHAR(20) NOT NULL DEFAULT 'comum',
      categoria VARCHAR(32) NOT NULL,
      meta INT DEFAULT 1,
      titulo VARCHAR(120) NULL,
      emoji VARCHAR(20) NULL,
      moldura VARCHAR(100) NULL,
      aura VARCHAR(100) NULL,
      efeito_nome VARCHAR(100) NULL,
      efeito_visual VARCHAR(100) NULL,
      recompensa_visual VARCHAR(100) NULL
    )
  `);

  await tryQuery(conn, "ALTER TABLE conquistas ALTER COLUMN grau SET DEFAULT 'comum'");
  await tryQuery(conn, 'ALTER TABLE conquistas ADD COLUMN IF NOT EXISTS titulo VARCHAR(120) NULL');
  await tryQuery(conn, 'ALTER TABLE conquistas ADD COLUMN IF NOT EXISTS emoji VARCHAR(20) NULL');
  await tryQuery(conn, 'ALTER TABLE conquistas ADD COLUMN IF NOT EXISTS moldura VARCHAR(100) NULL');
  await tryQuery(conn, 'ALTER TABLE conquistas ADD COLUMN IF NOT EXISTS aura VARCHAR(100) NULL');
  await tryQuery(conn, 'ALTER TABLE conquistas ADD COLUMN IF NOT EXISTS efeito_nome VARCHAR(100) NULL');
  await tryQuery(conn, 'ALTER TABLE conquistas ADD COLUMN IF NOT EXISTS tipo VARCHAR(32) NULL');
  await tryQuery(conn, 'ALTER TABLE conquistas ADD COLUMN IF NOT EXISTS valor INT DEFAULT 1');
  await tryQuery(conn, 'CREATE UNIQUE INDEX IF NOT EXISTS uq_conquistas_nome ON conquistas (nome)');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS usuario_conquistas (
      id SERIAL PRIMARY KEY,
      usuario_id INT NOT NULL,
      conquista_id INT NOT NULL,
      desbloqueada_em TIMESTAMP NULL,
      equipada SMALLINT DEFAULT 0,
      progresso INT DEFAULT 0,
      exibida SMALLINT DEFAULT 1,
      CONSTRAINT fk_usuario_conquistas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      CONSTRAINT fk_usuario_conquistas_conquista FOREIGN KEY (conquista_id) REFERENCES conquistas(id) ON DELETE CASCADE,
      CONSTRAINT usuario_conquista_unica UNIQUE (usuario_id, conquista_id)
    )
  `);
}

async function seedConquistas() {
  if (process.env.USE_MEMORY_DB === 'true') {
    console.log(`Seed em memoria: ${CONQUISTAS.length} conquistas ja carregadas pelo codigo.`);
    return;
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await garantirSchema(conn);

    for (const conquista of CONQUISTAS) {
      if (!validarRegrasRecompensa(conquista)) {
        throw new Error(`Regra de recompensa inválida para ${conquista.nome}`);
      }

      await conn.query(`
        INSERT INTO conquistas
          (id, nome, descricao, grau, categoria, meta, titulo, emoji, moldura, aura, efeito_nome, efeito_visual, recompensa_visual, tipo, valor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          nome = EXCLUDED.nome,
          descricao = EXCLUDED.descricao,
          grau = EXCLUDED.grau,
          categoria = EXCLUDED.categoria,
          meta = EXCLUDED.meta,
          titulo = EXCLUDED.titulo,
          emoji = EXCLUDED.emoji,
          moldura = EXCLUDED.moldura,
          aura = EXCLUDED.aura,
          efeito_nome = EXCLUDED.efeito_nome,
          efeito_visual = EXCLUDED.efeito_visual,
          recompensa_visual = EXCLUDED.recompensa_visual,
          tipo = EXCLUDED.tipo,
          valor = EXCLUDED.valor
      `, [
        conquista.id,
        conquista.nome,
        conquista.descricao,
        conquista.grau,
        conquista.tipo,
        conquista.valor,
        conquista.titulo,
        conquista.emoji || null,
        conquista.moldura || null,
        conquista.aura || null,
        conquista.efeito_nome || null,
        `achievement-${conquista.grau}`,
        conquista.titulo,
        conquista.tipo,
        conquista.valor,
      ]);
    }

    await conn.query(`
      SELECT setval(
        pg_get_serial_sequence('conquistas', 'id'),
        COALESCE((SELECT MAX(id) FROM conquistas), 1),
        true
      )
    `);

    console.log(`Seed concluido: ${CONQUISTAS.length} conquistas cadastradas/atualizadas sem duplicar.`);
  } finally {
    if (conn) conn.release();
  }
}

if (require.main === module) {
  seedConquistas()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Erro no seed de conquistas:', error);
      process.exit(1);
    });
}

module.exports = { seedConquistas };
