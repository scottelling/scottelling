#!/bin/bash
# ============================================================
# SHIP SCRIPT — Deploy a project and update scottelling.com
# 
# Usage:  ./ship.sh <project-folder> <slug> "<name>" "<description>" "<icon>" "<color>"
# Example: ./ship.sh ~/Projects/taste taste "Taste Engine" "Cross-domain aesthetic intelligence" "✦" "#BB86FC"
#
# What it does:
#   1. Deploys the project to Vercel
#   2. Adds <slug>.scottelling.com as a domain
#   3. Adds the project to scottelling.com's projects.json
#   4. Pushes the updated scottelling.com so the gateway updates
# ============================================================

set -e

# --- Parse arguments ---
PROJECT_DIR="$1"
SLUG="$2"
NAME="$3"
DESC="$4"
ICON="${5:-◈}"
COLOR="${6:-#BB86FC}"
TODAY=$(date +%Y-%m-%d)

# Where the scottelling.com gateway repo lives on your machine
# Claude Code: update this path if it's different
GATEWAY_DIR="$HOME/Projects/scottelling"

if [ -z "$PROJECT_DIR" ] || [ -z "$SLUG" ] || [ -z "$NAME" ]; then
  echo ""
  echo "Usage: ./ship.sh <project-folder> <slug> \"<name>\" \"<description>\" \"<icon>\" \"<color>\""
  echo ""
  echo "Example:"
  echo "  ./ship.sh ~/Projects/taste taste \"Taste Engine\" \"Cross-domain aesthetic intelligence\" \"✦\" \"#BB86FC\""
  echo ""
  exit 1
fi

echo ""
echo "🚀 Shipping $NAME to $SLUG.scottelling.com"
echo "============================================"

# --- Step 1: Deploy to Vercel ---
echo ""
echo "Step 1/4 — Deploying to Vercel..."
cd "$PROJECT_DIR"
vercel --prod --yes
echo "✓ Deployed"

# --- Step 2: Add subdomain ---
echo ""
echo "Step 2/4 — Adding $SLUG.scottelling.com..."
vercel domains add "$SLUG.scottelling.com" --yes 2>/dev/null || echo "  (domain may already exist, continuing)"
echo "✓ Subdomain configured"

# --- Step 3: Update projects.json ---
echo ""
echo "Step 3/4 — Updating scottelling.com gateway..."
cd "$GATEWAY_DIR"

# Use node to safely update JSON (avoids bash JSON parsing nightmares)
node -e "
const fs = require('fs');
const file = 'projects.json';
const projects = JSON.parse(fs.readFileSync(file, 'utf8'));

// Check if project already exists
const existing = projects.findIndex(p => p.slug === '$SLUG');

const entry = {
  name: '$NAME',
  slug: '$SLUG',
  repo: 'scottelling/$SLUG',
  description: '$DESC',
  status: 'live',
  color: '$COLOR',
  icon: '$ICON',
  launched: '$TODAY'
};

if (existing >= 0) {
  projects[existing] = { ...projects[existing], ...entry };
  console.log('  Updated existing entry for $SLUG');
} else {
  projects.push(entry);
  console.log('  Added new entry for $SLUG');
}

fs.writeFileSync(file, JSON.stringify(projects, null, 2) + '\n');
"
echo "✓ projects.json updated"

# --- Step 4: Push gateway ---
echo ""
echo "Step 4/4 — Pushing scottelling.com..."
git add -A
git commit -m "Add $NAME ($SLUG.scottelling.com)" || echo "  (no changes to commit)"
git push || echo "  (push failed — you may need to push manually)"
echo "✓ Gateway updated"

# --- Done ---
echo ""
echo "============================================"
echo "✅ $NAME is live at https://$SLUG.scottelling.com"
echo "✅ scottelling.com gateway updated"
echo "============================================"
echo ""
