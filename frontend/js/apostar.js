protegerPagina(false);

const params = new URLSearchParams(location.search);
const jogoId = params.get('jogo');
let jogoAtual = null;
const pixPagamento = '62 993000262';

function abrirPixModal(data) {
  const modal = document.getElementById('pixModal');
  if (!modal) return;
  document.getElementById('pixApostaCodigo').textContent = data.codigo_aposta
    ? `Codigo da aposta: ${data.codigo_aposta}`
    : 'Aposta salva com status pendente.';
  document.getElementById('pixChavePagamento').textContent = pixPagamento;
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
    msg('mensagem', 'Nao foi possivel copiar a chave Pix.', 'error');
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
      <p class="text-muted">Data: ${new Date(jogoAtual.data_jogo).toLocaleString('pt-BR')}</p>
      <p><span class="badge">Valor: R$ 5,00</span> <span class="${jogoAtual.aberto_para_apostas ? 'badge' : 'status-badge pendente'}">${jogoAtual.aberto_para_apostas ? 'Apostas liberadas' : 'Apostas encerradas'}</span></p>
      <p class="text-muted">Limite: 10 minutos antes do jogo</p>
    `;
    document.getElementById('labelCasa').firstChild.textContent = jogoAtual.time_casa;
    document.getElementById('labelFora').firstChild.textContent = jogoAtual.time_fora;
    document.getElementById('formAposta').querySelectorAll('input, button').forEach((el) => {
      el.disabled = !jogoAtual.aberto_para_apostas;
    });
  } catch (err) {
    msg('mensagem', err.message, 'error');
  }
}

document.getElementById('formAposta')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await request('/palpites', {
      method: 'POST',
      body: JSON.stringify({
        jogo_id: Number(jogoId),
        palpite_casa: Number(document.getElementById('placarCasa').value),
        palpite_fora: Number(document.getElementById('placarFora').value),
      }),
    });
    msg('mensagem', data.message);
    abrirPixModal(data);
    e.target.reset();
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

carregarJogo();
setInterval(carregarJogo, 30000);
