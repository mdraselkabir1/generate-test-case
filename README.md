# TestForge — Test Case Generator

A web-based tool to generate test plans and test cases from URLs, documents, or text. Hosted on GitHub Pages — no backend required.

![TestForge Dashboard](https://img.shields.io/badge/TestForge-Dashboard-4f46e5?style=for-the-badge)

## Features

- **URL Analysis** — Paste a URL and generate test cases from the page content
- **Document Upload** — Upload `.docx`, `.pdf`, `.txt`, `.md`, `.xlsx`, `.csv` files
- **Text Input** — Paste requirements, user stories, or specifications directly
- **Smart Generation** — Detects actions, entities, requirements, and user stories from content
- **Multiple Test Types** — Functional, UI/UX, API, Security, Performance, Accessibility, Edge Cases
- **Configurable Depth** — Basic (5-10), Standard (10-25), Comprehensive (25-50), Exhaustive (50+)
- **Dashboard** — Overview stats, recent plans, quick actions
- **Export** — CSV, JSON, Markdown, and styled HTML report formats
- **Dark Mode** — Full light/dark theme support
- **Data Persistence** — All data stored in browser localStorage
- **Import/Export Data** — Backup and restore all your test plans
- **Fully Static** — No server needed, runs entirely in the browser

## Quick Start

### Option 1: Use directly via GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages → Source → GitHub Actions**
3. The workflow will automatically deploy
4. Access at `https://<your-username>.github.io/test-case-generator/`

### Option 2: Run locally

```bash
# No build step needed — just serve the static files
npx serve .
# or
python3 -m http.server 8000
# or simply open index.html in your browser
```

## How to Use

1. **Navigate to "Generate Tests"** from the sidebar
2. **Choose your input method:**
   - **URL tab:** Enter a URL and click "Fetch" to extract content
   - **Document tab:** Drag & drop or click to upload a file (.docx, .pdf, .txt, .md, .xlsx, .csv)
   - **Text tab:** Paste your requirements or feature descriptions
3. **Configure generation options:**
   - **Test Plan Name** — Auto-generated if left empty
   - **Test Type Focus** — All types, or focus on Functional, UI, API, Security, etc.
   - **Priority Level** — Filter by Critical, High, Medium, or Low
   - **Generation Depth** — How many test cases to generate
4. **Click "Generate Test Cases"**
5. **View results** in the modal, on the Test Plans page, or the Test Cases page
6. **Export** in your preferred format (CSV, JSON, Markdown, HTML)

## Supported File Types

| Format | Extension | Library Used |
|--------|-----------|-------------|
| Word Documents | `.docx` | Mammoth.js |
| PDF Files | `.pdf` | PDF.js |
| Text Files | `.txt`, `.md` | Native FileReader |
| Spreadsheets | `.xlsx`, `.csv` | SheetJS |

## Project Structure

```
test-case-generator/
├── index.html              # Main HTML (single page app)
├── css/
│   └── styles.css          # Full styling with dark mode
├── js/
│   ├── storage.js          # LocalStorage data layer
│   ├── parser.js           # File parsing & URL fetching
│   ├── generator.js        # Test case generation engine
│   ├── exporter.js         # Export to CSV/JSON/MD/HTML
│   └── app.js              # Main app controller & UI
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Pages auto-deploy
├── package.json
└── README.md
```

## Test Case Generation Logic

The generator analyzes input content to extract:

- **Actions** — verbs like create, delete, login, upload, etc.
- **Entities** — capitalized multi-word names (e.g., User Profile, Shopping Cart)
- **Requirements** — sentences with shall/must/should/will
- **User Stories** — "As a [role], I want [action] so that [benefit]"
- **Keywords** — frequency-based keyword extraction

Based on the analysis, it generates:

| Type | What it covers |
|------|----------------|
| Functional | CRUD operations, action workflows, requirement validation |
| UI/UX | Responsive design, visual consistency, form validation, loading states |
| API | REST endpoints, auth, error handling, rate limiting |
| Security | SQL injection, XSS, CSRF, authentication, authorization, encryption |
| Performance | Page load, concurrency, DB queries, memory usage |
| Accessibility | Keyboard nav, screen readers, color contrast, heading hierarchy |
| Edge Cases | Empty inputs, max length, special chars, network issues, concurrency |

## GitHub Pages Deployment

The included GitHub Actions workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) automatically deploys on every push to `main`.

**Setup steps:**
1. Push this project to a GitHub repository
2. Go to repo **Settings → Pages**
3. Under **Build and deployment**, select **Source: GitHub Actions**
4. Push a commit to trigger the deployment
5. Your site will be live at `https://<username>.github.io/<repo-name>/`

## Settings

Configurable in the Settings page:
- Default generation depth and test type
- Auto-export after generation
- Export format (CSV, JSON, Markdown, HTML)
- CORS proxy URL for fetching external URLs

## License

MIT
