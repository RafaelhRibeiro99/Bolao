CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  nome_exibicao VARCHAR(120) NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  email_verified SMALLINT NOT NULL DEFAULT 0,
  tipo VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (tipo IN ('user','admin')),
  status_pagamento VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente','pago','bloqueado')),
  whatsapp VARCHAR(30) NULL,
  pix_chave VARCHAR(120) NULL,
  avatar VARCHAR(20) NULL,
  avatar_face VARCHAR(80) NULL DEFAULT 'messi.png',
  termos_aceitos SMALLINT NOT NULL DEFAULT 0,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL,
  token VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ev_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jogos (
  id SERIAL PRIMARY KEY,
  time_casa VARCHAR(80) NOT NULL,
  time_fora VARCHAR(80) NOT NULL,
  codigo_casa VARCHAR(10) NULL,
  codigo_fora VARCHAR(10) NULL,
  bandeira_casa VARCHAR(255) NULL,
  bandeira_fora VARCHAR(255) NULL,
  data_jogo TIMESTAMP NOT NULL,
  placar_casa INT NULL,
  placar_fora INT NULL,
  penaltis_casa INT NULL,
  penaltis_fora INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','encerrando','fechado','em_andamento','finalizado','cancelado')),
  fase VARCHAR(20) NOT NULL DEFAULT 'fase_grupos' CHECK (fase IN ('fase_grupos','16_avos','oitavas','quartas','semifinal','final')),
  liberado_palpite SMALLINT NOT NULL DEFAULT 0,
  premio_acumulado DECIMAL(10,2) NOT NULL DEFAULT 0,
  taxa_admin DECIMAL(10,2) NOT NULL DEFAULT 0,
  jogo_validado SMALLINT NOT NULL DEFAULT 0,
  is_final SMALLINT NOT NULL DEFAULT 0,
  api_jogo_id VARCHAR(80) NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS times (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(80) NOT NULL UNIQUE,
  codigo VARCHAR(10) NULL,
  escudo VARCHAR(255) NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS palpites (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL,
  jogo_id INT NOT NULL,
  codigo_aposta VARCHAR(6) NULL UNIQUE,
  palpite_casa INT NOT NULL,
  palpite_fora INT NOT NULL,
  status_aposta VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status_aposta IN ('pendente','aprovado','reprovado')),
  motivo_reprovacao TEXT NULL,
  pontos INT NOT NULL DEFAULT 0,
  data_palpite TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_palpite_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_palpite_jogo FOREIGN KEY (jogo_id) REFERENCES jogos(id) ON DELETE CASCADE
);

INSERT INTO usuarios (nome, email, senha_hash, tipo, status_pagamento, email_verified)
SELECT 'Administrador', 'admin@bolao.com', '$2a$10$x0UD5aERiy4wxNSOJSmKo.dufv4Vv0nZz/1UcZHwhv2YeedkN1pxO', 'admin', 'pago', 1
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@bolao.com');

INSERT INTO jogos (time_casa, time_fora, data_jogo, status, liberado_palpite)
SELECT 'Brasil', 'Argentina', '2026-06-15 16:00:00', 'aberto', 1
WHERE NOT EXISTS (SELECT 1 FROM jogos WHERE time_casa='Brasil' AND time_fora='Argentina');

INSERT INTO times (nome)
SELECT nome FROM (VALUES
  ('África do Sul'),
  ('Alemanha'),
  ('Argélia'),
  ('Argentina'),
  ('Arsenal'),
  ('Arábia Saudita'),
  ('Austrália'),
  ('Áustria'),
  ('Bélgica'),
  ('Bósnia e Herzegovina'),
  ('Brasil'),
  ('Cabo Verde'),
  ('Canadá'),
  ('Colômbia'),
  ('Coreia do Sul'),
  ('Costa do Marfim'),
  ('Croácia'),
  ('Curazao'),
  ('Egito'),
  ('Equador'),
  ('Escócia'),
  ('Espanha'),
  ('Estados Unidos'),
  ('França'),
  ('Gana'),
  ('Haiti'),
  ('Inglaterra'),
  ('Irã'),
  ('Iraque'),
  ('Japão'),
  ('Jordânia'),
  ('Marrocos'),
  ('México'),
  ('Nigéria'),
  ('Noruega'),
  ('Nova Zelândia'),
  ('Países Baixos'),
  ('Panamá'),
  ('Paraguai'),
  ('PSG'),
  ('Portugal'),
  ('Qatar'),
  ('República Democrática do Congo'),
  ('República Tcheca'),
  ('Senegal'),
  ('Suécia'),
  ('Suíça'),
  ('Tunísia'),
  ('Turquia'),
  ('Uruguai'),
  ('Uzbequistão')
) AS seed(nome)
WHERE NOT EXISTS (SELECT 1 FROM times WHERE LOWER(times.nome) = LOWER(seed.nome));
