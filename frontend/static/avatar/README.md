# Avatar assets

O sistema de avatar agora usa apenas imagens prontas de rosto/avatar.

Pasta usada:

- `faces/`

Formato esperado:

- PNG individual
- fundo transparente ou já finalizado
- mesmo enquadramento entre todos
- mesmo tamanho visual

O backend lista automaticamente todos os PNGs existentes em:

- `frontend/static/avatar/faces/`

Você pode adicionar os arquivos manualmente, por exemplo:

- `messi.png`
- `Haaland.png`
- `Vinicius.png`

Regras do nome:

- use nomes de arquivo válidos para URL
- extensão `.png`

O primeiro PNG encontrado vira fallback caso o usuário ainda não tenha avatar salvo.
