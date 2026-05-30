protegerPagina(false);

function raridadeClass(grau) {
  return `achievement-${String(grau || 'comum').toLowerCase()}`;
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

function perfilRanking(usuario) {
  const classeMoldura = rewardClass(usuario.moldura, 'moldura_');
  const classeAura = rewardClass(usuario.aura, 'aura_');
  const classeEfeito = rewardClass(usuario.efeito_nome, 'efeito_');
  return `
    <div class="ranking-profile">
      <div class="avatar">
        ${renderAvatarUsuario(usuario, { size: 'sm' }).replace('avatar2d avatar2d-sm', `avatar2d avatar2d-sm ${classeMoldura} ${classeAura}`)}
      </div>
      <div>
        <strong class="${nomeClasses(usuario)}">${usuario.nome}</strong>
        ${usuario.titulo_ativo ? `<span class="${tituloClasses(usuario)}">${usuario.emoji_ativo || ''} ${usuario.titulo_ativo}</span>` : ''}
      </div>
    </div>
  `;
}

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function carregarPremioRanking() {
  const box = document.getElementById('rankingPrize');
  if (!box) return;
  try {
    const premios = await request('/premios');
    box.innerHTML = `
      <div>
        <small>Pr&ecirc;mio acumulado para o 1&ordm; lugar do ranking</small>
        <strong>${dinheiro(premios.ranking)}</strong>
      </div>
      <span>Vem dos 20% dos jogos sem palpite vencedor.</span>
    `;
  } catch {
    box.innerHTML = '';
  }
}

async function carregarRanking() {
  await carregarPremioRanking();
  const rows = await request('/ranking');
  document.getElementById('rankingPodium').innerHTML = rows.slice(0, 3).map((r, i) => `
    <div class="card podium-card ${i === 0 ? 'first' : ''} ${raridadeClass(r.raridade_maxima)}">
      <span class="medal">${['🥇', '🥈', '🥉'][i]}</span>
      <div class="avatar" style="margin:0 auto 12px;">${renderAvatarUsuario(r, { size: 'md' }).replace('avatar2d avatar2d-md', `avatar2d avatar2d-md ${rewardClass(r.moldura, 'moldura_')} ${rewardClass(r.aura, 'aura_')}`)}</div>
      <h3 class="${nomeClasses(r)}">${r.nome}</h3>
      <div class="${r.titulo_ativo ? tituloClasses(r) : 'badge badge-premium'}">${r.titulo_ativo ? `${r.emoji_ativo || ''} ${r.titulo_ativo}` : ''}</div>
      <div class="raridade-maxima">${r.raridade_maxima || ''}</div>
      <div class="conquistas-recentes">${(r.conquistas_recentes || []).map(c => `<span class="badge ${raridadeClass(c.grau)}">${c.emoji || ''} ${c.nome}</span>`).join(' ')}</div>
      <p><strong>🏆 ${r.conquistas || 0}</strong> conquistas</p>
      <p><strong>🎯 ${r.acertos || 0}</strong> acertos</p>
      <p class="text-muted">⚽ ${r.apostas || 0} palpites</p>
    </div>
  `).join('');

  document.getElementById('ranking').innerHTML = rows.map((r, i) => {
    const taxa = Number.isFinite(Number(r.taxa_acerto))
      ? Number(r.taxa_acerto)
      : (r.apostas ? Math.round((Number(r.acertos || 0) / Number(r.apostas || 1)) * 100) : 0);
    return `
      <tr>
        <td>${['🥇', '🥈', '🥉'][i] || `#${i + 1}`}</td>
        <td>${perfilRanking(r)}</td>
        <td>🏆 ${r.conquistas || 0}</td>
        <td>🎯 ${taxa}%</td>
        <td>⚽ ${r.apostas || 0}</td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="5">Ranking vazio.</td></tr>';
}

carregarRanking().catch(err => {
  document.getElementById('ranking').innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`;
});
