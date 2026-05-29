import { getStore } from "@netlify/blobs";

const MAX_FILE_SIZE = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store"
    }
  });
}

function isAuthorized(request) {
  const token = process.env.DAILY_QUOTE_ADMIN_TOKEN;
  const auth = request.headers.get("authorization") || "";
  const submitted = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  return Boolean(token && submitted && submitted === token);
}

function safeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "quote-image";
}

export default async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!isAuthorized(request)) {
    return json({ error: "Unauthorized. Set DAILY_QUOTE_ADMIN_TOKEN in Netlify and enter it in the admin panel." }, 401);
  }

  const form = await request.formData();
  const file = form.get("image");
  const quoteIndex = Number(form.get("quoteIndex"));
  const quotesRaw = form.get("quotes");

  if (!file || typeof file.arrayBuffer !== "function") {
    return json({ error: "Missing image file" }, 400);
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return json({ error: "Please upload a JPEG, PNG, WebP, or GIF image." }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return json({ error: "Image is too large. Please keep it under 6 MB." }, 400);
  }

  let quotes;
  try {
    quotes = JSON.parse(quotesRaw);
  } catch {
    return json({ error: "Invalid quote data" }, 400);
  }

  if (!Array.isArray(quotes) || !Number.isInteger(quoteIndex) || !quotes[quoteIndex]) {
    return json({ error: "Invalid quote index" }, 400);
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : file.type.split("/").pop();
  const key = `quote-${quoteIndex}-${Date.now()}-${safeFileName(file.name || `image.${extension}`)}`;
  const imageStore = getStore("quote-images");

  await imageStore.set(key, await file.arrayBuffer(), {
    metadata: {
      contentType: file.type,
      originalName: file.name || "",
      quoteIndex
    }
  });

  const imageUrl = `/.netlify/functions/quote-image?key=${encodeURIComponent(key)}`;
  const updatedQuotes = quotes.map((quote, index) => (
    index === quoteIndex ? { ...quote, image: imageUrl } : quote
  ));

  const quoteStore = getStore("quote-data");
  await quoteStore.setJSON("quotes.json", updatedQuotes);

  return json({
    ok: true,
    quoteIndex,
    image: imageUrl,
    quotes: updatedQuotes
  });
};
