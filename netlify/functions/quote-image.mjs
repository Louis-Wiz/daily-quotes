import { getStore } from "@netlify/blobs";

export default async (request) => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new Response("Missing image key", { status: 400 });
  }

  const store = getStore("quote-images");
  const entry = await store.getWithMetadata(key, { type: "arrayBuffer" });

  if (!entry || !entry.data) {
    return new Response("Image not found", { status: 404 });
  }

  return new Response(entry.data, {
    headers: {
      "content-type": entry.metadata?.contentType || "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
};
