protegerPagina(false);

const faseLabels = {
  fase_grupo: 'Fase de grupos',
  fase_grupos: 'Fase de grupos',
  '16_avos': '16 avos',
  oitavas: 'Oitavas',
  quartas: 'Quartas',
  semifinal: 'Semifinal',
  final: 'Final',
};

function formatarFase(fase) {
  return faseLabels[fase] || fase || 'Copa 2026';
}

function statusBadge(status) {
  const cls = status === 'finalizado' || status === 'fechado' ? 'bloqueado' : 'aprovado';
  return `<span class="status-badge ${cls}">${status}</span>`;
}

function dinheiro(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;
}

function barraTermometro(rotulo, percentual, classe) {
  return `
    <div class="thermo-row">
      <span>${rotulo}</span>
      <div class="thermo-track"><span class="${classe}" style="width: ${percentual}%"></span></div>
      <strong>${percentual}%</strong>
    </div>
  `;
}

async function carregarJogos() {
  try {
    const jogos = await request('/jogos');
    document.getElementById('listaJogos').innerHTML = jogos.map(j => {
      const aberto = Boolean(j.aberto_para_apostas);
      const bandeiraCasa = obterUrlBandeira(j.time_casa);
      const bandeiraFora = obterUrlBandeira(j.time_fora);
      const estatisticas = j.estatisticas || {};
      const termometro = estatisticas.termometro || { casa: 0, empate: 0, fora: 0 };
      const statusApostas = aberto
        ? '<span class="badge">Apostas liberadas</span>'
        : `<span class="status-badge pendente">${j.liberado_palpite ? 'Apostas encerradas' : 'Bloqueado'}</span>`;
      return `
        <article class="match-card">
          <div class="match-head">
            <span class="badge">${formatarFase(j.fase)}</span>
            <span>${new Date(j.data_jogo).toLocaleString('pt-BR')}</span>
          </div>
          <div class="match-teams">
            <span class="team-with-flag">
              ${bandeiraCasa ? `<img src="${bandeiraCasa}" alt="${j.time_casa}" class="flag-small">` : ''}
              ${j.time_casa}
            </span>
            <span class="vs">VS</span>
            <span class="team-with-flag">
              ${bandeiraFora ? `<img src="${bandeiraFora}" alt="${j.time_fora}" class="flag-small">` : ''}
              ${j.time_fora}
            </span>
          </div>
          <p>${statusBadge(j.status)} ${statusApostas}</p>
          <div class="match-stats">
            <div><small>Prêmio previsto</small><strong>${dinheiro(estatisticas.premio_previsto)}</strong></div>
            <div><small>Palpites no jogo</small><strong>${estatisticas.total_palpites || 0}</strong></div>
          </div>
          <div class="thermometer" aria-label="Termômetro de palpites">
            ${barraTermometro(j.time_casa, termometro.casa || 0, 'home')}
            ${barraTermometro('Empate', termometro.empate || 0, 'draw')}
            ${barraTermometro(j.time_fora, termometro.fora || 0, 'away')}
          </div>
          ${aberto
            ? `<a class="btn btn-success" href="/apostar.html?jogo=${j.id}">Apostar</a>`
            : `<button class="btn btn-danger" disabled>Apostas encerradas</button>`}
        </article>
      `;
    }).join('') || '<div class="card">Nenhum jogo cadastrado.</div>';
  } catch (err) {
    msg('mensagem', err.message, 'error');
  }
}

carregarJogos();
setInterval(carregarJogos, 30000);
