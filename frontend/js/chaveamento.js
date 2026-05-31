protegerPagina(false);

const roundLabels = {
  left_16: '16 avos',
  right_16: '16 avos',
  left_oitavas: 'Oitavas',
  right_oitavas: 'Oitavas',
  left_quartas: 'Quartas',
  right_quartas: 'Quartas',
  left_semi: 'Semifinal',
  right_semi: 'Semifinal',
};

const roundSlots = {
  left_16: 8,
  right_16: 8,
  left_oitavas: 4,
  right_oitavas: 4,
  left_quartas: 2,
  right_quartas: 2,
  left_semi: 1,
  right_semi: 1,
};

function siglaOtimizada(nome) {
  return obterSigla(nome);
}

function score(valor) {
  return valor === null || valor === undefined ? '-' : valor;
}

function temPenaltis(jogo) {
  return jogo.penaltis_casa !== null && jogo.penaltis_casa !== undefined
    && jogo.penaltis_fora !== null && jogo.penaltis_fora !== undefined;
}

function scoreComPenaltis(jogo, lado) {
  const placar = lado === 'casa' ? jogo.placar_casa : jogo.placar_fora;
  const penaltis = lado === 'casa' ? jogo.penaltis_casa : jogo.penaltis_fora;
  return `${score(placar)}${temPenaltis(jogo) ? ` <em>(${score(penaltis)})</em>` : ''}`;
}

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function winnerClass(jogo, lado) {
  if (jogo.placar_casa === null || jogo.placar_fora === null) return '';
  if (lado === 'casa' && Number(jogo.placar_casa) > Number(jogo.placar_fora)) return 'winner';
  if (lado === 'fora' && Number(jogo.placar_fora) > Number(jogo.placar_casa)) return 'winner';
  if (Number(jogo.placar_casa) === Number(jogo.placar_fora) && temPenaltis(jogo)) {
    if (lado === 'casa' && Number(jogo.penaltis_casa) > Number(jogo.penaltis_fora)) return 'winner';
    if (lado === 'fora' && Number(jogo.penaltis_fora) > Number(jogo.penaltis_casa)) return 'winner';
  }
  return '';
}

function renderJogo(jogo, fase) {
  if (!jogo) return `
    <article class="bracket-match bracket-placeholder">
      <div class="bracket-phase">${fase}</div>
      <div class="bracket-team"><span>A definir</span><strong>-</strong></div>
      <div class="bracket-team"><span>A definir</span><strong>-</strong></div>
    </article>
  `;
  const bandeiraCasa = jogo.escudo_casa || obterUrlBandeira(jogo.time_casa);
  const bandeiraFora = jogo.escudo_fora || obterUrlBandeira(jogo.time_fora);
  const invalido = jogo.chaveamento_valido === false;
  return `
    <article class="bracket-match ${invalido ? 'bracket-invalid' : ''}" ${invalido ? `title="${jogo.chaveamento_erro || 'Jogo fora do encaixe esperado do chaveamento.'}"` : ''}>
      <div class="bracket-phase">${fase}</div>
      <div class="bracket-team ${winnerClass(jogo, 'casa')}">
        <span class="bracket-team-name">${bandeiraCasa ? `<img src="${bandeiraCasa}" alt="${jogo.time_casa}" class="bracket-flag">` : ''}${siglaOtimizada(jogo.time_casa)}</span>
        <strong>${scoreComPenaltis(jogo, 'casa')}</strong>
      </div>
      <div class="bracket-team ${winnerClass(jogo, 'fora')}">
        <span class="bracket-team-name">${bandeiraFora ? `<img src="${bandeiraFora}" alt="${jogo.time_fora}" class="bracket-flag">` : ''}${siglaOtimizada(jogo.time_fora)}</span>
        <strong>${scoreComPenaltis(jogo, 'fora')}</strong>
      </div>
    </article>
  `;
}

function renderRound(key, jogos) {
  const preenchidos = [...(jogos || [])];
  while (preenchidos.length < roundSlots[key]) preenchidos.push(null);
  return `
    <div class="bracket-round ${key}">
      <div class="bracket-round-title">${roundLabels[key]}</div>
      ${preenchidos.map((jogo) => renderJogo(jogo, roundLabels[key])).join('')}
    </div>
  `;
}

function renderFinal(jogo, premios) {
  if (!jogo) {
    return `
      <div class="final-card">
        <img class="bracket-trophy" src="/assets/trophy-login.png" alt="Trof&eacute;u">
        <div class="trophy">Final</div>
        <h2>A definir</h2>
        <div class="final-prize"><small>Pr&ecirc;mio acumulado da final</small><strong>${dinheiro(premios.final)}</strong></div>
        <p class="text-muted">Final sem palpite vencedor: acumulado + arrecadação da final; 20% vai para o ranking e 80% para a plataforma.</p>
        <p class="text-muted">Cadastre um jogo com fase final para preencher este bloco.</p>
      </div>
    `;
  }
  const bandeiraCasa = jogo.escudo_casa || obterUrlBandeira(jogo.time_casa);
  const bandeiraFora = jogo.escudo_fora || obterUrlBandeira(jogo.time_fora);
  return `
    <div class="final-card">
      <img class="bracket-trophy" src="/assets/trophy-login.png" alt="Trof&eacute;u">
      <div class="trophy">Final</div>
      <h2>Copa 2026</h2>
      <div class="final-prize"><small>Pr&ecirc;mio acumulado da final</small><strong>${dinheiro(premios.final)}</strong></div>
      <p class="text-muted">Final sem palpite vencedor: acumulado + arrecadação da final; 20% vai para o ranking e 80% para a plataforma.</p>
      <div class="team-final-row ${winnerClass(jogo, 'casa') ? 'champion' : ''}">
        ${bandeiraCasa ? `<img src="${bandeiraCasa}" alt="${jogo.time_casa}" class="bracket-flag-large">` : ''}
        <span>${jogo.time_casa}</span>
        <strong>${scoreComPenaltis(jogo, 'casa')}</strong>
      </div>
      <div class="vs">VS</div>
      <div class="team-final-row ${winnerClass(jogo, 'fora') ? 'champion' : ''}">
        ${bandeiraFora ? `<img src="${bandeiraFora}" alt="${jogo.time_fora}" class="bracket-flag-large">` : ''}
        <span>${jogo.time_fora}</span>
        <strong>${scoreComPenaltis(jogo, 'fora')}</strong>
      </div>
    </div>
  `;
}

async function carregarChaveamento() {
  const payload = await request('/chaveamento');
  const data = payload.rodadas || payload;
  const premios = payload.premios || { final: 0, ranking: 0 };
  const total = Object.entries(data)
    .filter(([key]) => key !== 'final')
    .flatMap(([, value]) => value || [])
    .filter(Boolean).length + (data.final ? 1 : 0);
  document.getElementById('bracketContainer').innerHTML = total ? `
    <div class="bracket-side">
      ${renderRound('left_16', data.left_16)}
      ${renderRound('left_oitavas', data.left_oitavas)}
      ${renderRound('left_quartas', data.left_quartas)}
      ${renderRound('left_semi', data.left_semi)}
    </div>
    <div class="final-wrapper">${renderFinal(data.final, premios)}</div>
    <div class="bracket-side right">
      ${renderRound('right_semi', data.right_semi)}
      ${renderRound('right_quartas', data.right_quartas)}
      ${renderRound('right_oitavas', data.right_oitavas)}
      ${renderRound('right_16', data.right_16)}
    </div>
  ` : '<section class="card">Nenhum jogo de mata-mata cadastrado ainda.</section>';
}

carregarChaveamento().catch((err) => {
  msg('mensagemChaveamento', err.message, 'error');
});
