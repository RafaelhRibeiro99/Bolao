const regras = [
  ['Valor da aposta', 'Cada aposta custa R$ 5,00.'],
  ['Retenção administrativa', 'No rateio da premiação, 10% do total de palpites aprovados ficam retidos para o administrador. O participante não paga valor adicional.'],
  ['Apostas por jogo', 'Cada usuário pode realizar mais de uma aposta por jogo.'],
  ['Validação por pagamento', 'A aposta só é validada depois da comprovação de pagamento e aprovação do administrador.'],
  ['Prazo de aposta', 'É possível apostar até 10 minutos antes do início do jogo.'],
  ['Mínimo de palpites', 'O jogo só é validado se houver pelo menos 2 palpites aprovados, independentemente de quem realizou os palpites.'],
  ['Jogo não validado', 'Se o jogo não for validado, o valor das apostas deve ser estornado.'],
  ['Premiação', 'A premiação corresponde a 90% do total dos palpites aprovados, divididos entre os ganhadores.'],
  ['Tempo regulamentar', 'Apenas o tempo regulamentar conta para as apostas. Prorrogação e pênaltis não entram.'],
  ['Prêmio com ganhadores', 'Quando houver ganhadores, o prêmio é dividido entre as apostas vencedoras.'],
  ['Sem ganhador', 'Se não houver aposta ganhadora antes da final, o valor destinado à premiação acumula para a final. Se a final não tiver palpite vencedor, não há rateio de premiação.'],
  ['Transparência', 'Resultados, premiações e validações podem ser acompanhados diretamente pela plataforma.'],
];

document.getElementById('listaRegras').innerHTML = regras.map((r, i) => `
  <div class="rule-item">
    <div class="rule-number">${i + 1}</div>
    <div><h3>${r[0]}</h3><p class="text-muted">${r[1]}</p></div>
  </div>
`).join('');
