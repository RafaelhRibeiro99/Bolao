protegerPagina(false);

function dinheiro(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;
}

function formatarDataHoraJogo(valor) {
  if (!valor) return '-';
  const texto = String(valor);
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}, ${match[4]}:${match[5]}`;
  }
  return texto;
}

function dataJogoPtBr(valor) {
  const texto = String(valor || '');
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return '';
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
  if (palpite.vencedor) return '<span class="result-chip winner-chip">Ganhou</span>';
  if (palpite.perdedor) return '<span class="result-chip loser-chip">Perdeu</span>';
  if (palpite.status === 'finalizado' && Number(palpite.jogo_validado || 0) !== 1 && palpite.status_aposta === 'aprovado') {
    return '<span class="result-chip pending-chip">Não validado</span>';
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
      <strong>Aposta reprovada</strong>
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
        <small>${formatarDataHoraJogo(palpite.data_jogo)}</small>
      </div>
      <div><small>Código</small><strong class="bet-code">${palpite.codigo_aposta || '-'}</strong></div>
      <div><small>Palpite</small><strong>${palpite.palpite_casa} x ${palpite.palpite_fora}</strong></div>
      <div><small>Resultado</small><strong>${resultadoPalpite(palpite)}</strong></div>
      ${ganhoPalpite(palpite)}
      ${situacaoPalpite(palpite)}
      ${motivoReprovacaoPalpite(palpite)}
    </div>
  `).join('') || '<p class="text-muted">Você ainda não fez apostas.</p>';
}

async function carregarPerfil() {
  const usuario = await request('/me');
  localStorage.setItem('usuario', JSON.stringify(usuario));
  const avatarEl = document.getElementById('avatarUsuario');
  avatarEl.innerHTML = renderAvatarUsuario(usuario, { size: 'md' });
  avatarEl.className = 'avatar';
  document.getElementById('nomeUsuario').textContent = usuario.nome_exibicao || usuario.nome || 'Participante';

  const aviso = document.getElementById('avisoPalpites');
  aviso.className = 'notice warning';
  aviso.textContent = 'Seu acesso à plataforma é imediato. Cada palpite fica pendente e só entra no Bolão após aprovação do administrador.';
}

async function carregarMetricas() {
  const rows = await request('/meus-palpites');
  meusPalpitesCache = rows;
  const total = rows.length;
  const aprovadas = rows.filter(p => p.status_aposta === 'aprovado').length;
  const ganhos = rows.reduce((sum, p) => sum + Number(p.premio || 0), 0);
  const acertos = rows.filter(p => Number(p.pontos || 0) > 0).length;

  document.getElementById('totalApostas').textContent = `⚽ ${total}`;
  document.getElementById('totalAprovadas').textContent = `🔥 ${aprovadas}`;
  document.getElementById('totalApostado').textContent = `💰 ${dinheiro(aprovadas * 5)}`;
  document.getElementById('totalGanho').textContent = `🏆 ${dinheiro(ganhos)}`;
  document.getElementById('taxaAcerto').textContent = `🎯 ${total ? Math.round((acertos / total) * 100) : 0}%`;
  renderizarMinhasApostas();
}

async function carregarResumoJogos() {
  const jogos = await request('/jogos');
  const hoje = new Date().toLocaleDateString('pt-BR');
  const jogosHoje = jogos.filter(j => dataJogoPtBr(j.data_jogo) === hoje);
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

async function init() {
  try {
    await carregarPerfil();
    await carregarMetricas();
    await carregarResumoJogos();
  } catch (err) {
    const el = document.getElementById('avisoPalpites');
    if (el) {
      el.className = 'notice error';
      el.textContent = err.message;
    }
  }
}

init();
