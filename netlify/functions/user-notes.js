import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";

const store = getStore("taccuino-notes");

export default async (_req, _context) => {
  const req = _req;
  const user = await getUser();

  if (!user) {
    return jsonResponse({ error: "Utente non autenticato." }, 401);
  }

  const key = `users/${user.id}/notes`;

  if (req.method === "GET") {
    const entry = await store.get(key, { type: "json" });
    const payload = entry && typeof entry === "object" ? entry : { notes: [] };

    return jsonResponse({
      notes: Array.isArray(payload.notes) ? payload.notes : [],
      updatedAt: payload.updatedAt || null,
      email: user.email
    });
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const notes = Array.isArray(body.notes) ? body.notes : [];

    const payload = {
      userId: user.id,
      email: user.email,
      updatedAt: new Date().toISOString(),
      notes
    };

    await store.setJSON(key, payload);
    return jsonResponse(payload);
  }

  return jsonResponse({ error: "Metodo non supportato." }, 405);
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
