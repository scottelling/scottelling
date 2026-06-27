// GET /api/refresh
// Finds projects DEPLOYED to a *.scottelling.com subdomain but NOT yet listed in
// projects.json, so the homepage can grab + link them.
//
// Source of truth = Vercel's alias list (/v4/aliases), which covers EVERY live
// subdomain — alias-attached (e.g. codeengine) and project-domain (e.g. hermes),
// regardless of repo name or visibility.
//
// Env (server-side only — never sent to the browser):
//   VERCEL_TOKEN    — Vercel access token
//   VERCEL_TEAM_ID  — team id/slug (e.g. "scottelling-1903s-projects")
//
// Returns: { discovered: [{ name, slug, url }], scanned, error? }

const API = "https://api.vercel.com";
const ROOT = "scottelling.com";
const IGNORE_SLUGS = new Set(["www", "scottelling", ""]);

function subdomainOf(host) {
  if (!host || !host.endsWith(`.${ROOT}`)) return null;
  const label = host.slice(0, -(`.${ROOT}`).length);
  if (!label || label.includes(".")) return null; // single-label only
  return label;
}

function pretty(slug) {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const token = process.env.VERCEL_TOKEN;
  const team = process.env.VERCEL_TEAM_ID || "";
  if (!token) {
    return res.status(500).json({ discovered: [], scanned: 0, error: "VERCEL_TOKEN not configured" });
  }
  const teamQ = team ? `&teamId=${encodeURIComponent(team)}` : "";
  const headers = { Authorization: `Bearer ${token}` };

  try {
    // 1) what's already on the homepage
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const existing = await fetch(`https://${host}/projects.json?v=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
    const known = new Set(existing.map((p) => p.slug));

    // 2) page through all aliases, collect unique *.scottelling.com subdomains
    const slugs = new Set();
    let scanned = 0;
    let until = "";
    for (let page = 0; page < 10; page++) {
      const r = await fetch(`${API}/v4/aliases?limit=100${until}${teamQ}`, {
        headers,
        signal: AbortSignal.timeout(9000),
      });
      if (!r.ok) throw new Error(`aliases ${r.status}`);
      const j = await r.json();
      const aliases = j.aliases || [];
      scanned += aliases.length;
      for (const a of aliases) {
        const s = subdomainOf(a.alias);
        if (s && !IGNORE_SLUGS.has(s)) slugs.add(s);
      }
      const next = j.pagination && j.pagination.next;
      if (!next) break;
      until = `&until=${next}`;
    }

    // 3) anything live but not already listed
    const discovered = [...slugs]
      .filter((s) => !known.has(s))
      .sort()
      .map((slug) => ({ name: pretty(slug), slug, url: `https://${slug}.${ROOT}` }));

    return res.status(200).json({ discovered, scanned });
  } catch (e) {
    return res.status(500).json({ discovered: [], scanned: 0, error: (e && e.message) || "scan failed" });
  }
};
