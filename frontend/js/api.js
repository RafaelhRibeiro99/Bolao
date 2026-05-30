const API = '/api';

function getToken() { return localStorage.getItem('token'); }
function getUser() { return JSON.parse(localStorage.getItem('usuario') || 'null'); }
function setSession(data) {
  localStorage.setItem('token', data.token);
  localStorage.setItem('usuario', JSON.stringify(data.usuario));
}
function logout() {
  localStorage.clear();
  location.href = '/index.html';
}

function corrigirTextoMojibake(texto) {
  if (typeof texto !== 'string') return texto;
  return texto
    .replace(/Ã¡/g, 'á')
    .replace(/Ã /g, 'à')
    .replace(/Ã¢/g, 'â')
    .replace(/Ã£/g, 'ã')
    .replace(/Ã©/g, 'é')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã´/g, 'ô')
    .replace(/Ãµ/g, 'õ')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã§/g, 'ç')
    .replace(/nÆo/g, 'não')
    .replace(/NÆo/g, 'Não')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã‡/g, 'Ç')
    .replace(/Âº/g, 'º')
    .replace(/Âª/g, 'ª');
}

async function request(url, options = {}) {
  const { skipAchievementCheck = false, ...fetchOptions } = options;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API + url, { ...fetchOptions, headers });
  const contentType = res.headers.get('content-type') || '';
  let data = {};
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}));
  } else if (!res.ok) {
    data = await res.text().catch(() => ({}));
  } else {
    throw new Error('Resposta inválida do servidor.');
  }

  if (!res.ok) throw new Error(corrigirTextoMojibake(data.message || 'Erro na requisição.'));
  const method = String(fetchOptions.method || 'GET').toUpperCase();
  if (!skipAchievementCheck && method !== 'GET' && url !== '/conquistas') {
    setTimeout(() => verificarConquistasToast({ forcarNotificacao: url === '/palpites' }), 800);
  }
  return data;
}

function msg(elementId, text, type = 'success') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.className = `alert ${type}`;
  el.textContent = corrigirTextoMojibake(text);
}

function protegerPagina(admin = false) {
  const usuario = getUser();
  if (!usuario || !getToken()) location.href = '/login.html';
  if (admin && usuario.tipo !== 'admin') location.href = '/dashboard.html';
}

function normalizarConquistaToast(conquista) {
  return {
    ...conquista,
    conquista_id: conquista.conquista_id || conquista.id,
    grau: conquista.grau || conquista.raridade || 'comum',
  };
}

function mostrarToastConquistaGlobal(conquista) {
  const c = normalizarConquistaToast(conquista);
  const toast = document.createElement('div');
  toast.className = `toast-conquista ${String(c.grau).toLowerCase()}`;
  toast.innerHTML = `
    <div class="toast-icon">🏆</div>
    <div class="toast-content">
      <div class="toast-title">NOVA CONQUISTA</div>
      <div class="toast-nome">✨ ${c.nome}</div>
      <div class="toast-desc">${c.descricao}</div>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('show'); }, 100);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 800); }, 5000);
}

function conquistasToastKey() {
  const usuario = getUser();
  return `conquistas_vistas_${usuario?.id || usuario?.email || 'anon'}`;
}

async function verificarConquistasToast({ silencioso = false, forcarNotificacao = false } = {}) {
  const usuario = getUser();
  if (!usuario || !getToken() || usuario.tipo === 'admin') return;

  try {
    const data = await request('/conquistas', { skipAchievementCheck: true });
    const desbloqueadas = (data.conquistas || [])
      .map(normalizarConquistaToast)
      .filter((conquista) => conquista.desbloqueada);
    const idsAtuais = desbloqueadas.map((conquista) => String(conquista.conquista_id));
    const key = conquistasToastKey();
    const idsVistos = JSON.parse(localStorage.getItem(key) || 'null');

    if ((Array.isArray(idsVistos) || forcarNotificacao) && !silencioso) {
      desbloqueadas
        .filter((conquista) => !Array.isArray(idsVistos) || !idsVistos.includes(String(conquista.conquista_id)))
        .forEach(mostrarToastConquistaGlobal);
    }

    localStorage.setItem(key, JSON.stringify(idsAtuais));
  } catch {
    // O monitor de conquistas não deve atrapalhar a tela atual.
  }
}

function iniciarMonitorConquistas() {
  const usuario = getUser();
  if (!usuario || !getToken() || usuario.tipo === 'admin') return;
  verificarConquistasToast({ silencioso: localStorage.getItem(conquistasToastKey()) === null });
  setInterval(() => verificarConquistasToast(), 5000);
}

window.verificarConquistasToast = verificarConquistasToast;
document.addEventListener('DOMContentLoaded', iniciarMonitorConquistas);
