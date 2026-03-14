const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "Jogo de Taças",
    category: "Cozinha",
    description: "Conjunto com 6 taças de vidro.",
    image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    available_quantity: 1,
    created_at: "10/03/2026 09:00:00"
  },
  {
    id: 2,
    name: "Conjunto de Panelas",
    category: "Cozinha",
    description: "Kit antiaderente para o dia a dia.",
    image_url: "https://images.unsplash.com/photo-1584990347449-a4d05d7f182d?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    available_quantity: 1,
    created_at: "10/03/2026 09:15:00"
  },
  {
    id: 3,
    name: "Faqueiro",
    category: "Cozinha",
    description: "Conjunto de talheres com 24 peças.",
    image_url: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    available_quantity: 1,
    created_at: "10/03/2026 09:30:00"
  },
  {
    id: 4,
    name: "Aparelho de Jantar",
    category: "Mesa Posta",
    description: "Jogo com pratos e bowls para 4 pessoas.",
    image_url: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    available_quantity: 2,
    created_at: "10/03/2026 09:45:00"
  },
  {
    id: 5,
    name: "Jogo de Cama",
    category: "Quarto",
    description: "Jogo queen com 4 peças.",
    image_url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    available_quantity: 1,
    created_at: "10/03/2026 10:00:00"
  },
  {
    id: 6,
    name: "Liquidificador",
    category: "Eletroportáteis",
    description: "Modelo doméstico de alta potência.",
    image_url: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    available_quantity: 1,
    created_at: "10/03/2026 10:15:00"
  },
  {
    id: 7,
    name: "Sanduicheira",
    category: "Eletroportáteis",
    description: "Compacta e prática para o café da manhã.",
    image_url: "https://images.unsplash.com/photo-1585238342024-78d387f4a707?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    available_quantity: 1,
    created_at: "10/03/2026 10:30:00"
  },
  {
    id: 8,
    name: "Jogo de Toalhas",
    category: "Banheiro",
    description: "Kit com toalhas macias para banheiro.",
    image_url: "https://images.unsplash.com/photo-1631049035182-249067d7618e?q=80&w=1200&auto=format&fit=crop",
    link_url: "",
    available_quantity: 2,
    created_at: "10/03/2026 10:45:00"
  }
];

const state = {
  guestName: localStorage.getItem("cha_guest_name") || "",
  products: [],
  draftReserved: loadJson("cha_draft_reserved", []),
  myReservations: [],
  isEntered: false
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
  box.className = `alert alert-${type} mt-4`;
  box.innerHTML = message;
  box.classList.remove("d-none");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearAlert() {
  const box = byId("alertBox");
  box.classList.add("d-none");
}

function getDb() {
  const db = loadJson("cha_panela_db_v2", null);
  if (db) return db;

  const fresh = {
    products: DEFAULT_PRODUCTS.map((item, index) => ({
      ...item,
      id: index + 1
    })),
    reservations: []
  };
  saveJson("cha_panela_db_v2", fresh);
  return fresh;
}

function saveDb(db) {
  saveJson("cha_panela_db_v2", db);
}

function persistUi() {
  localStorage.setItem("cha_guest_name", state.guestName || "");
  saveJson("cha_draft_reserved", state.draftReserved || []);
}

function parseDateString(str) {
  const [datePart, timePart] = str.split(" ");
  const [dd, mm, yyyy] = datePart.split("/").map(Number);
  const [hh, mi, ss] = timePart.split(":").map(Number);
  return new Date(yyyy, mm - 1, dd, hh, mi, ss).getTime();
}

function computeProducts() {
  const db = getDb();
  return db.products.map(product => {
    const reserved = db.reservations
      .filter(item => Number(item.product_id) === Number(product.id))
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    return {
      ...product,
      available_quantity: Math.max(0, Number(product.available_quantity) - reserved)
    };
  }).filter(item => item.available_quantity > 0);
}

function computeMyReservations() {
  if (!state.guestName) return [];
  const db = getDb();

  return db.reservations
    .filter(item => item.guest_name.toLowerCase() === state.guestName.toLowerCase())
    .map(item => {
      const product = db.products.find(p => Number(p.id) === Number(item.product_id));
      return {
        reservation_id: item.id,
        product_id: item.product_id,
        product_name: product?.name || "Presente",
        category: product?.category || "",
        image_url: product?.image_url || "",
        link_url: product?.link_url || "",
        quantity: Number(item.quantity || 0),
        created_at: product?.created_at || ""
      };
    })
    .sort((a, b) => b.reservation_id - a.reservation_id);
}

function updateCategories() {
  const categories = Array.from(new Set(state.products.map(item => item.category))).sort();
  const select = byId("categoryFilter");
  const current = select.value;
  select.innerHTML = `<option value="">Todas</option>` + categories.map(cat => `<option value="${cat}">${cat}</option>`).join("");
  select.value = categories.includes(current) ? current : "";
}

function getFilteredProducts() {
  const term = byId("searchInput").value.trim().toLowerCase();
  const category = byId("categoryFilter").value;
  const sort = byId("sortSelect").value;

  let products = [...state.products];

  if (term) {
    products = products.filter(product =>
      product.name.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term)
    );
  }

  if (category) {
    products = products.filter(product => product.category === category);
  }

  if (sort === "id") {
    products.sort((a, b) => Number(a.id) - Number(b.id));
  } else if (sort === "name") {
    products.sort((a, b) => a.name.localeCompare(b.name));
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

function renderSections() {
  byId("welcomeSection").classList.toggle("d-none", state.isEntered);
  byId("giftsSection").classList.toggle("d-none", !state.isEntered);
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
            <span class="badge text-bg-light id-badge">ID ${product.id}</span>
          </div>

          <div class="product-meta text-muted mb-1"><strong>Categoria:</strong> ${product.category}</div>
          <div class="product-meta text-muted mb-1"><strong>Data:</strong> ${product.created_at}</div>
          <div class="product-meta text-muted mb-2"><strong>Disponível:</strong> ${product.available_quantity}</div>
          ${product.description ? `<p class="text-muted small mb-2">${product.description}</p>` : ""}
          <div class="small mb-3">
            ${product.link_url ? `<a href="${product.link_url}" target="_blank" rel="noopener noreferrer">Ver referência externa</a>` : '<span class="text-muted">Sem link externo</span>'}
          </div>

          <div class="mt-auto d-grid">
            <button class="btn btn-dark touch-btn add-gift-btn" data-product-id="${product.id}" type="button">
              Adicionar à minha lista de carinho
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

function renderDraftReserved() {
  const container = byId("reservedItems");
  byId("reservedBadge").textContent = String(state.draftReserved.reduce((sum, item) => sum + Number(item.quantity || 0), 0));

  if (!state.draftReserved.length) {
    container.innerHTML = '<p class="text-muted mb-0">Você ainda não reservou presentes.</p>';
    return;
  }

  container.innerHTML = state.draftReserved.map(item => `
    <div class="line-item border rounded-4 p-3">
      <div class="d-flex gap-3">
        <img class="small-photo" src="${item.image_url}" alt="${item.name}">
        <div class="flex-grow-1">
          <div class="fw-semibold">${item.name}</div>
          <div class="small text-muted">ID ${item.id} • ${item.category}</div>
          <div class="small text-muted">${item.created_at}</div>
          <div class="d-flex justify-content-between align-items-center mt-3 gap-2 flex-wrap">
            <div class="qty-pill">
              <button type="button" class="draft-qty-btn" data-action="minus" data-product-id="${item.id}">-</button>
              <span>${item.quantity}</span>
              <button type="button" class="draft-qty-btn" data-action="plus" data-product-id="${item.id}">+</button>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger remove-draft-btn" data-product-id="${item.id}">Remover</button>
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
          <div class="small text-muted">ID ${item.product_id} • ${item.category}</div>
          <div class="small text-muted">${item.created_at}</div>
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
  renderMyReservations();
}

function enterWithName() {
  clearAlert();
  const name = byId("guestNameInput").value.trim();

  if (!name) {
    showAlert("Informe seu nome para continuar.", "warning");
    return;
  }

  state.guestName = name;
  state.isEntered = true;
  state.myReservations = computeMyReservations();
  persistUi();
  renderAll();
}

function changeName() {
  state.guestName = "";
  state.isEntered = false;
  state.draftReserved = [];
  state.myReservations = [];
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
  showAlert("Presente adicionado à sua lista de carinho.", "success");
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
}

function removeDraftItem(productId) {
  state.draftReserved = state.draftReserved.filter(entry => Number(entry.id) !== Number(productId));
  persistUi();
  renderDraftReserved();
}

function clearDraftList() {
  state.draftReserved = [];
  persistUi();
  renderDraftReserved();
  showAlert("Sua lista de carinho foi limpa.", "secondary");
}

function confirmReservation() {
  clearAlert();

  if (!state.guestName) {
    showAlert("Informe seu nome antes de continuar.", "warning");
    return;
  }

  if (!state.draftReserved.length) {
    showAlert("Sua lista de carinho está vazia.", "warning");
    return;
  }

  const db = getDb();

  for (const draft of state.draftReserved) {
    const product = computeProducts().find(p => Number(p.id) === Number(draft.id));
    if (!product || Number(draft.quantity) > Number(product.available_quantity || 0)) {
      showAlert(`O presente "${draft.name}" não possui mais quantidade suficiente.`, "danger");
      state.products = computeProducts();
      renderProducts();
      return;
    }
  }

  let nextId = db.reservations.length ? Math.max(...db.reservations.map(item => item.id)) + 1 : 1;

  for (const draft of state.draftReserved) {
    db.reservations.push({
      id: nextId++,
      product_id: draft.id,
      guest_name: state.guestName,
      quantity: draft.quantity
    });
  }

  saveDb(db);
  state.draftReserved = [];
  state.products = computeProducts();
  state.myReservations = computeMyReservations();
  persistUi();
  renderAll();
  showAlert("Reserva confirmada com sucesso. Muito obrigado pelo carinho!", "success");
}

function updateMyReservation(reservationId, delta) {
  clearAlert();
  const db = getDb();
  const reservation = db.reservations.find(item => Number(item.id) === Number(reservationId) && item.guest_name.toLowerCase() === state.guestName.toLowerCase());

  if (!reservation) {
    showAlert("Reserva não encontrada.", "warning");
    return;
  }

  const product = db.products.find(item => Number(item.id) === Number(reservation.product_id));
  if (!product) return;

  const reservedByOthers = db.reservations
    .filter(item => Number(item.product_id) === Number(reservation.product_id) && Number(item.id) !== Number(reservationId))
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const maxForUser = Number(product.available_quantity) - reservedByOthers;
  const nextQty = Number(reservation.quantity) + delta;

  if (nextQty <= 0) {
    db.reservations = db.reservations.filter(item => Number(item.id) !== Number(reservationId));
    saveDb(db);
    state.products = computeProducts();
    state.myReservations = computeMyReservations();
    renderAll();
    showAlert("Reserva removida com sucesso.", "secondary");
    return;
  }

  if (nextQty > maxForUser) {
    showAlert("Quantidade acima do disponível.", "warning");
    return;
  }

  reservation.quantity = nextQty;
  saveDb(db);
  state.products = computeProducts();
  state.myReservations = computeMyReservations();
  renderAll();
  showAlert("Quantidade atualizada com sucesso.", "success");
}

function removeMyReservation(reservationId) {
  const db = getDb();
  db.reservations = db.reservations.filter(item => !(Number(item.id) === Number(reservationId) && item.guest_name.toLowerCase() === state.guestName.toLowerCase()));
  saveDb(db);
  state.products = computeProducts();
  state.myReservations = computeMyReservations();
  renderAll();
  showAlert("Reserva excluída com sucesso.", "secondary");
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

function resetAllData() {
  localStorage.removeItem("cha_panela_db_v2");
  localStorage.removeItem("cha_guest_name");
  localStorage.removeItem("cha_draft_reserved");
  location.reload();
}

document.addEventListener("DOMContentLoaded", function () {
  state.products = computeProducts();
  state.myReservations = computeMyReservations();
  state.isEntered = !!state.guestName;

  const guestNameInput = byId("guestNameInput");
  const enterBtn = byId("enterBtn");
  const changeNameBtn = byId("changeNameBtn");
  const saveNameBtn = byId("saveNameBtn");
  const searchInput = byId("searchInput");
  const categoryFilter = byId("categoryFilter");
  const sortSelect = byId("sortSelect");
  const confirmBtn = byId("confirmBtn");
  const clearReservedBtn = byId("clearReservedBtn");

  if (guestNameInput) {
    guestNameInput.value = state.guestName || "";
    guestNameInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        enterWithName();
      }
    });
  }

  if (enterBtn) {
    enterBtn.addEventListener("click", enterWithName);
  }

  if (changeNameBtn) {
    changeNameBtn.addEventListener("click", changeName);
  }

  if (saveNameBtn) {
    saveNameBtn.addEventListener("click", function () {
      const value = guestNameInput ? guestNameInput.value.trim() : "";
      if (!value) {
        showAlert("Informe seu nome.", "warning");
        return;
      }
      state.guestName = value;
      state.myReservations = computeMyReservations();
      persistUi();
      renderAll();
      showAlert("Nome atualizado com sucesso.", "success");
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", renderProducts);
  }

  if (categoryFilter) {
    categoryFilter.addEventListener("change", renderProducts);
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", renderProducts);
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", confirmReservation);
  }

  if (clearReservedBtn) {
    clearReservedBtn.addEventListener("click", clearDraftList);
  }

  updateCategories();
  attachEventDelegation();
  renderAll();

  if (state.isEntered) {
    showAlert('Você entrou como <strong>' + state.guestName + '</strong>. Para zerar todos os dados locais, use <code>resetAllData()</code> no console.', "info");
  }
});

window.resetAllData = resetAllData;
