import { getStore } from "@netlify/blobs";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

export default async () => {
  const store = getStore("quote-data");
  const quotes = await store.get("quotes.json", { type: "json" });

  if (!quotes) {
    return Response.json(
      { error: "No saved quote data found. Use local quotes.json as fallback." },
      { status: 404, headers }
    );
  }

  return Response.json(quotes, { headers });
};
