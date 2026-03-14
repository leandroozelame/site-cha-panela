# Chá de Panela - Leandro & Gabriella

Versão atualizada para usar a imagem do convite na tela de boas-vindas.

## O que foi ajustado
- a imagem enviada foi incorporada na tela inicial
- layout em duas colunas no desktop:
  - texto + entrada do nome
  - convite em destaque
- no mobile a imagem fica bem encaixada em cima/baixo com moldura suave
- sem preço
- com data no formato `dd/mm/yyyy hh:mm:ss`
- itens com ID sequencial
- entrada apenas com nome
- lista com imagem, categoria, nome, quantidade disponível e link externo
- nome íntimo para seleção: `Minha lista de carinho`

## Como rodar
Na pasta do projeto:

```powershell
python -m http.server 8080
```

Depois abra:

```text
http://localhost:8080
```

## Resetar tudo
No console do navegador:

```javascript
resetAllData()
```
