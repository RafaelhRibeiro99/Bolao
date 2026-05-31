protegerPagina(false);

function dinheiro(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;
}

function rewardClass(valor, prefixo) {
  const classe = String(valor || '');
  return classe.startsWith(prefixo) && /^[a-z0-9_]+$/.test(classe) ? classe : '';
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

let meusPalpitesCache = [];

function statusApostaLabel(status) {
  return { pendente: 'Pendente', aprovado: 'Aprovada', reprovado: 'Reprovada' }[status] || status || 'Pendente';
}

function escapeHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function resultadoPalpite(palpite) {
  if (palpite.status === 'finalizado') return `${palpite.placar_casa ?? '-'} x ${palpite.placar_fora ?? '-'}`;
  return '- x -';
}

function classePalpite(palpite) {
  if (palpite.vencedor) return 'palpite-vencedor';
  if (palpite.perdedor) return 'palpite-perdedor';
  return '';
}

function situacaoPalpite(palpite) {
  if (palpite.vencedor) return '<span class="result-chip winner-chip">🏆 Ganhou</span>';
  if (palpite.perdedor) return '<span class="result-chip loser-chip">✕ Perdeu</span>';
  if (palpite.status === 'finalizado' && Number(palpite.jogo_validado || 0) !== 1 && palpite.status_aposta === 'aprovado') {
    return '<span class="result-chip pending-chip">⌛ Não validado</span>';
  }
  return `<span class="status-badge ${palpite.status_aposta}">${statusApostaLabel(palpite.status_aposta)}</span>`;
}

function ganhoPalpite(palpite) {
  if (!palpite.vencedor) return '';
  return `<div><small>Ganho</small><strong class="prize-value">${dinheiro(palpite.premio)}</strong></div>`;
}

function motivoReprovacaoPalpite(palpite) {
  if (palpite.status_aposta !== 'reprovado') return '';
  const motivo = corrigirTextoMojibake(palpite.motivo_reprovacao || 'Motivo não informado pelo administrador.');
  return `
    <div class="rejection-reason" role="alert">
      <strong>⚠️ Aposta reprovada</strong>
      <span>${escapeHtml(motivo)}</span>
    </div>
  `;
}

function renderizarMinhasApostas() {
  const lista = document.getElementById('listaMinhasApostas');
  if (!lista) return;

  lista.innerHTML = meusPalpitesCache.map((palpite) => `
    <div class="bet-row ${classePalpite(palpite)}">
      <div>
        <strong>${palpite.time_casa} vs ${palpite.time_fora}</strong>
        <small>${new Date(palpite.data_jogo).toLocaleString('pt-BR')}</small>
      </div>
      <div><small>Codigo</small><strong class="bet-code">${palpite.codigo_aposta || '-'}</strong></div>
      <div><small>Palpite</small><strong>${palpite.palpite_casa} x ${palpite.palpite_fora}</strong></div>
      <div><small>Resultado</small><strong>${resultadoPalpite(palpite)}</strong></div>
      ${ganhoPalpite(palpite)}
      ${situacaoPalpite(palpite)}
      ${motivoReprovacaoPalpite(palpite)}
    </div>
  `).join('') || '<p class="text-muted">Voce ainda nao fez apostas.</p>';
}

async function carregarPerfil() {
  const usuario = await request('/me');
  localStorage.setItem('usuario', JSON.stringify(usuario));
  const avatarEl = document.getElementById('avatarUsuario');
  avatarEl.innerHTML = renderAvatarUsuario(usuario, { size: 'md' });
  avatarEl.className = 'avatar';
  const classeMoldura = rewardClass(usuario.moldura, 'moldura_');
  const classeAura = rewardClass(usuario.aura, 'aura_');
  const avatar2d = avatarEl.querySelector('.avatar2d');
  if (classeMoldura) avatar2d?.classList.add(classeMoldura);
  if (classeAura) avatar2d?.classList.add(classeAura);

  document.getElementById('nomeUsuario').innerHTML = `
    <span class="${nomeClasses(usuario)}">${usuario.nome_exibicao || usuario.nome}</span>
    ${usuario.titulo_ativo ? `<span class="${tituloClasses(usuario)}">${usuario.emoji_ativo || ''} ${usuario.titulo_ativo}</span>` : ''}
  `;

  const aviso = document.getElementById('avisoPalpites');
  aviso.className = 'notice warning';
  aviso.textContent = 'Seu acesso a plataforma e imediato. Cada palpite fica pendente e so entra no bolao apos aprovacao do administrador.';
}

async function carregarMetricas() {
  const rows = await request('/meus-palpites');
  meusPalpitesCache = rows;
  const total = rows.length;
  const aprovadas = rows.filter(p => p.status_aposta === 'aprovado').length;
  const pontos = rows.reduce((sum, p) => sum + Number(p.pontos || 0), 0);
  const acertos = rows.filter(p => Number(p.pontos || 0) > 0).length;

  document.getElementById('totalApostas').textContent = `⚽ ${total}`;
  document.getElementById('totalAprovadas').textContent = `🔥 ${aprovadas}`;
  document.getElementById('totalApostado').textContent = `💰 ${dinheiro(aprovadas * 5)}`;
  document.getElementById('totalGanho').textContent = `🏆 ${dinheiro(pontos * 4)}`;
  document.getElementById('taxaAcerto').textContent = `🎯 ${total ? Math.round((acertos / total) * 100) : 0}%`;
  renderizarMinhasApostas();
}

async function carregarResumoJogos() {
  const jogos = await request('/jogos');
  const hoje = new Date().toLocaleDateString('pt-BR');
  const jogosHoje = jogos.filter(j => new Date(j.data_jogo).toLocaleDateString('pt-BR') === hoje);
  document.getElementById('jogosHoje').innerHTML = (jogosHoje.length ? jogosHoje : jogos.slice(0, 3)).map(j => `
    <div class="mini-row">
      <strong>
        <span class="team-with-flag">
          ${(j.escudo_casa || obterUrlBandeira(j.time_casa)) ? `<img src="${j.escudo_casa || obterUrlBandeira(j.time_casa)}" alt="${j.time_casa}" class="flag-small">` : ''}
          ${j.time_casa}
        </span>
        <span class="vs">VS</span>
        <span class="team-with-flag">
          ${(j.escudo_fora || obterUrlBandeira(j.time_fora)) ? `<img src="${j.escudo_fora || obterUrlBandeira(j.time_fora)}" alt="${j.time_fora}" class="flag-small">` : ''}
          ${j.time_fora}
        </span>
      </strong>
      <span class="status-badge ${j.status === 'finalizado' ? 'bloqueado' : 'aprovado'}">${j.status}</span>
    </div>
  `).join('') || '<p class="text-muted">Nenhum jogo cadastrado.</p>';
}

async function carregarConquistasResumo() {
  const data = await request('/conquistas');
  const desbloqueadas = data.conquistas.filter(c => c.desbloqueada).slice(0, 3);
  const proximas = data.conquistas.filter(c => !c.desbloqueada).slice(0, 3);
  const itens = desbloqueadas.length ? desbloqueadas : proximas;
  document.getElementById('conquistasResumo').innerHTML = itens.map(c => `
    <div class="mini-row"><strong>${c.emoji || c.icone || '🏆'} ${c.nome}</strong><small>${c.descricao}</small></div>
  `).join('') || '<p class="text-muted">Nenhuma conquista cadastrada.</p>';
}

async function init() {
  try {
    await carregarPerfil();
    await carregarMetricas();
    await carregarResumoJogos();
    await carregarConquistasResumo();
  } catch (err) {
    const el = document.getElementById('avisoPalpites');
    if (el) {
      el.className = 'notice error';
      el.textContent = err.message;
    }
  }
}

init();
