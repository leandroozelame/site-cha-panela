const CONFIG = window.APP_CONFIG || {};
const USE_MOCK = !!CONFIG.USE_MOCK;
const API_BASE_URL = (CONFIG.API_BASE_URL || "").replace(/\/$/, "");
const GOOGLE_CLIENT_ID = CONFIG.GOOGLE_CLIENT_ID || "";

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "Jogo de Taças",
    description: "Conjunto com 6 taças de vidro.",
    image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    price: 89.90,
    total_quantity: 1
  },
  {
    id: 2,
    name: "Conjunto de Panelas",
    description: "Kit antiaderente para o dia a dia.",
    image_url: "https://images.unsplash.com/photo-1584990347449-a4d05d7f182d?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    price: 349.90,
    total_quantity: 1
  },
  {
    id: 3,
    name: "Faqueiro",
    description: "Conjunto de talheres com 24 peças.",
    image_url: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    price: 159.00,
    total_quantity: 1
  },
  {
    id: 4,
    name: "Aparelho de Jantar",
    description: "Jogo com pratos e bowls para 4 pessoas.",
    image_url: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    price: 229.90,
    total_quantity: 2
  },
  {
    id: 5,
    name: "Jogo de Cama",
    description: "Jogo queen com 4 peças.",
    image_url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    price: 199.90,
    total_quantity: 1
  },
  {
    id: 6,
    name: "Liquidificador",
    description: "Modelo doméstico de alta potência.",
    image_url: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    price: 179.90,
    total_quantity: 1
  },
  {
    id: 7,
    name: "Sanduicheira",
    description: "Compacta e prática para o café da manhã.",
    image_url: "https://images.unsplash.com/photo-1585238342024-78d387f4a707?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    price: 149.90,
    total_quantity: 1
  },
  {
    id: 8,
    name: "Jogo de Toalhas",
    description: "Kit com toalhas macias para banheiro.",
    image_url: "https://images.unsplash.com/photo-1631049035182-249067d7618e?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    price: 129.90,
    total_quantity: 2
  }
];

const state = {
  googleToken: localStorage.getItem("google_token") || "",
  user: loadJson("user_profile", null),
  guestName: localStorage.getItem("guest_name") || "",
  products: [],
  cart: loadJson("gift_cart", []),
  myItems: []
};

function byId(id) {
  return document.getElementById(id);
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function showAlert(message, type = "success") {
  const box = byId("alertBox");
  box.className = `alert alert-${type}`;
  box.innerHTML = message;
  box.classList.remove("d-none");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearAlert() {
  byId("alertBox").classList.add("d-none");
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function persistState() {
  localStorage.setItem("google_token", state.googleToken || "");
  localStorage.setItem("guest_name", state.guestName || "");
  saveJson("user_profile", state.user || null);
  saveJson("gift_cart", state.cart || []);
}

function isLoggedIn() {
  return !!state.user?.email;
}

function requireLogin() {
  if (!isLoggedIn()) {
    showAlert("Faça login para continuar.", "warning");
    return false;
  }
  if (!state.guestName?.trim()) {
    showAlert("Informe seu nome antes de continuar.", "warning");
    byId("guestNameInput").focus();
    return false;
  }
  return true;
}

function getMockDb() {
  const db = loadJson("mock_db", null);
  if (db) return db;

  const fresh = {
    products: DEFAULT_PRODUCTS.map(item => ({ ...item })),
    orderItems: []
  };
  saveJson("mock_db", fresh);
  return fresh;
}

function saveMockDb(db) {
  saveJson("mock_db", db);
}

function computeMockProducts() {
  const db = getMockDb();
  return db.products
    .map(product => {
      const reserved = db.orderItems
        .filter(item => Number(item.product_id) === Number(product.id))
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      return {
        ...product,
        reserved_quantity: reserved,
        available_quantity: Number(product.total_quantity || 0) - reserved
      };
    })
    .filter(item => item.available_quantity > 0);
}

function computeMockMyItems(email) {
  const db = getMockDb();
  return db.orderItems
    .filter(item => item.user_email === email)
    .map(item => {
      const product = db.products.find(p => Number(p.id) === Number(item.product_id));
      return {
        order_item_id: item.id,
        product_id: item.product_id,
        product_name: product?.name || "Produto",
        image_url: product?.image_url || "",
        unit_price: Number(item.unit_price || 0),
        quantity: Number(item.quantity || 0),
        guest_name: item.guest_name || "",
        user_email: item.user_email
      };
    })
    .sort((a, b) => b.order_item_id - a.order_item_id);
}

async function mockFetch(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  if (path === "/api/products" && method === "GET") {
    return computeMockProducts();
  }

  if (path === "/api/my-items" && method === "GET") {
    return computeMockMyItems(state.user?.email || "");
  }

  if (path === "/api/auth/google" && method === "POST") {
    const body = JSON.parse(options.body || "{}");
    return {
      ok: true,
      user: {
        email: body.email || "teste@exemplo.com",
        name: body.name || "Convidado Teste",
        picture: ""
      }
    };
  }

  if (path === "/api/checkout" && method === "POST") {
    const body = JSON.parse(options.body || "{}");
    const db = getMockDb();

    if (!body.guest_name) {
      throw new Error("Informe o nome do convidado.");
    }

    if (!Array.isArray(body.items) || !body.items.length) {
      throw new Error("O carrinho está vazio.");
    }

    for (const item of body.items) {
      const product = db.products.find(p => Number(p.id) === Number(item.product_id));
      if (!product) throw new Error("Produto não encontrado.");

      const reserved = db.orderItems
        .filter(oi => Number(oi.product_id) === Number(product.id))
        .reduce((sum, oi) => sum + Number(oi.quantity || 0), 0);
      const available = Number(product.total_quantity || 0) - reserved;

      if (Number(item.quantity || 0) > available) {
        throw new Error(`O produto "${product.name}" não possui quantidade suficiente.`);
      }
    }

    let nextId = db.orderItems.length ? Math.max(...db.orderItems.map(i => i.id)) + 1 : 1;

    for (const item of body.items) {
      const product = db.products.find(p => Number(p.id) === Number(item.product_id));
      db.orderItems.push({
        id: nextId++,
        product_id: Number(item.product_id),
        quantity: Number(item.quantity || 0),
        unit_price: Number(product.price || 0),
        user_email: state.user.email,
        guest_name: body.guest_name,
        user_name: state.user.name || ""
      });
    }

    saveMockDb(db);
    return { ok: true };
  }

  const patchMatch = path.match(/^\/api\/my-items\/(\d+)$/);

  if (patchMatch && method === "PATCH") {
    const body = JSON.parse(options.body || "{}");
    const orderItemId = Number(patchMatch[1]);
    const db = getMockDb();
    const item = db.orderItems.find(i => Number(i.id) === orderItemId && i.user_email === state.user.email);

    if (!item) throw new Error("Item não encontrado.");
    const product = db.products.find(p => Number(p.id) === Number(item.product_id));
    if (!product) throw new Error("Produto não encontrado.");

    const totalReservedByOthers = db.orderItems
      .filter(i => Number(i.product_id) === Number(item.product_id) && Number(i.id) !== orderItemId)
      .reduce((sum, i) => sum + Number(i.quantity || 0), 0);

    const maxAllowed = Number(product.total_quantity || 0) - totalReservedByOthers;
    if (Number(body.quantity || 0) < 1 || Number(body.quantity || 0) > maxAllowed) {
      throw new Error(`Quantidade acima do disponível para "${product.name}".`);
    }

    item.quantity = Number(body.quantity);
    saveMockDb(db);
    return { ok: true };
  }

  if (patchMatch && method === "DELETE") {
    const orderItemId = Number(patchMatch[1]);
    const db = getMockDb();
    const before = db.orderItems.length;
    db.orderItems = db.orderItems.filter(i => !(Number(i.id) === orderItemId && i.user_email === state.user.email));

    if (db.orderItems.length === before) {
      throw new Error("Item não encontrado para exclusão.");
    }

    saveMockDb(db);
    return { ok: true };
  }

  throw new Error(`Rota mock não implementada: ${method} ${path}`);
}

async function apiFetch(path, options = {}) {
  if (USE_MOCK) {
    return await mockFetch(path, options);
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.googleToken) {
    headers["Authorization"] = `Bearer ${state.googleToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  let payload = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Erro ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function getFilteredProducts() {
  const term = byId("searchInput").value.trim().toLowerCase();
  const sort = byId("sortSelect").value;

  let products = [...state.products].filter(product => Number(product.available_quantity || 0) > 0);

  if (term) {
    products = products.filter(product => product.name.toLowerCase().includes(term));
  }

  if (sort === "name") {
    products.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "priceAsc") {
    products.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sort === "priceDesc") {
    products.sort((a, b) => Number(b.price) - Number(a.price));
  }

  return products;
}

function getCartCount() {
  return state.cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
}

function getCartTotal() {
  return state.cart.reduce((total, item) => total + Number(item.price) * Number(item.quantity || 0), 0);
}

function syncGuestName() {
  byId("guestNameInput").value = state.guestName || "";
  byId("userGreeting").textContent = state.user?.name ? `Olá, ${state.user.name}` : "";
  byId("logoutBtn").classList.toggle("d-none", !isLoggedIn());
  byId("mockLoginBtn").classList.toggle("d-none", isLoggedIn());
}

function renderProducts() {
  const products = getFilteredProducts();
  const grid = byId("productsGrid");
  const empty = byId("emptyProducts");

  byId("availableCount").textContent = `${products.length} item(ns) disponível(is)`;

  if (!products.length) {
    grid.innerHTML = "";
    empty.classList.remove("d-none");
    return;
  }

  empty.classList.add("d-none");

  grid.innerHTML = products.map(product => {
    const stock = Number(product.available_quantity || 0);
    const linkHtml = product.link_url
      ? `<a href="${product.link_url}" target="_blank" rel="noopener noreferrer" class="product-link small">Ver referência</a>`
      : `<span class="small text-muted">Sem link externo</span>`;

    return `
      <div class="col-sm-6">
        <div class="card product-card">
          <img class="product-image" src="${product.image_url || ""}" alt="${product.name}">
          <div class="card-body d-flex flex-column p-4">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
              <h3 class="h5 mb-0">${product.name}</h3>
              <span class="badge text-bg-light badge-stock">${stock} disp.</span>
            </div>

            ${product.description ? `<p class="text-muted small mb-2">${product.description}</p>` : `<div class="mb-2"></div>`}

            <div class="fw-bold mb-2">${formatCurrency(product.price)}</div>
            <div class="mb-3">${linkHtml}</div>

            <div class="mt-auto d-grid">
              <button class="btn btn-dark" onclick="addToCart('${product.id}')">Adicionar ao carrinho</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderCart() {
  const container = byId("cartItems");
  byId("cartBadge").textContent = String(getCartCount());
  byId("cartTotal").textContent = formatCurrency(getCartTotal());

  if (!state.cart.length) {
    container.innerHTML = '<p class="text-muted mb-0">Seu carrinho está vazio.</p>';
    return;
  }

  container.innerHTML = state.cart.map(item => `
    <div class="line-item border rounded-4 p-3">
      <div class="d-flex gap-3">
        <img class="small-photo" src="${item.image_url || ""}" alt="${item.name}">
        <div class="flex-grow-1">
          <div class="fw-semibold">${item.name}</div>
          <div class="small text-muted">${formatCurrency(item.price)} cada</div>
          <div class="d-flex justify-content-between align-items-center mt-3 gap-2">
            <div class="qty-pill">
              <button onclick="changeCartQuantity('${item.id}', -1)">-</button>
              <span>${item.quantity}</span>
              <button onclick="changeCartQuantity('${item.id}', 1)">+</button>
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart('${item.id}')">Remover</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

function renderMyItems() {
  const container = byId("myItems");
  byId("myItemsBadge").textContent = String(state.myItems.length);

  if (!state.myItems.length) {
    container.innerHTML = '<p class="text-muted mb-0">Você ainda não reservou presentes.</p>';
    return;
  }

  container.innerHTML = state.myItems.map(item => `
    <div class="line-item border rounded-4 p-3">
      <div class="d-flex gap-3">
        <img class="small-photo" src="${item.image_url || ""}" alt="${item.product_name}">
        <div class="flex-grow-1">
          <div class="fw-semibold">${item.product_name}</div>
          <div class="small text-muted">${formatCurrency(item.unit_price)} cada</div>
          <div class="d-flex justify-content-between align-items-center mt-3 gap-2">
            <div class="qty-pill">
              <button onclick="updateMyItemQuantity(${item.order_item_id}, ${item.quantity - 1})">-</button>
              <span>${item.quantity}</span>
              <button onclick="updateMyItemQuantity(${item.order_item_id}, ${item.quantity + 1})">+</button>
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteMyItem(${item.order_item_id})">Excluir</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

function renderAll() {
  syncGuestName();
  renderProducts();
  renderCart();
  renderMyItems();
}

async function loadProducts() {
  state.products = await apiFetch("/api/products");
  renderProducts();
}

async function loadMyItems() {
  if (!isLoggedIn()) {
    state.myItems = [];
    renderMyItems();
    return;
  }
  state.myItems = await apiFetch("/api/my-items");
  renderMyItems();
}

function addToCart(productId) {
  clearAlert();
  if (!requireLogin()) return;

  const product = state.products.find(item => String(item.id) === String(productId));
  if (!product) {
    showAlert("Produto não encontrado.", "warning");
    return;
  }

  const available = Number(product.available_quantity || 0);
  const existing = state.cart.find(item => String(item.id) === String(productId));
  const cartQty = existing ? Number(existing.quantity || 0) : 0;

  if (cartQty + 1 > available) {
    showAlert("A quantidade no carrinho excede o disponível.", "warning");
    return;
  }

  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      image_url: product.image_url || ""
    });
  }

  persistState();
  renderCart();
}

function changeCartQuantity(productId, delta) {
  const item = state.cart.find(entry => String(entry.id) === String(productId));
  if (!item) return;

  const product = state.products.find(entry => String(entry.id) === String(productId));
  const available = Number(product?.available_quantity || 0);

  item.quantity += delta;

  if (item.quantity <= 0) {
    state.cart = state.cart.filter(entry => String(entry.id) !== String(productId));
  } else if (item.quantity > available) {
    item.quantity = available;
    showAlert("A quantidade foi ajustada para o máximo disponível.", "warning");
  }

  persistState();
  renderCart();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(entry => String(entry.id) !== String(productId));
  persistState();
  renderCart();
}

function clearCart() {
  state.cart = [];
  persistState();
  renderCart();
}

async function checkout() {
  clearAlert();
  if (!requireLogin()) return;

  if (!state.cart.length) {
    showAlert("Seu carrinho está vazio.", "warning");
    return;
  }

  try {
    await apiFetch("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        guest_name: state.guestName,
        items: state.cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity
        }))
      })
    });

    state.cart = [];
    persistState();

    await Promise.all([loadProducts(), loadMyItems()]);
    renderCart();
    showAlert("Seleção concluída com sucesso.");
  } catch (error) {
    showAlert(error.message || "Não foi possível concluir a seleção.", "danger");
  }
}

async function updateMyItemQuantity(orderItemId, newQuantity) {
  clearAlert();
  if (!requireLogin()) return;

  if (newQuantity <= 0) {
    await deleteMyItem(orderItemId);
    return;
  }

  try {
    await apiFetch(`/api/my-items/${orderItemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: newQuantity })
    });

    await Promise.all([loadProducts(), loadMyItems()]);
    showAlert("Quantidade atualizada com sucesso.");
  } catch (error) {
    showAlert(error.message || "Não foi possível atualizar a quantidade.", "danger");
  }
}

async function deleteMyItem(orderItemId) {
  clearAlert();
  if (!requireLogin()) return;

  try {
    await apiFetch(`/api/my-items/${orderItemId}`, {
      method: "DELETE"
    });

    await Promise.all([loadProducts(), loadMyItems()]);
    showAlert("Item removido com sucesso.");
  } catch (error) {
    showAlert(error.message || "Não foi possível remover o item.", "danger");
  }
}

function saveGuestName() {
  state.guestName = byId("guestNameInput").value.trim();
  persistState();
  showAlert("Nome salvo com sucesso.");
}

async function handleGoogleCredential(response) {
  clearAlert();

  try {
    const result = await apiFetch("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({
        credential: response.credential
      })
    });

    state.googleToken = response.credential;
    state.user = {
      email: result.user.email,
      name: result.user.name,
      picture: result.user.picture || ""
    };

    persistState();

    await Promise.all([loadProducts(), loadMyItems()]);
    renderAll();
    showAlert("Login realizado com sucesso.");
  } catch (error) {
    showAlert(error.message || "Falha no login com Google.", "danger");
  }
}

async function mockLogin() {
  clearAlert();
  const email = prompt("Digite um e-mail para testar:", state.user?.email || "teste@exemplo.com");
  if (!email) return;

  const name = prompt("Digite o nome do convidado:", state.user?.name || "Convidado Teste");
  if (!name) return;

  const result = await apiFetch("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ email, name })
  });

  state.googleToken = "mock-token";
  state.user = {
    email: result.user.email,
    name: result.user.name,
    picture: ""
  };

  if (!state.guestName) {
    state.guestName = result.user.name;
  }

  persistState();
  await Promise.all([loadProducts(), loadMyItems()]);
  renderAll();
  showAlert('Login mock realizado com sucesso. <span class="badge text-bg-warning mode-pill ms-2">MODO MOCK</span>');
}

function logout() {
  state.googleToken = "";
  state.user = null;
  state.myItems = [];
  state.cart = [];
  persistState();
  renderAll();

  if (window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
  }

  showAlert("Você saiu da sua conta.", "secondary");
}

function initGoogleLogin() {
  if (USE_MOCK) {
    byId("googleLoginContainer").classList.add("d-none");
    return;
  }

  byId("mockLoginBtn").classList.add("d-none");

  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("SEU_GOOGLE_CLIENT_ID")) {
    showAlert("Configure o GOOGLE_CLIENT_ID no arquivo config.js para habilitar o login.", "warning");
    return;
  }

  if (!window.google?.accounts?.id) {
    setTimeout(initGoogleLogin, 500);
    return;
  }

  byId("googleLoginContainer").classList.remove("d-none");

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: true
  });

  window.google.accounts.id.renderButton(
    byId("googleLoginContainer"),
    { theme: "outline", size: "medium", shape: "pill", text: "signin_with", width: 220 }
  );
}

function resetMockData() {
  localStorage.removeItem("mock_db");
  localStorage.removeItem("gift_cart");
  localStorage.removeItem("guest_name");
  localStorage.removeItem("google_token");
  localStorage.removeItem("user_profile");
  location.reload();
}

document.addEventListener("DOMContentLoaded", async () => {
  byId("guestNameInput").value = state.guestName || "";
  byId("saveNameBtn").addEventListener("click", saveGuestName);
  byId("searchInput").addEventListener("input", renderProducts);
  byId("sortSelect").addEventListener("change", renderProducts);
  byId("checkoutBtn").addEventListener("click", checkout);
  byId("clearCartBtn").addEventListener("click", clearCart);
  byId("logoutBtn").addEventListener("click", logout);
  byId("mockLoginBtn").addEventListener("click", mockLogin);

  initGoogleLogin();

  try {
    await loadProducts();
    if (isLoggedIn()) {
      await loadMyItems();
    }
    renderAll();

    if (USE_MOCK) {
      showAlert(
        'Site pronto para localhost em <strong>modo mock</strong>. ' +
        'Use o botão <strong>Entrar para testar</strong>. ' +
        'Para zerar tudo, rode no console: <code>resetMockData()</code>.',
        "info"
      );
    }
  } catch (error) {
    showAlert(error.message || "Erro ao carregar dados iniciais.", "danger");
  }
});

window.addToCart = addToCart;
window.changeCartQuantity = changeCartQuantity;
window.removeFromCart = removeFromCart;
window.updateMyItemQuantity = updateMyItemQuantity;
window.deleteMyItem = deleteMyItem;
window.resetMockData = resetMockData;
