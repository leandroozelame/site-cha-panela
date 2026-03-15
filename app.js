const CONFIG = window.APP_CONFIG || {};
const API_URL = (CONFIG.API_URL || "").trim();

const state = {
  guestName: localStorage.getItem("cha_guest_name") || "",
  products: [],
  draftReserved: loadJson("cha_draft_reserved", []),
  myReservations: [],
  isEntered: false,
  showReservationSummary: false
};

function renderReservationSummary() {
  const container = byId("summaryItems");
  if (!container) return;

  if (!state.myReservations.length) {
    container.innerHTML = `
      <div class="text-center text-muted py-3">
        Nenhum presente reservado.
      </div>
    `;
    return;
  }

  container.innerHTML = state.myReservations.map(item => `
    <div class="summary-item-card">
      <img
        class="summary-item-photo"
        src="${item.image_url}"
        alt="${item.product_name}"
      >
      <div class="summary-item-content">
        <div class="summary-item-name">${item.product_name}</div>
        <div class="summary-item-meta">${item.category}</div>
        <div class="summary-item-meta">Quantidade: ${item.quantity}</div>
      </div>
    </div>
  `).join("");
}

function nomeLojaPorUrl(url) {
  if (!url) return "Ver referência externa";

  try {
    const host = new URL(url).hostname.toLowerCase();

    if (host.includes("amazon")) return "Amazon";
    if (host.includes("mercadolivre") || host.includes("mercadolibre")) return "Mercado Livre";
    if (host.includes("magazineluiza") || host.includes("magalu")) return "Magazine Luiza";
    if (host.includes("casasbahia")) return "Casas Bahia";
    if (host.includes("pontofrio") || host.includes("ponto")) return "Ponto";
    if (host.includes("shopee")) return "Shopee";
    if (host.includes("americanas")) return "Americanas";
    if (host.includes("submarino")) return "Submarino";
    if (host.includes("extra")) return "Extra";

    return host.replace("www.", "");
  } catch (e) {
    return "Ver referência externa";
  }
}

function formatDateBR(dateValue) {
  const d = new Date(dateValue);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function showLoading(text = "Processando...") {
  const overlay = byId("loadingOverlay");
  if (!overlay) return;
  const label = overlay.querySelector(".small");
  if (label) label.textContent = text;
  overlay.classList.remove("d-none");
}

function hideLoading() {
  const overlay = byId("loadingOverlay");
  if (!overlay) return;
  overlay.classList.add("d-none");
}

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

function persistUi() {
  localStorage.setItem("cha_guest_name", state.guestName || "");
  saveJson("cha_draft_reserved", state.draftReserved || []);
}

function showAlert(message, type = "success") {
  const colors = {
    success: "text-bg-success",
    danger: "text-bg-danger",
    warning: "text-bg-warning",
    info: "text-bg-primary",
    secondary: "text-bg-secondary"
  };

  const container = document.getElementById("toastContainer");

  const toast = document.createElement("div");

  toast.className = `toast align-items-center ${colors[type] || colors.info} border-0`;

  toast.role = "alert";
  toast.ariaLive = "assertive";
  toast.ariaAtomic = "true";

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  container.appendChild(toast);

  const bsToast = new bootstrap.Toast(toast, {
    delay: 3500
  });

  bsToast.show();

  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove();
  });
}

function clearAlert() {
  const box = byId("alertBox");
  if (box) box.classList.add("d-none");
}

function parseDateString(str) {
  const [datePart, timePart] = String(str || "01/01/2000 00:00:00").split(" ");
  const [dd, mm, yyyy] = datePart.split("/").map(Number);
  const [hh, mi, ss] = (timePart || "00:00:00").split(":").map(Number);
  return new Date(yyyy, (mm || 1) - 1, dd || 1, hh || 0, mi || 0, ss || 0).getTime();
}

async function apiGet(params = {}) {
  if (!API_URL || API_URL.includes("COLE_AQUI")) {
    throw new Error("Configure a URL do Apps Script em config.js.");
  }
  const url = new URL(API_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url.toString(), { method: "GET" });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Erro ao consultar a planilha.");
  }
  return data;
}

async function apiPost(payload) {
  if (!API_URL || API_URL.includes("COLE_AQUI")) {
    throw new Error("Configure a URL do Apps Script em config.js.");
  }
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Erro ao gravar na planilha.");
  }
  return data;
}

async function loadProducts() {
  const data = await apiGet({ action: "products" });
  state.products = Array.isArray(data.products) ? data.products : [];
}

async function loadMyReservations() {
  if (!state.guestName) {
    state.myReservations = [];
    return;
  }
  const data = await apiGet({ action: "reservations", guestName: state.guestName });
  state.myReservations = Array.isArray(data.reservations) ? data.reservations : [];
}

function updateCategories() {
  const categories = Array.from(new Set(state.products.map(item => item.category))).sort();
  const select = byId("categoryFilter");
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">Todas</option>` + categories.map(cat => `<option value="${cat}">${cat}</option>`).join("");
  select.value = categories.includes(current) ? current : "";
}

function getFilteredProducts() {
  const term = byId("searchInput")?.value.trim().toLowerCase() || "";
  const category = byId("categoryFilter")?.value || "";
  const sort = byId("sortSelect")?.value || "id";

  let products = [...state.products];

  if (term) {
    products = products.filter(product =>
      String(product.name).toLowerCase().includes(term) ||
      String(product.category).toLowerCase().includes(term)
    );
  }

  if (category) {
    products = products.filter(product => product.category === category);
  }

  if (sort === "id") {
    products.sort((a, b) => Number(a.id) - Number(b.id));
  } else if (sort === "name") {
    products.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  } else if (sort === "dateAsc") {
    products.sort((a, b) => parseDateString(a.created_at) - parseDateString(b.created_at));
  } else if (sort === "dateDesc") {
    products.sort((a, b) => parseDateString(b.created_at) - parseDateString(a.created_at));
  }

  return products;
}

function renderHeader() {
  byId("guestGreeting").textContent = state.guestName ? `Olá, ${state.guestName}` : "";
  byId("changeNameBtn").classList.toggle("d-none", !state.guestName);
}

function updateHeaderCart() {
  const cartBtn = byId("cartHeaderBtn");
  const badge = byId("cartHeaderBadge");

  const total = state.draftReserved.reduce((sum, item) => {
    return sum + Number(item.quantity || 0);
  }, 0);

  if (badge) {
    badge.textContent = total;
    badge.style.display = total > 0 ? "inline-block" : "none";
  }

  if (cartBtn) {
    cartBtn.classList.toggle("d-none", !state.isEntered);
  }
}

function renderSections() {
  const welcomeSection = byId("welcomeSection");
  const giftsSection = byId("giftsSection");
  const productsArea = byId("productsArea");
  const summaryArea = byId("reservationSummary");

  if (welcomeSection) {
    welcomeSection.classList.toggle("d-none", state.isEntered);
  }

  if (giftsSection) {
    giftsSection.classList.toggle("d-none", !state.isEntered);
  }

  if (!productsArea || !summaryArea) return;

  if (state.showReservationSummary) {
    productsArea.classList.add("d-none");
    summaryArea.classList.remove("d-none");
  } else {
    productsArea.classList.remove("d-none");
    summaryArea.classList.add("d-none");
  }
}

function renderProducts() {
  const products = getFilteredProducts();
  const grid = byId("productsGrid");
  const empty = byId("emptyProducts");

  byId("availableCount").textContent = `${products.length} presente(s) disponível(is)`;

  if (!products.length) {
    grid.innerHTML = "";
    empty.classList.remove("d-none");
    return;
  }

  empty.classList.add("d-none");

  grid.innerHTML = products.map(product => `
    <div class="col-sm-6">
      <div class="card product-card">
        <img class="product-image" src="${product.image_url}" alt="${product.name}">
        <div class="card-body d-flex flex-column p-4">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <h3 class="h5 mb-0">${product.name}</h3>
          </div>

          <div class="product-meta text-muted mb-1"><strong>Categoria:</strong> ${product.category}</div>
          <div class="product-meta text-muted mb-2"><strong>Disponível:</strong> ${product.available_quantity}</div>
          ${product.description ? `<p class="text-muted small mb-2">${product.description}</p>` : ""}
          <div class="small mb-3">
            ${
              product.link_url
                ? `<a href="${product.link_url}" target="_blank" rel="noopener noreferrer">
                     Ver na ${nomeLojaPorUrl(product.link_url)}
                   </a>`
                : '<span class="text-muted">Sem link externo</span>'
            }
          </div>

          <div class="mt-auto d-grid">
            <button class="btn btn-dark touch-btn add-gift-btn" data-product-id="${product.id}" type="button">
              Adicionar à minha lista de presente
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

function renderDraftReserved() {
  const container = byId("reservedItems");
  const badge = byId("reservedBadge");

  if (!container || !badge) return;

  const hasDraft = state.draftReserved.length > 0;
  const hasConfirmed = state.myReservations.length > 0;

  const items = hasDraft
    ? state.draftReserved.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        image_url: item.image_url,
        created_at: item.created_at,
        mode: "draft"
      }))
    : hasConfirmed
      ? state.myReservations.map(item => ({
          id: item.reservation_id,
          productId: item.product_id,
          name: item.product_name,
          category: item.category,
          quantity: item.quantity,
          image_url: item.image_url,
          created_at: item.created_at,
          mode: "confirmed"
        }))
      : [];

  badge.textContent = String(
    items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  );

  if (!items.length) {
    container.innerHTML = '<p class="text-muted mb-0">Você ainda não reservou presentes.</p>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="line-item border rounded-4 p-3">
      <div class="d-flex gap-3">
        <img class="small-photo" src="${item.image_url}" alt="${item.name}">
        <div class="flex-grow-1">
          <div class="fw-semibold">${item.name}</div>
          <div class="small text-muted">${item.category}</div>
          <div class="small text-muted">${formatDateBR(item.created_at)}</div>
          <div class="d-flex justify-content-between align-items-center mt-3 gap-2 flex-wrap">
            <div class="qty-pill">
              ${
                item.mode === "draft"
                  ? `
                    <button type="button" class="draft-qty-btn" data-action="minus" data-product-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" class="draft-qty-btn" data-action="plus" data-product-id="${item.id}">+</button>
                  `
                  : `
                    <button type="button" class="my-qty-btn" data-action="minus" data-reservation-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" class="my-qty-btn" data-action="plus" data-reservation-id="${item.id}">+</button>
                  `
              }
            </div>
            ${
              item.mode === "draft"
                ? `<button type="button" class="btn btn-sm btn-outline-danger remove-draft-btn" data-product-id="${item.id}">Remover</button>`
                : `<button type="button" class="btn btn-sm btn-outline-danger remove-my-btn" data-reservation-id="${item.id}">Excluir</button>`
            }
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

function renderMyReservations() {
  const container = byId("myItems");
  byId("myItemsBadge").textContent = String(state.myReservations.length);

  if (!state.myReservations.length) {
    container.innerHTML = '<p class="text-muted mb-0">Nenhum presente reservado ainda.</p>';
    return;
  }

  container.innerHTML = state.myReservations.map(item => `
    <div class="line-item border rounded-4 p-3">
      <div class="d-flex gap-3">
        <img class="small-photo" src="${item.image_url}" alt="${item.product_name}">
        <div class="flex-grow-1">
          <div class="fw-semibold">${item.product_name}</div>
          <div class="small text-muted">${item.category}</div>
          <div class="small text-muted">${formatDateBR(item.created_at)}</div>
          <div class="d-flex justify-content-between align-items-center mt-3 gap-2 flex-wrap">
            <div class="qty-pill">
              <button type="button" class="my-qty-btn" data-action="minus" data-reservation-id="${item.reservation_id}">-</button>
              <span>${item.quantity}</span>
              <button type="button" class="my-qty-btn" data-action="plus" data-reservation-id="${item.reservation_id}">+</button>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger remove-my-btn" data-reservation-id="${item.reservation_id}">Excluir</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

function renderAll() {
  renderHeader();
  renderSections();
  renderProducts();
  renderDraftReserved();
  updateHeaderCart();
  renderReservationSummary();
}

async function enterWithName() {
  clearAlert();

  const name = byId("guestNameInput").value.trim();

  if (!name) {
    showAlert("Informe seu nome para continuar.", "warning");
    return;
  }

  state.guestName = name;
  state.isEntered = true;

  persistUi();

  try {
    showLoading("Carregando lista de presentes...");

    await loadProducts();
    await loadMyReservations();

    state.showReservationSummary = state.myReservations.length > 0;

    updateCategories();
    renderAll();

    hideLoading();
  } catch (error) {
    hideLoading();
    showAlert(error.message, "danger");
  }
}

function changeName() {
  state.guestName = "";
  state.isEntered = false;
  state.draftReserved = [];
  state.myReservations = [];
  state.showReservationSummary = false;
  persistUi();
  byId("guestNameInput").value = "";
  renderAll();
}

function addGift(productId) {
  clearAlert();
  if (!state.guestName) {
    showAlert("Informe seu nome antes de reservar presentes.", "warning");
    return;
  }

  const product = state.products.find(item => Number(item.id) === Number(productId));
  if (!product) {
    showAlert("Presente não encontrado.", "warning");
    return;
  }

  const existing = state.draftReserved.find(item => Number(item.id) === Number(productId));
  const currentDraftQty = existing ? Number(existing.quantity || 0) : 0;

  if (currentDraftQty + 1 > Number(product.available_quantity || 0)) {
    showAlert("A quantidade na sua lista excede o disponível.", "warning");
    return;
  }

  if (existing) {
    existing.quantity += 1;
  } else {
    state.draftReserved.push({
      id: product.id,
      name: product.name,
      category: product.category,
      quantity: 1,
      image_url: product.image_url,
      created_at: product.created_at
    });
  }

  persistUi();
  renderDraftReserved();
  updateHeaderCart();
  showAlert("Presente adicionado à sua lista de presente.", "success");
}

function changeDraftQuantity(productId, delta) {
  const item = state.draftReserved.find(entry => Number(entry.id) === Number(productId));
  if (!item) return;

  const product = state.products.find(entry => Number(entry.id) === Number(productId));
  const maxAvailable = Number(product?.available_quantity || 0);

  item.quantity += delta;

  if (item.quantity <= 0) {
    state.draftReserved = state.draftReserved.filter(entry => Number(entry.id) !== Number(productId));
  } else if (item.quantity > maxAvailable) {
    item.quantity = maxAvailable;
    showAlert("A quantidade foi ajustada para o máximo disponível.", "warning");
  }

  persistUi();
  renderDraftReserved();
  updateHeaderCart();
}

function removeDraftItem(productId) {
  state.draftReserved = state.draftReserved.filter(entry => Number(entry.id) !== Number(productId));
  persistUi();
  renderDraftReserved();
  updateHeaderCart();
}

function clearDraftList() {
  state.draftReserved = [];
  persistUi();
  renderDraftReserved();
  updateHeaderCart();
  showAlert("Sua lista de presente foi limpa.", "secondary");
}

async function confirmReservation() {
  clearAlert();

  if (!state.guestName) {
    showAlert("Informe seu nome antes de continuar.", "warning");
    return;
  }

  if (!state.draftReserved.length) {
    showAlert("Sua lista de presente está vazia.", "warning");
    return;
  }

  try {
    showLoading("Confirmando reserva...");

    await apiPost({
      action: "reserve",
      guestName: state.guestName,
      items: state.draftReserved.map(item => ({
        productId: item.id,
        quantity: item.quantity
      }))
    });

    state.draftReserved = [];
    persistUi();

    await loadProducts();
    await loadMyReservations();

    state.showReservationSummary = state.myReservations.length > 0;

    updateCategories();
    renderAll();

    hideLoading();

    showAlert("Reserva confirmada com sucesso. Muito obrigado pelo carinho!", "success");
  } catch (error) {
    hideLoading();
    showAlert(error.message, "danger");
  }
}

async function updateMyReservation(reservationId, delta) {
  clearAlert();

  const current = state.myReservations.find(item => Number(item.reservation_id) === Number(reservationId));

  if (!current) {
    showAlert("Reserva não encontrada.", "warning");
    return;
  }

  const nextQty = Number(current.quantity) + delta;

  try {
    showLoading("Atualizando reserva...");

    if (nextQty <= 0) {
      await apiPost({
        action: "deleteReservation",
        reservationId: Number(reservationId),
        guestName: state.guestName
      });

      await loadProducts();
      await loadMyReservations();

      state.showReservationSummary = state.myReservations.length > 0;

      updateCategories();
      renderAll();

      hideLoading();

      showAlert("Reserva removida com sucesso.", "secondary");
      return;
    }

    await apiPost({
      action: "updateReservation",
      reservationId: Number(reservationId),
      guestName: state.guestName,
      quantity: nextQty
    });

    await loadProducts();
    await loadMyReservations();

    state.showReservationSummary = state.myReservations.length > 0;

    updateCategories();
    renderAll();

    hideLoading();

    showAlert("Quantidade atualizada com sucesso.", "success");
  } catch (error) {
    hideLoading();
    showAlert(error.message, "danger");
  }
}

async function removeMyReservation(reservationId) {
  clearAlert();

  try {
    showLoading("Removendo reserva...");

    await apiPost({
      action: "deleteReservation",
      reservationId: Number(reservationId),
      guestName: state.guestName
    });

    await loadProducts();
    await loadMyReservations();

    state.showReservationSummary = state.myReservations.length > 0;

    updateCategories();
    renderAll();

    hideLoading();

    showAlert("Reserva excluída com sucesso.", "secondary");
  } catch (error) {
    hideLoading();
    showAlert(error.message, "danger");
  }
}

async function cancelAllReservationsAndRestart() {
  clearAlert();

  try {
    showLoading("Cancelando reservas...");

    for (const item of state.myReservations) {
      await apiPost({
        action: "deleteReservation",
        reservationId: Number(item.reservation_id),
        guestName: state.guestName
      });
    }

    state.draftReserved = [];
    state.myReservations = [];
    state.showReservationSummary = false;

    persistUi();

    await loadProducts();
    await loadMyReservations();

    updateCategories();
    renderAll();

    hideLoading();

    showAlert("Reserva cancelada. Você pode escolher novamente do zero.", "secondary");
  } catch (error) {
    hideLoading();
    showAlert(error.message, "danger");
  }
}

function attachEventDelegation() {
  document.addEventListener("click", function (event) {
    const addBtn = event.target.closest(".add-gift-btn");
    if (addBtn) {
      event.preventDefault();
      addGift(addBtn.dataset.productId);
      return;
    }

    const draftBtn = event.target.closest(".draft-qty-btn");
    if (draftBtn) {
      event.preventDefault();
      const delta = draftBtn.dataset.action === "plus" ? 1 : -1;
      changeDraftQuantity(draftBtn.dataset.productId, delta);
      return;
    }

    const removeDraftBtn = event.target.closest(".remove-draft-btn");
    if (removeDraftBtn) {
      event.preventDefault();
      removeDraftItem(removeDraftBtn.dataset.productId);
      return;
    }

    const myQtyBtn = event.target.closest(".my-qty-btn");
    if (myQtyBtn) {
      event.preventDefault();
      const delta = myQtyBtn.dataset.action === "plus" ? 1 : -1;
      updateMyReservation(myQtyBtn.dataset.reservationId, delta);
      return;
    }

    const removeMyBtn = event.target.closest(".remove-my-btn");
    if (removeMyBtn) {
      event.preventDefault();
      removeMyReservation(removeMyBtn.dataset.reservationId);
    }
  });
}

function resetLocalDraft() {
  localStorage.removeItem("cha_guest_name");
  localStorage.removeItem("cha_draft_reserved");
  location.reload();
}

document.addEventListener("DOMContentLoaded", async function () {
  const guestNameInput = byId("guestNameInput");
  const enterBtn = byId("enterBtn");
  const changeNameBtn = byId("changeNameBtn");
  const cartHeaderBtn = byId("cartHeaderBtn");
  const searchInput = byId("searchInput");
  const categoryFilter = byId("categoryFilter");
  const sortSelect = byId("sortSelect");
  const confirmBtn = byId("confirmBtn");
  const clearReservedBtn = byId("clearReservedBtn");
  const restartBtn = byId("restartReservationBtn");

  if (guestNameInput) {
    guestNameInput.value = state.guestName || "";
    guestNameInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") enterWithName();
    });
  }

  if (enterBtn) enterBtn.addEventListener("click", enterWithName);
  if (changeNameBtn) changeNameBtn.addEventListener("click", changeName);
  if (searchInput) searchInput.addEventListener("input", renderProducts);
  if (categoryFilter) categoryFilter.addEventListener("change", renderProducts);
  if (sortSelect) sortSelect.addEventListener("change", renderProducts);
  if (confirmBtn) confirmBtn.addEventListener("click", confirmReservation);
  if (clearReservedBtn) clearReservedBtn.addEventListener("click", clearDraftList);

  if (restartBtn) {
    restartBtn.addEventListener("click", cancelAllReservationsAndRestart);
  }

  attachEventDelegation();
  renderAll();

  if (state.guestName) {
    state.isEntered = true;

    try {
      showLoading("Carregando suas reservas...");

      await loadMyReservations();

      state.showReservationSummary = state.myReservations.length > 0;

      renderAll();

      if (state.showReservationSummary) {
        showLoading("Carregando seus presentes reservados...");
      } else {
        showLoading("Carregando presentes...");
      }

      await loadProducts();

      updateCategories();
      renderAll();

      hideLoading();

      showAlert('Você entrou como <strong>' + state.guestName + '</strong>.', "info");
    } catch (error) {
      hideLoading();
      showAlert(error.message, "danger");
    }
  }

  if (cartHeaderBtn) {
    cartHeaderBtn.addEventListener("click", function () {
      const cartSection = byId("cartSection");
      if (cartSection) {
        cartSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  }
});

window.resetLocalDraft = resetLocalDraft;