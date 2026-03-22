# scottelling.com — Project Gateway

## What This Is
The homepage at scottelling.com. It's a simple gateway that lists all of Scott's live projects as clickable cards. Each project links to its subdomain (e.g. taste.scottelling.com).

The site is **config-driven** — it reads from `projects.json` and renders automatically. No manual HTML editing needed to add projects.

## Files
```
├── index.html       # Gateway site (reads from projects.json)
├── projects.json    # Single source of truth for all projects
├── ship.sh          # Deploy script (automates everything)
└── CLAUDE.md        # This file
```

## How Projects Get Added

### Option A: One-Prompt Ship (preferred)
When Scott says something like **"ship taste-engine to taste.scottelling.com"**, run:

```bash
cd ~/Projects/scottelling
./ship.sh ~/Projects/taste taste "Taste Engine" "Cross-domain aesthetic intelligence" "✦" "#BB86FC"
```

The script handles: Vercel deploy → subdomain setup → projects.json update → git push.

### Option B: Manual Steps (if script fails)
1. Deploy the project: `cd ~/Projects/<project> && vercel --prod --yes`
2. Add subdomain: `vercel domains add <slug>.scottelling.com`
3. Edit `projects.json` — add a new entry
4. Commit and push this repo: `git add -A && git commit -m "Add <project>" && git push`

## projects.json Format
```json
{
  "name": "Taste Engine",          // Display name
  "slug": "taste",                 // Subdomain (taste.scottelling.com)
  "repo": "scottelling/taste",     // GitHub repo
  "description": "Short tagline",  // One line, shown on card
  "status": "live",                // live | beta | coming | hidden
  "color": "#BB86FC",              // Accent color for the card
  "icon": "✦",                     // Emoji or symbol for the card
  "launched": "2026-03-21"         // Date launched
}
```

### Status values:
- **live** — green badge, visible
- **beta** — purple badge, visible
- **coming** — gray badge, visible
- **hidden** — not rendered at all

## DNS & Hosting
- **Hosted on Vercel** — auto-deploys from GitHub on push
- **Wildcard DNS is set up** — `*.scottelling.com` routes to Vercel via CNAME
- **No DNS changes needed** for new subdomains — just add the domain in Vercel project settings
- DNS managed in Replit (A record + wildcard CNAME + www CNAME)

## Design
- Dark mode, minimal, Purple Rain foundation
- Cards with colored accent icons
- Status badges (live/beta/coming)
- Mobile-first, works on all screens
- No build step — pure static HTML + JSON

## Important Paths on Scott's Machine
- Gateway repo: `~/Projects/scottelling/` (adjust if different)
- Individual projects: `~/Projects/<project-name>/`
- Ship script: `~/Projects/scottelling/ship.sh`

## Common Tasks

### "Ship X to X.scottelling.com"
```bash
./ship.sh ~/Projects/<folder> <slug> "<Name>" "<Description>" "<Icon>" "<Color>"
```

### "Update the description for taste engine"
Edit `projects.json`, change the description field, commit and push.

### "Hide a project from the gateway"
Change its status to `"hidden"` in `projects.json`, commit and push.

### "Add a project that isn't deployed yet"
Add it to `projects.json` with status `"coming"`.
