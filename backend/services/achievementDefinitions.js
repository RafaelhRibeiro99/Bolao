const { CONQUISTAS } = require('./conquistas');

module.exports = CONQUISTAS.map((conquista) => ({
  id: conquista.id,
  nome: conquista.nome,
  descricao: conquista.descricao,
  grau: conquista.grau,
  categoria: conquista.tipo,
  meta: conquista.valor,
  titulo: conquista.titulo,
  emoji: conquista.emoji,
  moldura: conquista.moldura,
  aura: conquista.aura,
  efeito_nome: conquista.efeito_nome,
}));
