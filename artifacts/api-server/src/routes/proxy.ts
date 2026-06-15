import { Router } from "express";

const ALLOWED_PREFIXES = [
  "https://a.espncdn.com/i/teamlogos/",
  "https://a.espncdn.com/combiner/",
];

const router = Router();

router.get("/proxy/image", async (req, res) => {
  const url = req.query["url"] as string | undefined;
  if (!url || !ALLOWED_PREFIXES.some((p) => url.startsWith(p))) {
    res.status(400).json({ error: "Invalid or disallowed URL" });
    return;
  }
  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      res.status(upstream.status).end();
      return;
    }
    const ct = upstream.headers.get("content-type") ?? "image/png";
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.set("Content-Type", ct);
    res.set("Cache-Control", "public, max-age=86400");
    res.end(buffer);
  } catch {
    res.status(502).end();
  }
});

export default router;
