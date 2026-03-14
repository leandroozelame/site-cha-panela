export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error("[worker] erro interno:", error);
      return json({ error: error.message || "Erro interno do servidor." }, error.status || 500);
    }
  }
};

async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }));
  }

  if (url.pathname === "/api/health") {
    return json({ ok: true, name: "cha-panela-api" });
  }

  if (url.pathname === "/api/products" && request.method === "GET") {
    const items = await listProducts(env);
    return json(items);
  }

  if (url.pathname === "/api/auth/google" && request.method === "POST") {
    const body = await request.json();
    const googleUser = await verifyGoogleCredential(body.credential, env.GOOGLE_CLIENT_ID);
    return json({
      ok: true,
      user: {
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture || ""
      }
    });
  }

  const authUser = await requireAuth(request, env);

  if (url.pathname === "/api/my-items" && request.method === "GET") {
    const items = await listMyItems(env, authUser.email);
    return json(items);
  }

  if (url.pathname === "/api/checkout" && request.method === "POST") {
    const body = await request.json();
    const guestName = String(body.guest_name || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!guestName) return json({ error: "Informe o nome do convidado." }, 400);
    if (!items.length) return json({ error: "O carrinho está vazio." }, 400);

    const result = await checkoutReservation(env, {
      guestName,
      email: authUser.email,
      googleName: authUser.name || "",
      items
    });

    return json(result, 201);
  }

  const itemMatch = url.pathname.match(/^\/api\/my-items\/(\d+)$/);

  if (itemMatch && request.method === "PATCH") {
    const orderItemId = Number(itemMatch[1]);
    const body = await request.json();
    const quantity = Number(body.quantity || 0);

    if (!Number.isInteger(quantity) || quantity < 1) {
      return json({ error: "Quantidade inválida." }, 400);
    }

    const result = await updateMyItemQuantity(env, authUser.email, orderItemId, quantity);
    return json(result);
  }

  if (itemMatch && request.method === "DELETE") {
    const orderItemId = Number(itemMatch[1]);
    const result = await deleteMyItem(env, authUser.email, orderItemId);
    return json(result);
  }

  return json({ error: "Rota não encontrada." }, 404);
}

async function listProducts(env) {
  const sql = `
    SELECT
      p.id,
      p.name,
      p.description,
      p.image_url,
      p.link_url,
      p.price,
      p.total_quantity,
      COALESCE(SUM(oi.quantity), 0) AS reserved_quantity,
      (p.total_quantity - COALESCE(SUM(oi.quantity), 0)) AS available_quantity
    FROM products p
    LEFT JOIN order_items oi ON oi.product_id = p.id
    WHERE p.active = 1
    GROUP BY p.id, p.name, p.description, p.image_url, p.link_url, p.price, p.total_quantity
    HAVING available_quantity > 0
    ORDER BY p.name ASC
  `;
  const result = await env.DB.prepare(sql).all();
  return result.results || [];
}

async function listMyItems(env, userEmail) {
  const sql = `
    SELECT
      oi.id AS order_item_id,
      oi.product_id,
      p.name AS product_name,
      p.image_url,
      oi.quantity,
      oi.unit_price,
      o.guest_name,
      o.user_email
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi.order_id
    INNER JOIN products p ON p.id = oi.product_id
    WHERE o.user_email = ?
    ORDER BY oi.id DESC
  `;
  const result = await env.DB.prepare(sql).bind(userEmail).all();
  return result.results || [];
}

async function checkoutReservation(env, payload) {
  const now = new Date().toISOString();

  await env.DB.exec("BEGIN TRANSACTION");

  try {
    const orderInsert = await env.DB.prepare(`
      INSERT INTO orders (user_email, user_name, guest_name, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(payload.email, payload.googleName, payload.guestName, now).run();

    const orderId = orderInsert.meta.last_row_id;

    for (const item of payload.items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
        throw new Error("Item inválido no carrinho.");
      }

      const availability = await env.DB.prepare(`
        SELECT
          p.id,
          p.name,
          p.price,
          p.total_quantity,
          COALESCE(SUM(oi.quantity), 0) AS reserved_quantity,
          (p.total_quantity - COALESCE(SUM(oi.quantity), 0)) AS available_quantity
        FROM products p
        LEFT JOIN order_items oi ON oi.product_id = p.id
        WHERE p.id = ? AND p.active = 1
        GROUP BY p.id, p.name, p.price, p.total_quantity
      `).bind(productId).first();

      if (!availability) {
        throw new Error(`Produto ${productId} não encontrado.`);
      }

      if (Number(availability.available_quantity) < quantity) {
        throw new Error(`O produto "${availability.name}" não possui quantidade suficiente.`);
      }

      await env.DB.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
      `).bind(orderId, productId, quantity, availability.price).run();
    }

    await env.DB.exec("COMMIT");
    return { ok: true, order_id: orderId };
  } catch (error) {
    await env.DB.exec("ROLLBACK");
    throw error;
  }
}

async function updateMyItemQuantity(env, userEmail, orderItemId, newQuantity) {
  await env.DB.exec("BEGIN TRANSACTION");

  try {
    const current = await env.DB.prepare(`
      SELECT
        oi.id,
        oi.quantity AS current_quantity,
        oi.product_id,
        p.name AS product_name,
        p.total_quantity,
        COALESCE((
          SELECT SUM(oi2.quantity)
          FROM order_items oi2
          WHERE oi2.product_id = oi.product_id
        ), 0) AS reserved_quantity
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN products p ON p.id = oi.product_id
      WHERE oi.id = ? AND o.user_email = ?
    `).bind(orderItemId, userEmail).first();

    if (!current) throw new Error("Item não encontrado para este usuário.");

    const otherReserved = Number(current.reserved_quantity) - Number(current.current_quantity);
    const availableForThisUser = Number(current.total_quantity) - otherReserved;

    if (newQuantity > availableForThisUser) {
      throw new Error(`Quantidade acima do disponível para "${current.product_name}".`);
    }

    await env.DB.prepare(`
      UPDATE order_items
      SET quantity = ?
      WHERE id = ?
    `).bind(newQuantity, orderItemId).run();

    await env.DB.exec("COMMIT");
    return { ok: true };
  } catch (error) {
    await env.DB.exec("ROLLBACK");
    throw error;
  }
}

async function deleteMyItem(env, userEmail, orderItemId) {
  const result = await env.DB.prepare(`
    DELETE FROM order_items
    WHERE id = ?
      AND order_id IN (SELECT id FROM orders WHERE user_email = ?)
  `).bind(orderItemId, userEmail).run();

  if (!result.meta.changes) {
    throw new Error("Item não encontrado para exclusão.");
  }

  return { ok: true };
}

async function requireAuth(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    const error = new Error("Não autenticado.");
    error.status = 401;
    throw error;
  }

  return await verifyGoogleCredential(token, env.GOOGLE_CLIENT_ID);
}

async function verifyGoogleCredential(credential, expectedAud) {
  if (!credential || typeof credential !== "string") {
    throw new Error("Credential do Google não informada.");
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
  );

  if (!response.ok) {
    throw new Error("Não foi possível validar o token do Google.");
  }

  const payload = await response.json();

  if (!payload.email || payload.email_verified !== "true") {
    throw new Error("A conta Google precisa ter e-mail verificado.");
  }

  if (expectedAud && !String(expectedAud).startsWith("SEU_") && payload.aud !== expectedAud) {
    throw new Error("O token não pertence ao client ID configurado.");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name || "",
    picture: payload.picture || "",
    aud: payload.aud
  };
}

function json(data, status = 200) {
  return withCors(new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  }));
}

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
