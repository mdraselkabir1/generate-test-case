# TestForge — Test Case Generator

A browser-based test case generation tool for QA teams. Generate test plans from URLs, documents, project folders, or plain text — with optional AI/LLM enhancement. Runs entirely in the browser with no backend required.

**Live App:** [https://mdraselkabir1.github.io/generate-test-case/](https://mdraselkabir1.github.io/generate-test-case/)

---

## Table of Contents

- [Quick Start](#quick-start)
- [User Guide](#user-guide)
  - [Dashboard](#1-dashboard)
  - [Generate Tests](#2-generate-tests)
  - [Test Plans](#3-test-plans)
  - [Test Cases](#4-test-cases)
  - [History](#5-history)
  - [Settings](#6-settings)
  - [Testing Guide](#7-testing-guide)
- [Input Methods](#input-methods)
- [Generation Options](#generation-options)
- [AI / LLM Integration](#ai--llm-integration)
- [Export Formats](#export-formats)
- [Supported File Types](#supported-file-types)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [FAQ](#faq)
- [License](#license)

---

## Quick Start

### Use the hosted version (recommended)

Open [https://mdraselkabir1.github.io/generate-test-case/](https://mdraselkabir1.github.io/generate-test-case/) in Chrome or Edge.

### Run locally

```bash
# No build step needed — just serve static files
npx serve .
# or
python3 -m http.server 8000
# or open index.html directly in your browser
```

### Deploy your own instance

1. Fork or push this repo to GitHub
2. Go to **Settings → Pages → Build and deployment → Source: GitHub Actions**
3. Push to `main` — the included workflow deploys automatically
4. Access at `https://<your-username>.github.io/<repo-name>/`

---

## User Guide

### 1. Dashboard

The landing page shows an overview of your testing activity:

| Section | Description |
|---------|-------------|
| **Stats Cards** | Total test plans, total test cases, documents processed, URLs analyzed |
| **Recent Test Plans** | Quick access to your latest plans |
| **Quick Actions** | Upload Document, Analyze URL, Export All, Clear Data |
| **Generation History** | Timeline of your recent generation activity |

### 2. Generate Tests

This is the main workspace. Click **"Generate Tests"** in the sidebar to start.

#### Step-by-step workflow:

1. **Select an input method** using the tabs at the top: URL, Document, Project, or Text
2. **Provide your content** (see [Input Methods](#input-methods) below)
3. **Configure generation options** (see [Generation Options](#generation-options) below)
4. **(Optional) Enable AI/LLM** for smarter, context-aware test cases
5. Click **"Generate Test Cases"**
6. Review the generated plan in the popup modal
7. Export or navigate to Test Plans to manage

### 3. Test Plans

View and manage all generated test plans.

- **Search** — Filter plans by name using the search box
- **View** — Click the eye icon to see full plan details including all test cases
- **Export** — Download a plan in your preferred format (CSV, JSON, Markdown, HTML)
- **Delete** — Remove a plan you no longer need

Each plan card shows: name, number of test cases, creation time, test types, depth level, and source type.

### 4. Test Cases

Browse all test cases across all plans with powerful filtering:

| Filter | Options |
|--------|---------|
| **Plan** | Filter by specific test plan |
| **Type** | Functional, UI/UX, API, Security, Performance, Accessibility, Integration, Data Integrity, Regression, Compatibility, Error Recovery, Edge Cases, Exploratory |
| **Priority** | Critical, High, Medium, Low |
| **Search** | Free-text search across test case titles |

Each test case shows: ID, title, type badge, priority badge, preconditions, steps, expected result, and notes.

### 5. History

A chronological log of all generation activities. Useful for tracking what was generated and when. You can clear history from this page.

### 6. Settings

#### General Settings
| Setting | Description |
|---------|-------------|
| **Default Generation Depth** | Pre-selects the depth level when generating (Basic, Standard, Comprehensive, Exhaustive, Expert) |
| **Default Test Type** | Pre-selects the test type focus |
| **Auto-export** | Automatically downloads the export file after generation |

#### Export Settings
| Setting | Description |
|---------|-------------|
| **Default Export Format** | Choose between CSV, JSON, Markdown, or HTML Report |

#### CORS Proxy
| Setting | Description |
|---------|-------------|
| **CORS Proxy URL** | Proxy for fetching external URLs that block direct browser requests. Default: `https://api.allorigins.win/raw?url=` |

#### AI / LLM Settings
Configure your default AI provider, model, API key, and generation mode. See [AI / LLM Integration](#ai--llm-integration) for details.

#### Data Management
| Action | Description |
|--------|-------------|
| **Export All Data** | Download all test plans and settings as a JSON backup file |
| **Import Data** | Restore from a previously exported JSON file |
| **Clear All Data** | Delete all test plans, cases, and history (irreversible) |

### 7. Testing Guide

Click the **"Testing Guide"** button in the top bar to open a slide-out reference panel. It contains methodology descriptions and best practices for each test type — useful when deciding which test types to focus on.

---

## Input Methods

### URL
1. Paste a URL (e.g., a requirements page, Jira ticket, wiki)
2. Click **"Fetch"** to extract the page content
3. If the URL requires authentication, enable the **"URL requires authentication"** toggle and choose a method:
   - **Basic Auth** — Username & password
   - **Bearer Token** — API/access token
   - **Session Cookie** — Copy from browser DevTools
   - **Form-Based Login** — Provide login URL + credentials

> **Page Grabber Bookmarklet:** If fetching fails (e.g., SSO/MFA-protected pages), use the **"Grab Page"** bookmarklet. Drag it to your bookmarks bar, click it on any authenticated page, then paste the clipboard content into the Text tab.

### Document
Upload a file by clicking the upload zone or dragging a file onto it. Supported formats:

| Format | Extensions |
|--------|-----------|
| Word Documents | `.docx` |
| PDF Files | `.pdf` |
| Text / Markdown | `.txt`, `.md` |
| Spreadsheets | `.xlsx`, `.csv` |
| Source Code | `.js`, `.ts`, `.py`, `.java`, `.go`, `.rs`, `.c`, `.cpp`, `.rb`, `.php`, and 40+ more |
| Config Files | `.json`, `.yaml`, `.xml`, `.env`, `.toml` |

### Project Folder
Analyze an entire codebase at once. **Requires AI/LLM to be enabled** (it auto-enables when you switch to this tab).

- **Chrome/Edge:** Click **"Select Project Folder"** to use the native folder picker
- **Firefox/Safari:** Drag and drop a folder onto the drop zone

Options:
- **Include existing test files** — Also analyze `*.test.*`, `*.spec.*` files
- **Include documentation** — Include README and docs/ files in the analysis

### Text
Paste any text directly: requirements documents, user stories, feature specs, bug reports, API docs, or anything describing functionality to test.

---

## Generation Options

| Option | Description | Values |
|--------|-------------|--------|
| **Test Plan Name** | Name for the generated plan | Auto-generated if left empty |
| **Test Type Focus** | Multi-select — choose one or more test types to focus on | All Types, Functional, Unit Test, UI/UX, API, Security, Performance, Accessibility, Integration, Data Integrity, Regression, Compatibility, Error Recovery, Edge Cases, Exploratory |
| **Priority Level** | Filter generated cases by priority | All Priorities, Critical, High, Medium, Low |
| **Generation Depth** | Controls the number and thoroughness of generated cases | See table below |

### Depth Levels

| Depth | Test Cases | Edge Cases | Negative Tests | Best For |
|-------|-----------|------------|----------------|----------|
| **Basic** | 5–10 | No | No | Quick smoke tests, initial exploration |
| **Standard** | 10–25 | Yes | Yes | Sprint testing, feature validation |
| **Comprehensive** | 25–50 | Yes | Yes | Release testing, thorough coverage |
| **Exhaustive** | 50–200 | Yes | Yes | Critical features, compliance testing |
| **Expert** | 100–300 | Yes | Yes | Full methodology-driven generation using testing guide |

---

## AI / LLM Integration

Enable the **"Use AI / LLM"** toggle on the Generate Tests page for significantly better test cases. AI analyzes your content deeply and generates context-aware, specific test cases with real field names, API routes, and business logic references.

### Supported Providers

| Provider | Models | API Key Source |
|----------|--------|---------------|
| **OpenAI** | GPT-4o, GPT-4o-mini, GPT-4-turbo, o1-mini | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **Anthropic** | Claude Opus 4, Claude Sonnet 4, Claude 3.5 Sonnet, Claude 3 Haiku | [console.anthropic.com](https://console.anthropic.com/) |
| **Google** | Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **OpenRouter** | Access to 100+ models from one API key | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **Custom / Local** | Ollama, LM Studio, or any OpenAI-compatible API | Self-hosted — no key needed |

### Generation Modes

| Mode | Description |
|------|-------------|
| **LLM Only** | AI generates all test cases from scratch — best quality |
| **Hybrid** | Combines rule-based generation with AI — more volume |
| **Enhance** | Rule-based engine generates first, AI refines and improves — fastest |

### Setup

1. Go to **Generate Tests** page
2. Check **"Use AI / LLM"**
3. Select your **AI Provider**
4. Choose a **Model**
5. Paste your **API Key**
6. Select a **Generation Mode**
7. Generate as normal

> **Security:** API keys are stored in your browser's localStorage only. They are sent directly to the provider's API — never through any intermediary server.

---

## Export Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| **CSV** | `.csv` | Spreadsheet-friendly, import into Excel/Google Sheets |
| **JSON** | `.json` | Machine-readable, for integration with test management tools |
| **Markdown** | `.md` | Human-readable, great for documentation and wikis |
| **HTML Report** | `.html` | Styled standalone report, suitable for sharing via email or printing |

Export a single plan from the plan detail modal, or export all data from **Settings → Data Management**.

---

## Supported File Types

| Category | Extensions | Library |
|----------|-----------|---------|
| Word Documents | `.docx` | Mammoth.js |
| PDF Files | `.pdf` | PDF.js |
| Text / Markdown | `.txt`, `.md` | Native FileReader |
| Spreadsheets | `.xlsx`, `.csv` | SheetJS |
| Source Code | `.js`, `.ts`, `.py`, `.java`, `.go`, `.rs`, `.c`, `.cpp`, `.rb`, `.php`, `.swift`, `.dart`, `.kt`, `.cs`, `.scala`, `.lua`, `.r`, `.pl`, `.ex`, `.erl`, `.hs`, `.clj`, and more | Native FileReader |
| Config / Data | `.json`, `.yaml`, `.yml`, `.xml`, `.toml`, `.ini`, `.env`, `.proto` | Native FileReader |

---

## Deployment

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that auto-deploys to GitHub Pages on every push to `main`.

### Setup steps

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Under **Build and deployment**, set **Source** to **GitHub Actions**
4. Push a commit to `main` to trigger deployment
5. Your app will be live at `https://<username>.github.io/<repo-name>/`

### Requirements

- No build step, no Node.js, no bundler — it's pure static HTML/CSS/JS
- Works in any modern browser (Chrome, Edge, Firefox, Safari)
- Best experience on Chrome/Edge (required for Project folder picker)

---

## Project Structure

```
├── index.html                  # Single-page application
├── css/
│   └── styles.css              # Full styling with light/dark themes
├── js/
│   ├── storage.js              # LocalStorage data layer
│   ├── parser.js               # File parsing & URL fetching
│   ├── generator.js            # Rule-based test case generation engine
│   ├── llm.js                  # AI/LLM integration (OpenAI, Anthropic, Google, etc.)
│   ├── exporter.js             # Export to CSV / JSON / Markdown / HTML
│   ├── methodology.js          # Testing methodology knowledge base
│   ├── methodology-ui.js       # Testing Guide drawer UI
│   └── app.js                  # Main app controller & UI wiring
├── docs/                       # Design documents and specs
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages auto-deploy workflow
├── package.json
└── README.md
```

---

## FAQ

**Q: Is my data safe?**
A: Yes. All data (test plans, settings, API keys) is stored in your browser's localStorage. Nothing is sent to any server except direct API calls to your chosen AI provider.

**Q: Can I use this offline?**
A: The core generation (rule-based) works offline after the page loads. AI/LLM features require internet access to reach the provider API. URL fetching also requires internet.

**Q: Which browser should I use?**
A: Chrome or Edge is recommended for the best experience, especially the Project folder picker feature. Firefox and Safari work for all other features.

**Q: How do I share test plans with my team?**
A: Export a plan as HTML Report (for a formatted document), Markdown (for wikis/docs), CSV (for spreadsheets), or JSON (for tool integration). You can also use **Settings → Export All Data** to share your complete data set.

**Q: Can I use a local/self-hosted AI model?**
A: Yes. Select **"Custom / Local"** as the AI provider and enter your endpoint URL (e.g., `http://localhost:11434/v1/chat/completions` for Ollama). No API key is needed for local models.

**Q: What's the "Expert" depth?**
A: Expert depth generates 100–300 test cases using the built-in testing methodology knowledge base. It applies industry best practices for each test type and produces the most thorough coverage.

**Q: How do I handle pages behind SSO/MFA?**
A: Use the **"Grab Page"** bookmarklet. Drag it to your bookmarks bar, navigate to the authenticated page, click the bookmarklet, then paste the content into TestForge's Text tab.

---

## License

MIT
