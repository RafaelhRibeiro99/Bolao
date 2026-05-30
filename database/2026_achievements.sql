ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS emoji_ativo VARCHAR(20) NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS efeito_nome VARCHAR(100) NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pix_chave VARCHAR(120) NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar_face VARCHAR(80) NULL DEFAULT 'messi.png';
UPDATE usuarios SET avatar_face = 'messi.png' WHERE avatar_face IS NULL OR avatar_face = 'face_01.png';
ALTER TABLE jogos ADD COLUMN IF NOT EXISTS penaltis_casa INT NULL;
ALTER TABLE jogos ADD COLUMN IF NOT EXISTS penaltis_fora INT NULL;
ALTER TABLE palpites ADD COLUMN IF NOT EXISTS codigo_aposta VARCHAR(6) NULL UNIQUE;
ALTER TABLE palpites ADD COLUMN IF NOT EXISTS motivo_reprovacao TEXT NULL;

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
  recompensa_visual VARCHAR(100) NULL,
  tipo VARCHAR(32) NULL,
  valor INT DEFAULT 1,
  CONSTRAINT uq_conquistas_nome UNIQUE (nome)
);

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
);

INSERT INTO conquistas
  (id, nome, descricao, grau, categoria, meta, titulo, emoji, moldura, aura, efeito_nome, efeito_visual, recompensa_visual, tipo, valor)
VALUES
  (1, 'Apito Inicial', 'Deu o pontapé inicial na sua jornada realizando o primeiro palpite.', 'comum', 'palpites', 1, 'Apito Inicial', NULL, NULL, NULL, NULL, 'achievement-comum', 'Apito Inicial', 'palpites', 1),
  (2, 'Torcedor de Arquibancada', 'Entrou no clima da Copa realizando 5 palpites.', 'raro', 'palpites', 5, 'Torcedor de Arquibancada', '📣', NULL, NULL, NULL, 'achievement-raro', 'Torcedor de Arquibancada', 'palpites', 5),
  (3, 'Fanático da Copa', 'Viveu intensamente a competição alcançando 15 palpites.', 'epico', 'palpites', 15, 'Fanático da Copa', '🏟️', 'moldura_arquibancada', NULL, NULL, 'achievement-epico', 'Fanático da Copa', 'palpites', 15),
  (4, 'Mestre dos Palpites', 'Provou sua dedicação realizando 30 palpites oficiais.', 'lendario', 'palpites', 30, 'Mestre dos Palpites', '🎯', 'moldura_dourada', 'aura_dourada', NULL, 'achievement-lendario', 'Mestre dos Palpites', 'palpites', 30),
  (5, 'Alma da Copa', 'Acompanhou cada momento da competição participando de todos os jogos oficiais.', 'mitico', 'todos_jogos', 1, 'Alma da Copa', '🏆', 'moldura_copa', 'aura_copa', 'efeito_coracao_futebol', 'achievement-mitico', 'Alma da Copa', 'todos_jogos', 1),
  (6, 'Primeiro Grito de Gol', 'Sentiu o gosto da vitória ao acertar seu primeiro jogo.', 'comum', 'acertos', 1, 'Primeiro Grito de Gol', NULL, NULL, NULL, NULL, 'achievement-comum', 'Primeiro Grito de Gol', 'acertos', 1),
  (7, 'Hat-Trick', 'Demonstrou precisão absoluta acertando 3 placares exatos.', 'raro', 'exatos', 3, 'Hat-Trick', '⚽', NULL, NULL, NULL, 'achievement-raro', 'Hat-Trick', 'exatos', 3),
  (8, 'Artilheiro dos Placares', 'Mostrou habilidade e alcançou 5 palpites vencedores.', 'epico', 'acertos', 5, 'Artilheiro dos Placares', '🥅', 'moldura_artilheiro', NULL, NULL, 'achievement-epico', 'Artilheiro dos Placares', 'acertos', 5),
  (9, 'Rei da Bola', 'Entrou para a história ao acertar 10 placares exatos.', 'lendario', 'exatos', 10, 'Rei da Bola', '👑', 'moldura_real', 'aura_real', NULL, 'achievement-lendario', 'Rei da Bola', 'exatos', 10),
  (10, 'Oráculo do Mundial', 'Previu resultados como ninguém acertando 20 jogos da Copa.', 'mitico', 'acertos', 20, 'Oráculo do Mundial', '🔮', 'moldura_oraculo', 'aura_mistica', 'efeito_o_oraculo', 'achievement-mitico', 'Oráculo do Mundial', 'acertos', 20),
  (11, 'Mão Quente', 'Viveu uma fase iluminada vencendo 3 jogos consecutivos.', 'raro', 'sequencia', 3, 'Mão Quente', '🔥', NULL, NULL, NULL, 'achievement-raro', 'Mão Quente', 'sequencia', 3),
  (12, 'Imparável', 'Provou sua consistência acertando 5 jogos seguidos.', 'epico', 'sequencia', 5, 'Imparável', '🚀', 'moldura_sequencia', NULL, NULL, 'achievement-epico', 'Imparável', 'sequencia', 5),
  (13, 'Profeta do Futebol', 'Entrou para a história acertando 15 palpites consecutivos.', 'lendario', 'sequencia', 15, 'Profeta do Futebol', '🧠', 'moldura_profeta', 'aura_profeta', NULL, 'achievement-lendario', 'Profeta do Futebol', 'sequencia', 15),
  (14, 'Visão de Jogo', 'Manteve mais de 75% de aproveitamento após 30 palpites.', 'mitico', 'taxa_30', 75, 'Visão de Jogo', '👁️', 'moldura_visao', 'aura_estrategica', 'efeito_de_olho', 'achievement-mitico', 'Visão de Jogo', 'taxa_30', 75),
  (15, 'Rumo ao Hexa', 'Acertou uma vitória da Seleção Brasileira na Copa do Mundo.', 'raro', 'brasil', 1, 'Rumo ao Hexa', '🇧🇷', NULL, NULL, NULL, 'achievement-raro', 'Rumo ao Hexa', 'brasil', 1),
  (16, 'Sangue Verde e Amarelo', 'Demonstrou confiança na Seleção acertando 3 jogos do Brasil.', 'epico', 'brasil', 3, 'Sangue Verde e Amarelo', '💚', 'moldura_brasil', NULL, NULL, 'achievement-epico', 'Sangue Verde e Amarelo', 'brasil', 3),
  (17, 'Coração Canarinho', 'Mostrou que sempre acreditou na Seleção acertando 5 jogos do Brasil.', 'lendario', 'brasil', 5, 'Coração Canarinho', '💛', 'moldura_canarinho', 'aura_brasil', NULL, 'achievement-lendario', 'Coração Canarinho', 'brasil', 5),
  (18, 'Alma Canarinha', 'Acertou todos os jogos do Brasil e eternizou seu nome na torcida.', 'mitico', 'brasil_todos_acertos', 1, 'Alma Canarinha', '🟢', 'moldura_alma_canarinha', 'aura_canarinha', 'efeito_verde_amarelo', 'achievement-mitico', 'Alma Canarinha', 'brasil_todos_acertos', 1),
  (19, '12º Jogador', 'Demonstrou apoio absoluto à Seleção participando de todos os jogos do Brasil.', 'lendario', 'brasil_todos_participacao', 1, '12º Jogador', '🙌', 'moldura_torcida', 'aura_torcida', NULL, 'achievement-lendario', '12º Jogador', 'brasil_todos_participacao', 1),
  (20, 'Sobrevivente', 'Sobreviveu à pressão do mata-mata acertando um confronto eliminatório.', 'raro', 'mata_mata', 1, 'Sobrevivente', '🛡️', NULL, NULL, NULL, 'achievement-raro', 'Sobrevivente', 'mata_mata', 1),
  (21, 'Estratégia de Campeão', 'Mostrou inteligência competitiva acertando 3 jogos do mata-mata.', 'epico', 'mata_mata', 3, 'Estratégia de Campeão', '♟️', 'moldura_estrategia', NULL, NULL, 'achievement-epico', 'Estratégia de Campeão', 'mata_mata', 3),
  (22, 'Rei do Mata-Mata', 'Dominou os jogos decisivos acertando a semifinal da Copa.', 'lendario', 'semifinal', 1, 'Rei do Mata-Mata', '⚔️', 'moldura_mata_mata', 'aura_decisao', NULL, 'achievement-lendario', 'Rei do Mata-Mata', 'semifinal', 1),
  (23, 'Campeão Mundial', 'Previu corretamente o grande campeão da Copa do Mundo.', 'mitico', 'final', 1, 'Campeão Mundial', '🌍', 'moldura_campeao_mundial', 'aura_mundial', 'efeito_campeao_mundial', 'achievement-mitico', 'Campeão Mundial', 'final', 1),
  (24, 'Gol nos Acréscimos', 'Teve coragem e participou nos 2 minutos finais antes do fechamento dos palpites.', 'epico', 'acrescimos', 1, 'Gol nos Acréscimos', '⏱️', 'moldura_acrescimos', NULL, NULL, 'achievement-epico', 'Gol nos Acréscimos', 'acrescimos', 1)
ON CONFLICT (id) DO UPDATE SET
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
  valor = EXCLUDED.valor;

SELECT setval(
  pg_get_serial_sequence('conquistas', 'id'),
  COALESCE((SELECT MAX(id) FROM conquistas), 1),
  true
);
