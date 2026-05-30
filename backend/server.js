const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/health/db', async (_req, res) => {
  let conn;
  try {
    conn = await require('./config/db').getConnection();
    await conn.query('SELECT 1 AS ok');
    res.json({ ok: true, database: true });
  } catch (error) {
    console.error('Erro no health check do banco:', error.message || error);
    res.status(500).json({
      ok: false,
      database: false,
      message: error.message || 'Erro ao conectar no banco.',
    });
  } finally {
    if (conn) conn.release();
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bolão Brasil rodando em http://localhost:${PORT}`));
