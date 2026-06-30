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
  const temMojibake = [...texto].some((char) => [194, 195, 226, 240].includes(char.charCodeAt(0)) || char === '\uFFFD');
  if (!temMojibake) return texto;
  try {
    return decodeURIComponent(escape(texto));
  } catch (_err) {
    return texto;
  }
}

async function request(url, options = {}) {
  const fetchOptions = options;
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

function mostrarAtalhoAdmin() {
  const usuario = getUser();
  if (!usuario || usuario.tipo !== 'admin') return;
  const paginasPublicas = new Set([
    '/',
    '/index.html',
    '/login.html',
    '/cadastro.html',
    '/recuperar-senha.html',
    '/verificacao.html',
  ]);
  if (location.pathname === '/admin.html' || paginasPublicas.has(location.pathname)) return;

  const menu = document.querySelector('.nav-menu');
  if (!menu || menu.querySelector('a[href="/admin.html"]')) return;

  const link = document.createElement('a');
  link.href = '/admin.html';
  link.textContent = 'Admin';
  menu.prepend(link);

  const main = document.querySelector('main');
  if (!main || document.querySelector('.admin-return-strip')) return;

  const aviso = document.createElement('div');
  aviso.className = 'admin-return-strip';
  aviso.innerHTML = `
    <span>Você está vendo a área do usuário como administrador.</span>
    <a class="btn btn-primary" href="/admin.html">Voltar ao painel admin</a>
  `;
  main.prepend(aviso);
}

function prepararInterfaceApp() {
  const usuario = getUser();
  const path = location.pathname || '/';
  const paginasPublicas = new Set([
    '/',
    '/index.html',
    '/login.html',
    '/cadastro.html',
    '/recuperar-senha.html',
    '/verificacao.html',
  ]);

  document.body.classList.toggle('public-screen', paginasPublicas.has(path));
  document.body.classList.toggle('app-screen', Boolean(usuario && getToken() && !paginasPublicas.has(path)));
  document.body.classList.toggle('admin-screen-body', path === '/admin.html');

  const menu = document.querySelector('.nav-menu');
  if (menu) {
    menu.querySelectorAll('a').forEach((link) => {
      const href = link.getAttribute('href') || '';
      link.classList.toggle('active', href === path || (path === '/' && href.endsWith('/index.html')));
    });
  }

  if (!usuario || !getToken() || paginasPublicas.has(path) || path === '/admin.html' || document.querySelector('.bottom-nav')) {
    return;
  }

  const items = [
    { href: '/dashboard.html', icon: '⌂', label: 'Início', active: ['/dashboard.html'] },
    { href: '/jogos.html', icon: '▦', label: 'Jogos', active: ['/jogos.html'] },
    { href: '/chaveamento.html', icon: '⌘', label: 'Chaveamento', active: ['/chaveamento.html'] },
    { href: '/perfil.html', icon: '◔', label: 'Perfil', active: ['/perfil.html'] },
    { href: '/regras.html', icon: '§', label: 'Regras', active: ['/regras.html'] },
    { href: '#', icon: '&times;', label: 'Sair', active: [], logout: true },
  ];

  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.setAttribute('aria-label', 'Navegação principal');
  nav.innerHTML = items.map((item) => `
    <a href="${item.href}" class="${item.active.includes(path) ? 'active' : ''}" ${item.logout ? 'onclick="event.preventDefault(); logout();"' : ''}>
      <span>${item.icon}</span>
      <small>${item.label}</small>
    </a>
  `).join('');
  document.body.appendChild(nav);
}

document.addEventListener('DOMContentLoaded', () => {
  prepararInterfaceApp();
  mostrarAtalhoAdmin();
});
