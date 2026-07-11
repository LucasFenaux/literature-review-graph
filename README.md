# Literature Review Graph

An interactive, graph-based literature review tool that lets you build, explore, and manage collections of academic papers. Papers are displayed as nodes in a force-directed graph with citation and reference edges, letting you visually navigate the citation network around your research topics.

> **⚡ Get the most out of this tool:** While the app works out of the box via OpenAlex, **citation and reference expansion works significantly better with a Semantic Scholar API key**. It's free, takes under two minutes to get, and dramatically improves data coverage and reliability for the core graph-building features. See [Configuration](#configuration) to set it up before your first use.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Required Setup](#required-setup)
  - [Semantic Scholar API Key (Strongly Recommended)](#semantic-scholar-api-key-strongly-recommended)
- [Running the App](#running-the-app)
- [Usage Guide](#usage-guide)
  - [1. Creating a Collection](#1-creating-a-collection)
  - [2. Adding Papers](#2-adding-papers)
  - [3. Exploring the Graph](#3-exploring-the-graph)
  - [4. Expanding the Citation Network](#4-expanding-the-citation-network)
  - [5. Working with Paper Details](#5-working-with-paper-details)
  - [6. Filtering & Focusing](#6-filtering--focusing)
  - [7. Managing Your Collection](#7-managing-your-collection)
- [Settings & Maintenance](#settings--maintenance)
- [Project Structure](#project-structure)

---

## Features

### 📚 Collection Management
- Create and switch between multiple named **collections** of papers
- Each collection maintains its own independent graph and paper list
- Papers can be added, promoted to "seed" status, or removed at any time

### 🔍 Paper Search
- Search for papers by **title/keyword**, **author**, or **DOI**
- Results are fetched live from [OpenAlex](https://openalex.org) (no API key required)
- Preview paper details (abstract, venue, authors, citation count) before adding
- Search history is preserved locally per-field for quick re-use

### 🕸️ Interactive Force Graph
- Papers are rendered as nodes in a live **force-directed graph** powered by `react-force-graph-2d` and `d3-force`
- **Seed papers** (your collection) and **related papers** (citations/references) appear as visually distinct nodes
- Edges represent citation relationships between papers
- The graph responds dynamically as you load more papers
- **Cross-collection edges** (papers shared across collections) can be toggled on/off via the "Show Cross Edges" switch

### 🔗 Citation & Reference Expansion
- For any paper in your collection, load its **citing papers** (papers that cite it) or its **references** (papers it cites) with a single click
- **Bulk expand** all collection papers at once — loads citations or references for every seed paper in sequence, with a live progress indicator
- **Rebuild Cross-Edges** recomputes shared citation links across all papers in the graph after a bulk load
- > **This is the core feature of the app, and it relies heavily on Semantic Scholar.** A free API key unlocks much higher rate limits and broader citation coverage. Without it, bulk expansion will be slow and may hit throttling errors frequently.

### 🎛️ Graph Filtering
- **Minimum Connections slider**: hides related papers with fewer than N connections to your seed papers, reducing noise in large graphs. Uses a logarithmic scale when the connection counts are large
- **Focus mode**: click a node's "Focus" button to isolate it and its direct neighbours
- **Collection search**: filter the list of seed papers by title, author, or abstract
- **Related search**: filter the related papers panel by the same fields

### 📄 Paper Detail Popup
- Click any node (or list item) to open a **floating, draggable detail popup**
- Shows: title, venue/journal, authors, publication date, citation count, abstract, and your personal notes
- **Draggable** — grab the handle at the top and move the popup anywhere on screen
- Direct link to **read the paper** (DOI / landing page / PDF)
- **Cite** button opens a modal with formatted citations in APA, MLA, Chicago, Harvard, and BibTeX — click any to copy

### 📝 Personal Notes
- Write and save per-paper notes stored locally in the SQLite database
- Save with the **Save Notes** button or `Ctrl+S` / `Cmd+S`

### ⚙️ API Cache
- All OpenAlex and Semantic Scholar responses are **cached for 24 hours** in the local database
- Cache can be cleared per-collection or globally from Settings to force fresh lookups

### 💾 Database Backup & Restore
- Set a **backup folder** to enable automatic backups every 12 hours
- Trigger a **manual backup** at any time from Settings
- **Restore** the database from any previous backup file (a pre-restore safety backup is created automatically)
- Up to 7 rotating backups are kept; older ones are pruned automatically

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript |
| UI | React 19, Vanilla CSS |
| Graph Engine | [react-force-graph-2d](https://github.com/vasturiano/react-force-graph) + [d3-force](https://github.com/d3/d3-force) |
| State Management | [Zustand](https://github.com/pmndrs/zustand) |
| Database | SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| Paper Data | [OpenAlex API](https://openalex.org) (primary) + [Semantic Scholar API](https://www.semanticscholar.org/product/api) (fallback/citations) |
| Icons | [lucide-react](https://lucide.dev) |

---

## Prerequisites

- **Node.js** v18 or later ([download](https://nodejs.org))
- **npm** v9+ (bundled with Node.js)

No database server is needed — the app uses a local SQLite file (`papers.db`) created automatically on first run.

---

## Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd literature-review-graph

# 2. Install dependencies
npm install

# 3. (Strongly recommended) Set up a Semantic Scholar API key
#    See the Configuration section below — it's free and takes 2 minutes
```

---

## Configuration

### Base Setup

No mandatory configuration is needed. The app works out of the box using the free, unauthenticated [OpenAlex API](https://openalex.org/about). On first launch, it will create a `papers.db` SQLite file in the project root.

### Semantic Scholar API Key (Strongly Recommended)

> **Why this matters:** Semantic Scholar is the primary engine behind citation and reference expansion — the feature that makes this tool actually useful. Without an API key, requests are heavily rate-limited (often just 1 req/5s), bulk expansion will crawl or fail, and coverage of older or less-indexed papers is noticeably worse. **A free API key removes most of these restrictions and takes about two minutes to obtain.**

Get your free key here: **https://www.semanticscholar.org/product/api**

Once you have it, configure it using one of these two methods:

**Option A — via `.env.local` file (recommended, set it before first launch):**

Create a `.env.local` file in the project root:

```env
# Semantic Scholar API key — get yours free at semanticscholar.org/product/api
SEMANTIC_SCHOLAR_API_KEY=your_key_here

# Maximum Semantic Scholar requests per second (default: 1; safe to raise to 5–10 with a free key)
SEMANTIC_SCHOLAR_RATE_LIMIT=1
```

**Option B — via the Settings panel in the UI (no file editing required):**

Open the app → click **Settings** (top-right of the left sidebar) → paste your key into the **Semantic Scholar API Key** field → click **Save**.

This stores the key in the local database and persists across restarts without needing a `.env.local` file.

> **Note:** A key saved through the Settings panel takes precedence over `.env.local`.

---

## Running the App

```bash
# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app runs on port 3000 by default.

**Other scripts:**

```bash
npm run build    # Build a production bundle
npm run start    # Start the production server (requires npm run build first)
npm run lint     # Run ESLint
```

---

## Usage Guide

### 1. Creating a Collection

A **collection** is a named set of seed papers that forms the center of your graph.

1. In the **left sidebar**, click **+ New** next to the collection dropdown.
2. Enter a name (e.g. `"Transformer Architectures"`) and press Enter.
3. Select your new collection from the dropdown — the graph will load (empty at first).

You can create as many collections as you like and switch between them freely.

---

### 2. Adding Papers

Papers are added through the **Add Papers** panel in the left sidebar.

1. Type a **title, keyword, author name, or DOI** into the search box and press **Search** (or Enter).
2. Results appear below with title, venue, year, and citation count.
3. Click **View Details** on any result to preview its full abstract.
4. Click **Add** (or **Add to Collection** in the preview modal) to add it as a seed paper in your collection.

> **DOI search tip:** Paste a full DOI (e.g. `10.1145/3308558.3313543`) or a `doi.org/...` URL to fetch that exact paper.

---

### 3. Exploring the Graph

Once papers are added, they appear as nodes on the **central graph canvas**.

| Action | How |
|---|---|
| **Pan** | Click and drag on empty canvas space |
| **Zoom** | Scroll wheel / pinch |
| **Select a node** | Click on it to open the detail popup |
| **Focus a node** | Open the detail popup → click the Focus button (isolates the node and its neighbours) |
| **Exit focus** | Click any empty area, or toggle focus off |

**Node colours:**
- **Bright / accent colour** → Seed paper (part of your collection)
- **Dimmer / secondary colour** → Related paper (citation or reference, not yet in your collection)

**Toggle Cross Edges:** Use the **Show Cross Edges** toggle in the left sidebar to display or hide citation links that connect papers across different seed papers. Useful when your collection grows large.

---

### 4. Expanding the Citation Network

To discover related work, you can expand individual papers or the entire collection.

**Per-paper expansion** (from the detail popup — only available for seed papers):
- **Load Citations** — fetches papers that *cite* the selected paper
- **Load References** — fetches papers that the selected paper *references*

**Bulk expansion** (from the right panel header):
- **Bulk Load Citations** — loads citations for every seed paper in the collection, sequentially. A progress bar shows `current / total`.
- **Bulk Load References** — same, for references.
- **Rebuild Cross-Edges** — after a bulk load, recalculates citation links between all papers now in the graph. Run this to reveal connections you may have missed.

> Expansion requests are cached for 24 hours. If a request fails (e.g. rate limit), it is queued and retried automatically every 30 seconds in the background.

---

### 5. Working with Paper Details

Click any **node** on the graph or any **paper card** in the right panel to open the floating detail popup.

The popup shows:
- **Title, venue, authors, publication date, citation count**
- **Abstract**
- **Read Paper** button → opens the paper's landing page or PDF in a new tab
- **Cite** button → opens a citation modal with one-click copy in:
  - APA · MLA · Chicago · Harvard · BibTeX

**Personal Notes:**
- Use the text area at the bottom of the popup to write notes about the paper.
- Press `Ctrl+S` / `Cmd+S` or click **Save Notes** to persist them.
- Notes are saved to the local database and survive app restarts.

**Popup interaction:**
- Drag the **handle bar** at the top to move the popup anywhere on screen.
- Click **×** to close it.

---

### 6. Filtering & Focusing

**Minimum Connections slider** (right panel):
- Hides related (non-seed) papers that have fewer than the specified number of citation edges connecting them to your seed papers.
- Set to `1` to show all related papers; increase to surface the most-connected ones.
- When edge counts are large, the slider automatically switches to a log scale.

**Focus mode:**
- Open a paper's detail popup and click **Focus** to isolate it and its direct neighbours on both the graph and the lists.
- Clear focus by clicking elsewhere.

**Search filters:**
- The **Collection Papers** panel (right, top half) has a search box — filter your seed papers by title, author, or abstract keywords.
- The **Related Papers** panel (right, bottom half) has its own search box for the same purpose.
- You can resize the split between the two panels by dragging the divider bar.

---

### 7. Managing Your Collection

**From the right panel:**
- Click a **seed paper card** to select it and open its detail popup.
- Click **Remove** on a seed paper card (with confirmation) to delete it from the collection.

**From the detail popup:**
- For a **related paper**: click **Add to Collection** to promote it to a seed paper.
- Click **Remove from Graph** to remove a related paper from the current view.

**Clearing related papers:**
- Click **Clear Graph** in the Related Papers panel header to remove all non-seed papers from the graph in one shot (useful for starting a fresh expansion).

---

## Settings & Maintenance

Open **Settings** via the button in the left sidebar header.

| Setting | Description |
|---|---|
| **Semantic Scholar API Key** | Strongly recommended — unlocks higher rate limits and better citation coverage. Click View/Hide to reveal the stored key. Get a free key at [semanticscholar.org/product/api](https://www.semanticscholar.org/product/api). |
| **Rate Limit (req/sec)** | Throttle for Semantic Scholar bulk requests (default: 1). With a free API key you can safely raise this to 5–10 for much faster bulk expansion. |
| **S2 API Usage** | Shows how many live API calls and cached responses were made in the last 24h, 7d, and all time. |
| **Background Queue Status** | Pending / failed retry queue entries for expansion jobs that hit rate limits. |
| **Database Backup & Restore** | Configure a backup folder, trigger manual backups, and restore from a file. |
| **API Cache Management** | Clear cached API responses for the current collection or globally. |

### Database Backup

1. Click **Select Folder** to choose a backup directory.
2. The app will automatically write a timestamped `.db` file to that folder every 12 hours.
3. Up to 7 backups are retained; older ones are deleted automatically.
4. Click **Manual Backup Now** to create a backup immediately.
5. Click **Restore Database** to pick a `.db` backup file and restore it. Your current database is automatically saved as a pre-restore backup before overwriting.

### Cache Management

API responses (search, citations, references) are cached for 24 hours to minimise API calls.

- **Clear Collection Cache** — invalidates cache only for papers in the active collection.
- **Clear All Cache** — wipes the entire API cache; all subsequent requests will hit the live APIs.

---

## Project Structure

```
literature-review-graph/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── collection/      # CRUD for individual papers in a collection
│   │   │   ├── collections/     # Collection list & creation
│   │   │   ├── expand/          # Citation/reference expansion endpoint
│   │   │   ├── queue/           # Background retry queue processor
│   │   │   ├── search/          # Paper search endpoint
│   │   │   └── settings/        # Settings, S2 usage, backup, cache endpoints
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Root page — composes the three main panels
│   │   └── globals.css          # Global design tokens & base styles
│   ├── components/
│   │   ├── GraphCanvas.tsx      # Force-directed graph renderer & interaction
│   │   ├── Sidebar.tsx          # Left panel: search, collections, settings
│   │   ├── DetailPanel.tsx      # Right panel: collection/related lists, paper popup, citation modal
│   │   └── SearchInput.tsx      # Reusable search input with history
│   ├── lib/
│   │   ├── db.ts                # SQLite connection, schema setup, backup logic
│   │   ├── openalex.ts          # OpenAlex API client & types
│   │   ├── semanticscholar.ts   # Semantic Scholar API client with backoff & cache
│   │   ├── formatters.ts        # Author name formatting helpers
│   │   └── search.ts            # Local text search / filter utility
│   └── store/
│       └── graphStore.ts        # Zustand store: all graph, collection & filter state
├── papers.db                    # SQLite database (auto-created on first run)
├── .env.local                   # Local environment variables (not committed)
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## Data Sources

| Source | Used For | Auth Required |
|---|---|---|
| [OpenAlex](https://openalex.org) | Paper search, metadata, initial reference lists | No — always free |
| [Semantic Scholar](https://api.semanticscholar.org) | Citation & reference expansion (the core graph-building feature) | **Free API key strongly recommended** — dramatically better rate limits and coverage |

> The app can run on OpenAlex alone, but **citation expansion — the heart of the tool — works best with Semantic Scholar**. OpenAlex provides a good starting point for search and metadata; Semantic Scholar provides richer, higher-volume citation data needed to build a meaningful graph.

All data is stored locally in `papers.db` and is never sent anywhere beyond these two public APIs.
