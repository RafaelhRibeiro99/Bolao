const regras = [
  ['Valor da aposta', 'Cada aposta custa R$ 5,00.'],
  ['Apostas por jogo', 'Cada usuário pode realizar mais de uma aposta por jogo.'],
  ['Validação por pagamento', 'A aposta só é validada depois da comprovação de pagamento e aprovação do administrador.'],
  ['Prazo de aposta', 'É possível apostar até 10 minutos antes do início do jogo.'],
  ['Mínimo de participantes', 'O jogo só é validado se houver pelo menos 5 usuários diferentes com apostas aprovadas.'],
  ['Jogo não validado', 'Se o jogo não for validado, o valor das apostas deve ser estornado.'],
  ['Taxa da plataforma', 'A plataforma recebe 20% do valor arrecadado e 80% entra na premiação da partida.'],
  ['Tempo regulamentar', 'Apenas o tempo regulamentar conta para as apostas. Prorrogação e pênaltis não entram.'],
  ['Prêmio com ganhadores', 'Quando houver ganhadores, o prêmio é dividido igualmente entre as apostas vencedoras.'],
  ['Sem ganhador', 'Se não houver aposta ganhadora antes da final, 20% do valor arrecadado vai para o ranking e 80% acumula para a final. Se, e somente se, a final não tiver palpite vencedor, soma-se o acumulado da final com o total arrecadado nos palpites da final; desse novo total, 20% vai para o ranking e 80% será destinado à plataforma.'],
  ['Ranking', 'O ranking mede conquistas, acertos e quantidade de apostas. Quanto mais apostas e acertos, maior a chance de subir.'],
  ['Desempate', 'O primeiro critério é número de conquistas; depois acertos; depois quantidade de apostas.'],
];

document.getElementById('listaRegras').innerHTML = regras.map((r, i) => `
  <div class="rule-item">
    <div class="rule-number">${i + 1}</div>
    <div><h3>${r[0]}</h3><p class="text-muted">${r[1]}</p></div>
  </div>
`).join('');
