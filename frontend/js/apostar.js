protegerPagina(false);

const VALOR_PALPITE = 5;

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

function placarJogo(jogo) {
  const casa = jogo?.placar_casa ?? '-';
  const fora = jogo?.placar_fora ?? '-';
  return `${casa} x ${fora}`;
}

const params = new URLSearchParams(location.search);
const jogoId = params.get('jogo');
let jogoAtual = null;
const pixPagamento = '62 993000262';

function criarLinhaPalpite(casa = '', fora = '') {
  const lista = document.getElementById('palpitesLista');
  const index = lista.querySelectorAll('.multi-bet-row').length + 1;
  const linha = document.createElement('div');
  linha.className = 'multi-bet-row';
  linha.innerHTML = `
    <strong class="multi-bet-index">#${index}</strong>
    <label><span class="nome-casa">${jogoAtual?.time_casa || 'Casa'}</span><input class="palpite-casa" type="number" min="0" value="${casa}" required></label>
    <label><span class="nome-fora">${jogoAtual?.time_fora || 'Fora'}</span><input class="palpite-fora" type="number" min="0" value="${fora}" required></label>
    <button class="danger remover-palpite" type="button" title="Remover palpite">Remover</button>
  `;
  linha.querySelector('.remover-palpite').addEventListener('click', () => {
    if (lista.querySelectorAll('.multi-bet-row').length === 1) {
      linha.querySelectorAll('input').forEach((input) => { input.value = ''; });
      return;
    }
    linha.remove();
    renumerarPalpites();
  });
  lista.appendChild(linha);
}

function renumerarPalpites() {
  document.querySelectorAll('.multi-bet-row').forEach((linha, index) => {
    linha.querySelector('.multi-bet-index').textContent = `#${index + 1}`;
  });
}

function atualizarNomesTimesPalpites() {
  document.querySelectorAll('.nome-casa').forEach((el) => { el.textContent = jogoAtual?.time_casa || 'Casa'; });
  document.querySelectorAll('.nome-fora').forEach((el) => { el.textContent = jogoAtual?.time_fora || 'Fora'; });
}

function coletarPalpites() {
  return [...document.querySelectorAll('.multi-bet-row')].map((linha) => {
    const casa = linha.querySelector('.palpite-casa').value;
    const fora = linha.querySelector('.palpite-fora').value;
    if (casa === '' || fora === '') return null;
    return {
      palpite_casa: Number(casa),
      palpite_fora: Number(fora),
    };
  }).filter((palpite) => (
    palpite
    && Number.isInteger(palpite.palpite_casa)
    && Number.isInteger(palpite.palpite_fora)
    && palpite.palpite_casa >= 0
    && palpite.palpite_fora >= 0
  ));
}

function abrirPixModal(data) {
  const modal = document.getElementById('pixModal');
  if (!modal) return;
  const codigos = data.codigos_aposta || (data.codigo_aposta ? [data.codigo_aposta] : []);
  const quantidade = data.quantidade || codigos.length || 1;
  const valorApostado = data.valor_apostado ?? quantidade * VALOR_PALPITE;
  const total = data.valor_total ?? valorApostado;

  document.getElementById('pixApostaCodigo').textContent = codigos.length
    ? `Códigos dos palpites: ${codigos.join(', ')}`
    : 'Palpite salvo com status pendente.';
  document.getElementById('pixChavePagamento').textContent = pixPagamento;
  document.getElementById('pixValorBase').textContent = `${quantidade} x ${dinheiro(VALOR_PALPITE)} = ${dinheiro(valorApostado)}`;
  document.getElementById('pixValorTotal').textContent = dinheiro(total);
  modal.classList.remove('hidden');
}

function fecharPixModal() {
  document.getElementById('pixModal')?.classList.add('hidden');
}

async function copiarPixPagamento() {
  try {
    await navigator.clipboard.writeText(pixPagamento);
    msg('mensagem', 'Chave Pix copiada.');
  } catch {
    msg('mensagem', 'Não foi possível copiar a chave Pix.', 'error');
  }
}

async function carregarJogo() {
  if (!jogoId) {
    msg('mensagem', 'Jogo não informado.', 'error');
    return;
  }

  try {
    jogoAtual = await request(`/jogos/${jogoId}`);
    document.getElementById('jogoInfo').innerHTML = `
      <div class="match-teams">${jogoAtual.time_casa}<span class="vs">VS</span>${jogoAtual.time_fora}</div>
      <div class="match-stats">
        <div><small>Placar atual</small><strong>${placarJogo(jogoAtual)}</strong></div>
        <div><small>Status</small><strong>${jogoAtual.status}</strong></div>
      </div>
      <p class="text-muted">Data: ${formatarDataHoraJogo(jogoAtual.data_jogo)}</p>
      <p><span class="badge">Valor: ${dinheiro(VALOR_PALPITE)}</span> <span class="${jogoAtual.aberto_para_apostas ? 'badge' : 'status-badge pendente'}">${jogoAtual.aberto_para_apostas ? 'Apostas liberadas' : 'Apostas encerradas'}</span></p>
      <p class="text-muted">Limite: 10 minutos antes do jogo</p>
    `;
    atualizarNomesTimesPalpites();
    document.getElementById('formAposta').querySelectorAll('input, button').forEach((el) => {
      el.disabled = !jogoAtual.aberto_para_apostas;
    });
  } catch (err) {
    msg('mensagem', err.message, 'error');
  }
}

document.getElementById('adicionarPalpite')?.addEventListener('click', () => criarLinhaPalpite());

document.getElementById('formAposta')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const palpites = coletarPalpites();
    if (!palpites.length) {
      msg('mensagem', 'Informe pelo menos um palpite válido.', 'error');
      return;
    }
    const data = await request('/palpites', {
      method: 'POST',
      body: JSON.stringify({
        jogo_id: Number(jogoId),
        palpites,
      }),
    });
    msg('mensagem', data.message);
    abrirPixModal(data);
    document.getElementById('palpitesLista').innerHTML = '';
    criarLinhaPalpite();
  } catch (err) {
    msg('mensagem', err.message, 'error');
  }
});

document.getElementById('fecharPixModal')?.addEventListener('click', fecharPixModal);
document.getElementById('entendiPixPagamento')?.addEventListener('click', fecharPixModal);
document.getElementById('copiarPixPagamento')?.addEventListener('click', copiarPixPagamento);
document.getElementById('pixModal')?.addEventListener('click', (event) => {
  if (event.target.id === 'pixModal') fecharPixModal();
});

criarLinhaPalpite();
carregarJogo();
setInterval(carregarJogo, 15000);
