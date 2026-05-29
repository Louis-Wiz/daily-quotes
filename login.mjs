function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store"
    }
  });
}

export default async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const adminToken = process.env.DAILY_QUOTE_ADMIN_TOKEN;
  const adminUsername = process.env.DAILY_QUOTE_ADMIN_USERNAME || "admin";
  const adminPassword = process.env.DAILY_QUOTE_ADMIN_PASSWORD || adminToken;

  if (!adminToken || !adminPassword) {
    return json({ error: "Login is not configured. Set DAILY_QUOTE_ADMIN_TOKEN in Netlify." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid login request" }, 400);
  }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (username !== adminUsername || password !== adminPassword) {
    return json({ error: "Invalid username or password." }, 401);
  }

  return json({
    ok: true,
    token: adminToken,
    username: adminUsername
  });
};
