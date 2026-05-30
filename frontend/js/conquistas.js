protegerPagina(false);

function raridadeClass(grau) {
  return `achievement-${String(grau || 'comum').toLowerCase()}`;
}

function grauLabel(grau) {
  return {
    comum: 'Comum',
    raro: 'Raro',
    epico: 'Épico',
    lendario: 'Lendário',
    mitico: 'Mítico',
  }[grau] || grau;
}

function rewardClass(valor, prefixo) {
  const classe = String(valor || '');
  return classe.startsWith(prefixo) && /^[a-z0-9_]+$/.test(classe) ? classe : '';
}

function efeitoNomeLabel(valor) {
  return {
    efeito_coracao_futebol: 'Coração do futebol',
    efeito_o_oraculo: 'O Oráculo',
    efeito_de_olho: 'De Olho',
    efeito_verde_amarelo: 'Verde-Amarelo',
    efeito_campeao_mundial: 'Campeão Mundial',
    efeito_campeao: 'Coração do futebol',
    efeito_oraculo: 'O Oráculo',
    efeito_visao: 'De Olho',
  }[valor] || 'Efeito especial';
}

function tituloClasses(usuario) {
  return [
    'badge',
    'badge-premium',
    'titulo-equipado',
    rewardClass(usuario.moldura, 'moldura_') ? `titulo-${rewardClass(usuario.moldura, 'moldura_')}` : '',
    rewardClass(usuario.aura, 'aura_') ? `titulo-${rewardClass(usuario.aura, 'aura_')}` : '',
    rewardClass(usuario.efeito_nome, 'efeito_') ? `titulo-${rewardClass(usuario.efeito_nome, 'efeito_')}` : '',
  ].filter(Boolean).join(' ');
}

function nomeClasses(usuario) {
  return [
    rewardClass(usuario.efeito_nome, 'efeito_'),
    rewardClass(usuario.aura, 'aura_') ? `nome-${rewardClass(usuario.aura, 'aura_')}` : '',
  ].filter(Boolean).join(' ');
}

function normalizarConquista(c) {
  const meta = c.meta || c.valor || 1;
  const progresso = c.desbloqueada ? meta : 0;
  return {
    ...c,
    conquista_id: c.conquista_id || c.id,
    grau: String(c.grau || c.raridade || 'comum').toLowerCase(),
    meta,
    progresso,
  };
}

function recompensasConquista(c) {
  if (!c.desbloqueada) return '<span class="text-muted">Recompensas bloqueadas.</span>';
  const moldura = rewardClass(c.moldura, 'moldura_');
  const aura = rewardClass(c.aura, 'aura_');
  const efeito = rewardClass(c.efeito_nome, 'efeito_');
  return [
    c.titulo ? `<span class="reward-chip reward-title ${tituloClasses(c)}"><span>Título</span><strong>${c.titulo}</strong></span>` : '',
    c.emoji ? `<span class="badge">Emoji: ${c.emoji}</span>` : '',
    moldura ? `
      <span class="reward-chip reward-visual">
        <span>Moldura</span>
        <i class="reward-preview ${moldura}">${c.emoji || '★'}</i>
      </span>
    ` : '',
    aura ? `
      <span class="reward-chip reward-visual">
        <span>Aura</span>
        <i class="reward-preview ${aura}">${c.emoji || '★'}</i>
      </span>
    ` : '',
    efeito ? `<span class="reward-chip"><span>Efeito no nome</span><strong class="${efeito}">${efeitoNomeLabel(c.efeito_nome)}</strong></span>` : '',
  ].filter(Boolean).join('') || '<span class="text-muted">Título liberado.</span>';
}

async function equiparConquista(id) {
  try {
    await request(`/perfil/titulo/${id}`, { method: 'PUT' });
    await carregarConquistas();
  } catch (err) {
    msg('mensagemConquistas', err.message, 'error');
  }
}

let conquistasCache = [];
let conquistasDesbloqueadasAnt = [];

async function carregarConquistas() {
  const data = await request('/conquistas');
  const perfil = data.perfil || {};
  const conquistas = (data.conquistas || []).map(normalizarConquista);
  const classeMoldura = rewardClass(perfil.moldura, 'moldura_');
  const classeAura = rewardClass(perfil.aura, 'aura_');
  const classeEfeito = rewardClass(perfil.efeito_nome, 'efeito_');

  conquistasDesbloqueadasAnt = conquistas.filter(c => c.desbloqueada).map(c => c.conquista_id);
  conquistasCache = conquistas;

  document.getElementById('contadorConquistas').textContent =
    `${conquistas.filter(c => c.desbloqueada).length}/${conquistas.length}`;

  document.getElementById('perfilConquistas').innerHTML = `
    <div class="profile-left">
      <div class="avatar">${renderAvatarUsuario(perfil, { size: 'md' }).replace('avatar2d avatar2d-md', `avatar2d avatar2d-md ${classeMoldura} ${classeAura}`)}</div>
      <div>
        <h2 class="${nomeClasses(perfil)}">${perfil.nome_exibicao || perfil.nome || 'Participante'}</h2>
        <span class="${perfil.titulo_ativo ? tituloClasses(perfil) : 'badge'}">${perfil.titulo_ativo ? `${perfil.emoji_ativo || ''} ${perfil.titulo_ativo}` : 'Sem título equipado'}</span>
      </div>
    </div>
    <div>
      <strong class="stat-highlight">${conquistas.length ? Math.round(100 * conquistas.filter(c => c.desbloqueada).length / conquistas.length) : 0}%</strong>
      <small>Progresso de conquistas</small>
    </div>
  `;

  document.getElementById('listaConquistas').innerHTML = conquistas.map((c) => {
    const equipada = perfil.titulo_ativo === c.titulo;
    const pct = Math.min(100, Math.round((c.progresso / (c.meta || 1)) * 100));
    const progressoHtml = c.desbloqueada
      ? `
        <div class="achievement-progress-bar"><div class="progress" style="width:${pct}%"></div></div>
      `
      : '';
    const statusProgressoHtml = c.desbloqueada
      ? `<span class="progress-text">Concluida</span>`
      : '';
    return `
      <article class="card achievement-card ${c.desbloqueada ? 'unlocked' : 'locked'} ${raridadeClass(c.grau)} ${equipada ? 'equipped' : ''}">
        <div class="section-title">
          <div class="achievement-icon">${c.desbloqueada ? (c.emoji || '🏆') : '🔒'}</div>
          <span class="status-badge ${c.desbloqueada ? 'aprovado' : 'pendente'}">${c.desbloqueada ? 'Desbloqueada' : 'Bloqueada'}</span>
        </div>
        <h3>${c.nome}</h3>
        <p class="text-muted">${c.desbloqueada ? 'Conquista desbloqueada.' : 'Conquista ainda bloqueada.'}</p>
        ${progressoHtml}
        <div class="achievement-rewards">${recompensasConquista(c)}</div>
        <div class="achievement-footer">
          <span class="badge ${raridadeClass(c.grau)}">${grauLabel(c.grau)}</span>
          ${statusProgressoHtml}
          ${c.desbloqueada
            ? `<button class="${equipada ? 'btn btn-warning' : 'btn btn-primary'}" ${equipada ? 'disabled' : ''} onclick="equiparConquista(${c.conquista_id})">${equipada ? 'Equipado' : 'Equipar'}</button>`
            : ''}
        </div>
      </article>
    `;
  }).join('');
}

carregarConquistas().catch((err) => {
  document.getElementById('listaConquistas').innerHTML = `<div class="card">${err.message}</div>`;
});

window.equiparConquista = equiparConquista;

setInterval(carregarConquistas, 10000);
