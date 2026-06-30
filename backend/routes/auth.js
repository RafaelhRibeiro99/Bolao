const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { sendVerificationEmail } = require('../services/email');
require('dotenv').config();

const router = express.Router();

const isStrongPassword = (senha) => {
  return String(senha || '').replace(/\D/g, '').length >= 4;
};

const somenteDigitos = (valor) => String(valor || '').replace(/\D/g, '');
const removerEspacos = (valor) => {
  const texto = String(valor || '').replace(/\s+/g, '');
  return texto || null;
};

router.post('/cadastro', async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  const whatsapp = removerEspacos(req.body.whatsapp);
  const termos_aceitos = Boolean(req.body.termos_aceitos || false);
  if (!nome || !email || !senha) return res.status(400).json({ message: 'Preencha todos os campos.' });
  if (!termos_aceitos) return res.status(400).json({ message: 'VocÃª precisa aceitar as regras do BolÃ£o.' });
  if (!isStrongPassword(senha)) return res.status(400).json({ message: 'A senha deve conter no minimo 4 digitos.' });

  let conn;
  try {
    conn = await pool.getConnection();
    const existe = await conn.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length) return res.status(409).json({ message: 'E-mail jÃ¡ cadastrado.' });

    const senhaHash = await bcrypt.hash(senha, 10);
    await conn.query(
      'INSERT INTO usuarios (nome, nome_exibicao, email, senha_hash, tipo, status_pagamento, whatsapp, avatar, termos_aceitos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nome, nome, email, senhaHash, 'user', 'pago', whatsapp, null, 1]
    );
    // criar token de verificaÃ§Ã£o e enviar e-mail
    try {
      const rows = await conn.query('SELECT id FROM usuarios WHERE email = ?', [email]);
      const userId = rows[0] && rows[0].id;
      if (userId) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
        await conn.query('INSERT INTO email_verifications (usuario_id, token, expires_at) VALUES (?, ?, ?)', [userId, token, expiresAt]);
        await sendVerificationEmail(email, token).catch((err) => {
          console.error('Erro ao enviar email de verificaÃ§Ã£o:', err.message || err);
        });
      }
    } catch (e) {
      // nÃ£o bloquear cadastro se envio falhar
      console.error('Erro ao criar/verificar token:', e.message || e);
    }
    res.status(201).json({ message: 'Cadastro criado. Agora vocÃª pode acessar a plataforma.' });
  } catch (error) {
    console.error('Erro ao cadastrar usuario:', error.message || error);
    res.status(500).json({ message: 'Erro ao cadastrar usuÃ¡rio.' });
  } finally {
    if (conn) conn.release();
  }
});

router.post('/recuperar-senha', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const telefone = somenteDigitos(req.body.telefone || req.body.whatsapp);
  const novaSenha = String(req.body.nova_senha || '');
  if (!email || !telefone || !novaSenha) return res.status(400).json({ message: 'Informe e-mail, telefone e nova senha.' });
  if (!isStrongPassword(novaSenha)) return res.status(400).json({ message: 'A senha deve conter no minimo 4 digitos.' });

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT id, whatsapp FROM usuarios WHERE email = ?', [email]);
    const usuario = rows.find((row) => somenteDigitos(row.whatsapp) === telefone);
    if (!usuario) return res.status(404).json({ message: 'E-mail e telefone nao conferem com um cadastro.' });

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await conn.query('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [senhaHash, usuario.id]);
    res.json({ message: 'Senha alterada com sucesso. Voce ja pode entrar.' });
  } catch (error) {
    console.error('Erro ao recuperar senha:', error.message || error);
    res.status(500).json({ message: 'Erro ao recuperar senha.' });
  } finally {
    if (conn) conn.release();
  }
});

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  if (!email || !senha) return res.status(400).json({ message: 'Informe email e senha.' });

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ message: 'Acesso invÃ¡lido.' });

    const usuario = rows[0];
    // E-mail nÃ£o precisa estar verificado para fazer login em ambiente de teste
    // if (!usuario.email_verified) return res.status(403).json({ message: 'E-mail nÃ£o verificado', verified: false });
    const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaOk) return res.status(401).json({ message: 'Acesso invÃ¡lido.' });

    const token = jwt.sign(
      { id: Number(usuario.id), nome: usuario.nome, tipo: usuario.tipo, pagamento: usuario.status_pagamento },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: Number(usuario.id),
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        pagamento: usuario.status_pagamento,
      },
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error.message || error);
    res.status(500).json({ message: 'Erro ao fazer login.' });
  } finally {
    if (conn) conn.release();
  }
});

router.get('/check-email', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ message: 'E-mail Ã© obrigatÃ³rio.' });
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    res.json({ available: rows.length === 0 });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao verificar email.' });
  } finally {
    if (conn) conn.release();
  }
});

// reenviar token de verificaÃ§Ã£o
router.post('/send-verification', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ message: 'E-mail Ã© obrigatÃ³rio.' });
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT id, email_verified FROM usuarios WHERE email = ?', [email]);
    if (!rows.length) return res.status(404).json({ message: 'UsuÃ¡rio nÃ£o encontrado.' });
    const user = rows[0];
    if (user.email_verified) return res.json({ message: 'E-mail jÃ¡ verificado.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await conn.query('INSERT INTO email_verifications (usuario_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expiresAt]);
    await sendVerificationEmail(email, token).catch((err) => {
      console.error('Erro ao enviar email de verificaÃ§Ã£o:', err.message || err);
    });
    res.json({ message: 'Token de verificaÃ§Ã£o enviado.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao enviar verificaÃ§Ã£o.' });
  } finally {
    if (conn) conn.release();
  }
});

// verificar token
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'Token Ã© obrigatÃ³rio.' });
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT id, usuario_id, expires_at FROM email_verifications WHERE token = ?', [token]);
    if (!rows.length) return res.status(400).json({ message: 'Token invÃ¡lido.' });
    const ver = rows[0];
    if (new Date(ver.expires_at) < new Date()) return res.status(400).json({ message: 'Token expirado.' });
    await conn.query('UPDATE usuarios SET email_verified = 1 WHERE id = ?', [ver.usuario_id]);
    await conn.query('DELETE FROM email_verifications WHERE id = ?', [ver.id]);
    res.json({ message: 'E-mail verificado com sucesso. VocÃª jÃ¡ pode entrar.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao verificar token.' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;

