// GET /api/refresh
// Finds projects that are DEPLOYED but NOT yet listed in projects.json, so the
// homepage can grab + link them. Secret-free by design:
//   1. list public repos under the GitHub owner
//   2. for any repo not already in the directory, probe <repo>.scottelling.com
//   3. if it responds, it's a live-but-unlisted project -> return it
//
// Optional env:
//   GH_OWNER  — GitHub owner to scan (default "scottelling")
//
// Returns: { discovered: [{ name, slug, url }], scanned, error? }

const ROOT = "scottelling.com";
const OWNER = process.env.GH_OWNER || "scottelling";
const IGNORE = new Set(["scottelling", "www"]);

async function probe(url) {
  try {
    const r = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(6000) });
    return r.status < 400;
  } catch (_) {
    return false;
  }
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    // 1) what's already on the homepage
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const existing = await fetch(`https://${host}/projects.json?v=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
    const known = new Set(existing.map((p) => p.slug));

    // 2) public repos under the owner
    const repos = await fetch(`https://api.github.com/users/${OWNER}/repos?per_page=100&sort=updated`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "scottelling-gateway" },
      signal: AbortSignal.timeout(8000),
    }).then((r) => (r.ok ? r.json() : []));

    const candidates = (Array.isArray(repos) ? repos : [])
      .map((r) => r.name)
      .filter((slug) => slug && !known.has(slug) && !IGNORE.has(slug));

    // 3) keep only the ones whose subdomain is actually live
    const discovered = [];
    await Promise.all(
      candidates.map(async (slug) => {
        const url = `https://${slug}.${ROOT}`;
        if (await probe(url)) {
          const name = slug.charAt(0).toUpperCase() + slug.slice(1);
          discovered.push({ name, slug, url });
        }
      })
    );

    discovered.sort((a, b) => a.slug.localeCompare(b.slug));
    return res.status(200).json({ discovered, scanned: candidates.length });
  } catch (e) {
    return res.status(500).json({ discovered: [], scanned: 0, error: (e && e.message) || "scan failed" });
  }
};
