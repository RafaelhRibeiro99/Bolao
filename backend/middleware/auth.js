const jwt = require('jsonwebtoken');
require('dotenv').config();

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Token não informado.' });

  const token = header.replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido.' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.tipo !== 'admin') {
    return res.status(403).json({ message: 'Acesso permitido somente para administradores.' });
  }
  next();
}

module.exports = { auth, adminOnly };
