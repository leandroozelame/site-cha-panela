const PRODUCTS_SHEET = 'Products';
const RESERVATIONS_SHEET = 'Reservations';

function doGet(e) {
  try {
    const action = (e.parameter.action || '').trim();

    if (action === 'products') {
      return jsonResponse({ ok: true, products: listProducts_() });
    }

    if (action === 'reservations') {
      const guestName = String(e.parameter.guestName || '').trim();
      if (!guestName) return jsonResponse({ ok: false, error: 'Informe o nome.' });
      return jsonResponse({ ok: true, reservations: listReservationsByGuest_(guestName) });
    }

    return jsonResponse({ ok: false, error: 'Ação GET inválida.' });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = String(body.action || '').trim();

    if (action === 'reserve') {
      reserveItems_(body);
      return jsonResponse({ ok: true });
    }

    if (action === 'updateReservation') {
      updateReservation_(body);
      return jsonResponse({ ok: true });
    }

    if (action === 'deleteReservation') {
      deleteReservation_(body);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: 'Ação POST inválida.' });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('A aba "' + name + '" não foi encontrada.');
  return sheet;
}

function listProducts_() {
  const productsSheet = getSheet_(PRODUCTS_SHEET);
  const reservationsSheet = getSheet_(RESERVATIONS_SHEET);

  const productValues = productsSheet.getDataRange().getValues();
  const reservationValues = reservationsSheet.getDataRange().getValues();

  if (productValues.length < 2) return [];

  const productHeaders = productValues[0];
  const reservationHeaders = reservationValues.length ? reservationValues[0] : [];

  const productIndex = indexMap_(productHeaders);
  const reservationIndex = indexMap_(reservationHeaders);

  const reservedByProduct = {};

  for (let i = 1; i < reservationValues.length; i++) {
    const row = reservationValues[i];
    const productId = Number(row[reservationIndex.product_id] || 0);
    const quantity = Number(row[reservationIndex.quantity] || 0);
    if (!productId) continue;
    reservedByProduct[productId] = (reservedByProduct[productId] || 0) + quantity;
  }

  const items = [];

  for (let i = 1; i < productValues.length; i++) {
    const row = productValues[i];
    const id = Number(row[productIndex.id] || 0);
    const active = String(row[productIndex.active] || 'TRUE').toUpperCase() !== 'FALSE';
    if (!id || !active) continue;

    const totalQuantity = Number(row[productIndex.total_quantity] || 0);
    const reserved = Number(reservedByProduct[id] || 0);
    const available = Math.max(0, totalQuantity - reserved);

    if (available <= 0) continue;

    items.push({
      id: id,
      name: String(row[productIndex.name] || ''),
      category: String(row[productIndex.category] || ''),
      description: String(row[productIndex.description] || ''),
      image_url: String(row[productIndex.image_url] || ''),
      link_url: String(row[productIndex.link_url] || ''),
      created_at: String(row[productIndex.created_at] || ''),
      available_quantity: available
    });
  }

  return items.sort(function(a, b) { return a.id - b.id; });
}

function listReservationsByGuest_(guestName) {
  const reservationsSheet = getSheet_(RESERVATIONS_SHEET);
  const productsSheet = getSheet_(PRODUCTS_SHEET);

  const reservationValues = reservationsSheet.getDataRange().getValues();
  const productValues = productsSheet.getDataRange().getValues();

  if (reservationValues.length < 2) return [];

  const reservationIndex = indexMap_(reservationValues[0]);
  const productIndex = indexMap_(productValues[0]);

  const productsMap = {};
  for (let i = 1; i < productValues.length; i++) {
    const row = productValues[i];
    const id = Number(row[productIndex.id] || 0);
    if (!id) continue;
    productsMap[id] = {
      name: String(row[productIndex.name] || ''),
      category: String(row[productIndex.category] || ''),
      image_url: String(row[productIndex.image_url] || ''),
      link_url: String(row[productIndex.link_url] || ''),
      created_at: String(row[productIndex.created_at] || '')
    };
  }

  const normalizedGuest = normalize_(guestName);
  const items = [];

  for (let i = 1; i < reservationValues.length; i++) {
    const row = reservationValues[i];
    const rowGuest = String(row[reservationIndex.guest_name] || '');
    if (normalize_(rowGuest) !== normalizedGuest) continue;

    const reservationId = Number(row[reservationIndex.reservation_id] || 0);
    const productId = Number(row[reservationIndex.product_id] || 0);
    const product = productsMap[productId] || {};

    items.push({
      reservation_id: reservationId,
      product_id: productId,
      product_name: product.name || '',
      category: product.category || '',
      image_url: product.image_url || '',
      link_url: product.link_url || '',
      created_at: product.created_at || '',
      quantity: Number(row[reservationIndex.quantity] || 0)
    });
  }

  return items.sort(function(a, b) { return b.reservation_id - a.reservation_id; });
}

function reserveItems_(body) {
  const guestName = String(body.guestName || '').trim();
  const items = Array.isArray(body.items) ? body.items : [];

  if (!guestName) throw new Error('Informe o nome.');
  if (!items.length) throw new Error('Nenhum item informado.');

  const products = listProducts_();
  const productMap = {};
  products.forEach(function(item) { productMap[item.id] = item; });

  items.forEach(function(item) {
    const productId = Number(item.productId || 0);
    const quantity = Number(item.quantity || 0);
    const product = productMap[productId];

    if (!product) throw new Error('Produto ' + productId + ' não está mais disponível.');
    if (!quantity || quantity < 1) throw new Error('Quantidade inválida.');
    if (quantity > Number(product.available_quantity || 0)) {
      throw new Error('O produto "' + product.name + '" não possui quantidade suficiente.');
    }
  });

  const sheet = getSheet_(RESERVATIONS_SHEET);
  let nextId = nextReservationId_(sheet);

  items.forEach(function(item) {
    sheet.appendRow([
      nextId++,
      Number(item.productId),
      guestName,
      Number(item.quantity),
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss')
    ]);
  });
}

function updateReservation_(body) {
  const guestName = String(body.guestName || '').trim();
  const reservationId = Number(body.reservationId || 0);
  const quantity = Number(body.quantity || 0);

  if (!guestName) throw new Error('Informe o nome.');
  if (!reservationId) throw new Error('Reserva inválida.');
  if (quantity < 1) throw new Error('Quantidade inválida.');

  const sheet = getSheet_(RESERVATIONS_SHEET);
  const values = sheet.getDataRange().getValues();
  const idx = indexMap_(values[0]);
  const rowNumber = findReservationRow_(values, idx, reservationId, guestName);
  if (!rowNumber) throw new Error('Reserva não encontrada.');

  const productId = Number(values[rowNumber - 1][idx.product_id] || 0);
  const currentQty = Number(values[rowNumber - 1][idx.quantity] || 0);

  const available = computeAvailableForUpdate_(productId, reservationId);
  if (quantity > available) {
    throw new Error('Quantidade acima do disponível.');
  }

  sheet.getRange(rowNumber, idx.quantity + 1).setValue(quantity);
}

function deleteReservation_(body) {
  const guestName = String(body.guestName || '').trim();
  const reservationId = Number(body.reservationId || 0);

  if (!guestName) throw new Error('Informe o nome.');
  if (!reservationId) throw new Error('Reserva inválida.');

  const sheet = getSheet_(RESERVATIONS_SHEET);
  const values = sheet.getDataRange().getValues();
  const idx = indexMap_(values[0]);
  const rowNumber = findReservationRow_(values, idx, reservationId, guestName);
  if (!rowNumber) throw new Error('Reserva não encontrada.');

  sheet.deleteRow(rowNumber);
}

function computeAvailableForUpdate_(productId, reservationId) {
  const productsSheet = getSheet_(PRODUCTS_SHEET);
  const reservationsSheet = getSheet_(RESERVATIONS_SHEET);

  const productValues = productsSheet.getDataRange().getValues();
  const reservationValues = reservationsSheet.getDataRange().getValues();

  const pidx = indexMap_(productValues[0]);
  const ridx = indexMap_(reservationValues[0]);

  let totalQuantity = 0;
  for (let i = 1; i < productValues.length; i++) {
    const row = productValues[i];
    if (Number(row[pidx.id] || 0) === Number(productId)) {
      totalQuantity = Number(row[pidx.total_quantity] || 0);
      break;
    }
  }

  let reservedByOthers = 0;
  for (let i = 1; i < reservationValues.length; i++) {
    const row = reservationValues[i];
    const rid = Number(row[ridx.reservation_id] || 0);
    const pid = Number(row[ridx.product_id] || 0);
    const qty = Number(row[ridx.quantity] || 0);
    if (pid === Number(productId) && rid !== Number(reservationId)) {
      reservedByOthers += qty;
    }
  }

  return Math.max(0, totalQuantity - reservedByOthers);
}

function nextReservationId_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return 1;
  let maxId = 0;
  for (let i = 1; i < values.length; i++) {
    maxId = Math.max(maxId, Number(values[i][0] || 0));
  }
  return maxId + 1;
}

function findReservationRow_(values, idx, reservationId, guestName) {
  const normalizedGuest = normalize_(guestName);
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (
      Number(row[idx.reservation_id] || 0) === Number(reservationId) &&
      normalize_(String(row[idx.guest_name] || '')) === normalizedGuest
    ) {
      return i + 1;
    }
  }
  return 0;
}

function indexMap_(headers) {
  const map = {};
  headers.forEach(function(header, index) {
    map[String(header).trim()] = index;
  });
  return map;
}

function normalize_(value) {
  return String(value || '').trim().toLowerCase();
}
