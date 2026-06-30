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

function placarJogo(jogo) {
  return `${jogo.placar_casa ?? '-'} x ${jogo.placar_fora ?? '-'}`;
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
    document.getElementById('listaJogos').innerHTML = jogos.map((j) => {
      const aberto = Boolean(j.aberto_para_apostas);
      const bandeiraCasa = j.escudo_casa || obterUrlBandeira(j.time_casa);
      const bandeiraFora = j.escudo_fora || obterUrlBandeira(j.time_fora);
      const estatisticas = j.estatisticas || {};
      const termometro = estatisticas.termometro || { casa: 0, empate: 0, fora: 0 };
      const statusApostas = aberto
        ? '<span class="badge">Apostas liberadas</span>'
        : `<span class="status-badge pendente">${j.liberado_palpite ? 'Apostas encerradas' : 'Bloqueado'}</span>`;
      return `
        <article class="match-card">
          <div class="match-head">
            <span class="badge">${formatarFase(j.fase)}</span>
            <span>${formatarDataHoraJogo(j.data_jogo)}</span>
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
            <div><small>Placar atual</small><strong>${placarJogo(j)}</strong></div>
            <div><small>Status do jogo</small><strong>${j.status}</strong></div>
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
setInterval(carregarJogos, 15000);
