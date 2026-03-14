# Chá de Panela completo com modo mock

Este pacote foi ajustado para funcionar de dois jeitos:

## 1. Modo mock local, pronto para testar
Nesse modo você não precisa de Cloudflare, banco, Google login nem API.

O arquivo `config.js` já vem assim:

```js
window.APP_CONFIG = {
  USE_MOCK: true,
  API_BASE_URL: "http://127.0.0.1:8787",
  GOOGLE_CLIENT_ID: "SEU_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
};
```

### Como rodar local em 1 minuto

Na pasta do projeto, rode:

```powershell
python -m http.server 8080
```

Depois abra:

```text
http://localhost:8080
```

Clique em:
- `Entrar para testar`

Informe:
- e-mail qualquer
- nome qualquer

Pronto. Você já consegue:
- pesquisar produtos
- adicionar ao carrinho
- confirmar seleção
- ver o item sumir da lista disponível
- ver em "Meus presentes"
- alterar quantidade
- excluir item

Tudo fica salvo no `localStorage` do navegador.

### Resetar os dados mock
Abra o console do navegador e rode:

```js
resetMockData()
```

## 2. Modo real com Cloudflare Worker + D1 + Google Login

Quando quiser sair do modo mock:

### config.js
Troque para:

```js
window.APP_CONFIG = {
  USE_MOCK: false,
  API_BASE_URL: "http://127.0.0.1:8787",
  GOOGLE_CLIENT_ID: "SEU_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
};
```

### Subir banco local
```powershell
wrangler d1 execute cha-panela-db --local --file=schema.sql
wrangler d1 execute cha-panela-db --local --file=seed.sql
```

### Rodar API local
```powershell
wrangler dev
```

### Rodar frontend
```powershell
python -m http.server 8080
```

## Arquivos
- `index.html`
- `styles.css`
- `config.js`
- `app.js`
- `worker.js`
- `schema.sql`
- `seed.sql`
- `wrangler.toml`

## Observações
- O modo mock é ideal para aprovar layout e fluxo rapidamente.
- O login mock usa prompts simples.
- O modo real continua disponível no mesmo pacote.
- O frontend foi feito em HTML + Bootstrap + JavaScript puro.
