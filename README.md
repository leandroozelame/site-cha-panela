# Chá de Panela com Google Sheets

Esta versão salva as reservas em uma planilha Google Sheets compartilhada.

## O que vem no pacote
- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `Code.gs` para Google Apps Script
- `products-template.csv`
- `reservations-template.csv`
- `convite-cha-panela.png`

## Estrutura da planilha

Crie uma planilha com duas abas:

### Aba 1: `Products`
Importe o arquivo `products-template.csv`

### Aba 2: `Reservations`
Importe o arquivo `reservations-template.csv`

## Como publicar o backend no Google Sheets

1. Abra a planilha
2. Vá em `Extensões > Apps Script`
3. Apague o conteúdo padrão
4. Cole o conteúdo do arquivo `Code.gs`
5. Salve
6. Clique em `Implantar > Nova implantação`
7. Escolha `Aplicativo da web`
8. Executar como: `Você`
9. Quem tem acesso: `Qualquer pessoa`
10. Implantar
11. Copie a URL gerada

## Como ligar o frontend à planilha

Abra `config.js` e troque:

```javascript
window.APP_CONFIG = {
  API_URL: "COLE_AQUI_A_URL_DO_SEU_APPS_SCRIPT"
};
```

pela URL do Apps Script.

## Como testar localmente

Na pasta do projeto:

```powershell
python -m http.server 8080
```

Depois abra:

```text
http://localhost:8080
```

## Como publicar no GitHub Pages

Suba estes arquivos no repositório:
- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `convite-cha-panela.png`

## Observações
- agora as reservas ficam na planilha, compartilhadas para todos
- duas pessoas podem ver a mesma disponibilidade atualizada após cada recarga
- o Apps Script valida a quantidade disponível antes de gravar
- o navegador guarda apenas o nome e a lista temporária antes da confirmação

## Dica prática
Depois que publicar o Apps Script, teste estes links no navegador:

### listar produtos
`SUA_URL?action=products`

### listar reservas de um nome
`SUA_URL?action=reservations&guestName=Maria`

Isso ajuda a confirmar que a planilha está respondendo.
