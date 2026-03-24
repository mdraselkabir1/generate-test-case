/**
 * Parser Module — extracts text content from various file types and URLs.
 */
const Parser = (() => {

  /**
   * Parse uploaded file and return extracted text content.
   */
  // Source code and documentation file extensions
  const CODE_EXTENSIONS = new Set([
    'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
    'py', 'pyw',
    'java', 'kt', 'kts', 'scala', 'groovy',
    'c', 'h', 'cpp', 'hpp', 'cc', 'cxx',
    'cs', 'fs', 'vb',
    'go', 'rs', 'swift', 'dart', 'lua', 'r',
    'rb', 'php', 'pl', 'pm',
    'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd',
    'sql', 'graphql', 'gql',
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    'xml', 'xsl', 'xsd', 'wsdl',
    'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env',
    'proto', 'thrift', 'avsc',
    'dockerfile', 'makefile', 'cmake',
    'tf', 'hcl',
    'vue', 'svelte',
    'ex', 'exs', 'erl', 'hrl',
    'hs', 'elm', 'clj', 'cljs',
  ]);

  const DOC_EXTENSIONS = new Set([
    'md', 'mdx', 'rst', 'adoc', 'txt', 'rtf', 'log',
    'feature', 'story', 'spec',
  ]);

  async function parseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    // Also handle extensionless files like Dockerfile, Makefile
    const baseName = file.name.split('/').pop().toLowerCase();

    if (CODE_EXTENSIONS.has(ext) || CODE_EXTENSIONS.has(baseName)) {
      const raw = await readAsText(file);
      return annotateSourceCode(raw, ext, file.name);
    }
    if (DOC_EXTENSIONS.has(ext)) {
      return await readAsText(file);
    }
    switch (ext) {
      case 'docx':
        return await parseDocx(file);
      case 'pdf':
        return await parsePdf(file);
      case 'xlsx':
      case 'csv':
        return await parseSpreadsheet(file);
      default:
        // Try reading as text (best-effort for unknown extensions)
        try {
          const text = await readAsText(file);
          if (text && text.length > 0 && !/\x00/.test(text.substring(0, 500))) {
            return annotateSourceCode(text, ext, file.name);
          }
        } catch { /* not text */ }
        throw new Error(`Unsupported file type: .${ext}`);
    }
  }

  /**
   * Annotate source code with metadata header so the analyzer knows it's code.
   */
  function annotateSourceCode(raw, ext, fileName) {
    const lang = detectLanguage(ext);
    const lineCount = raw.split('\n').length;
    const header = [
      `[SOURCE_CODE]`,
      `File: ${fileName}`,
      `Language: ${lang}`,
      `Lines: ${lineCount}`,
      `[/SOURCE_CODE_META]`,
      '',
    ].join('\n');
    return header + raw;
  }

  function detectLanguage(ext) {
    const map = {
      js: 'JavaScript', jsx: 'JavaScript (React)', ts: 'TypeScript', tsx: 'TypeScript (React)',
      mjs: 'JavaScript (ESM)', cjs: 'JavaScript (CJS)',
      py: 'Python', pyw: 'Python',
      java: 'Java', kt: 'Kotlin', kts: 'Kotlin Script', scala: 'Scala', groovy: 'Groovy',
      c: 'C', h: 'C/C++ Header', cpp: 'C++', hpp: 'C++ Header', cc: 'C++', cxx: 'C++',
      cs: 'C#', fs: 'F#', vb: 'Visual Basic',
      go: 'Go', rs: 'Rust', swift: 'Swift', dart: 'Dart', lua: 'Lua', r: 'R',
      rb: 'Ruby', php: 'PHP', pl: 'Perl', pm: 'Perl Module',
      sh: 'Shell', bash: 'Bash', zsh: 'Zsh', ps1: 'PowerShell', bat: 'Batch', cmd: 'Batch',
      sql: 'SQL', graphql: 'GraphQL', gql: 'GraphQL',
      html: 'HTML', htm: 'HTML', css: 'CSS', scss: 'SCSS', sass: 'Sass', less: 'Less',
      xml: 'XML', json: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML',
      ini: 'INI', cfg: 'Config', conf: 'Config', env: 'Environment',
      proto: 'Protocol Buffers', thrift: 'Thrift', avsc: 'Avro Schema',
      dockerfile: 'Dockerfile', makefile: 'Makefile', cmake: 'CMake',
      tf: 'Terraform', hcl: 'HCL',
      vue: 'Vue', svelte: 'Svelte',
      ex: 'Elixir', exs: 'Elixir Script', erl: 'Erlang',
      hs: 'Haskell', elm: 'Elm', clj: 'Clojure', cljs: 'ClojureScript',
      feature: 'Gherkin', spec: 'Specification',
    };
    return map[ext] || ext.toUpperCase();
  }

  function readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  function readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  async function parseDocx(file) {
    const arrayBuffer = await readAsArrayBuffer(file);
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  async function parsePdf(file) {
    const arrayBuffer = await readAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join(' ');
      pages.push(text);
    }
    return pages.join('\n\n');
  }

  async function parseSpreadsheet(file) {
    const arrayBuffer = await readAsArrayBuffer(file);
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const results = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      results.push(`--- Sheet: ${sheetName} ---\n${csv}`);
    }
    return results.join('\n\n');
  }

  /**
   * List of CORS proxy services to try in order.
   */
  const CORS_PROXIES = [
    { name: 'allorigins', buildUrl: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
    { name: 'corsproxy.io', buildUrl: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}` },
    { name: 'cors-anywhere-alt', buildUrl: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
  ];

  /**
   * Detect if a URL uses client-side hash routing (SPA).
   */
  function detectSpaHash(url) {
    try {
      const parsed = new URL(url);
      return parsed.hash && parsed.hash.length > 2; // more than just "#"
    } catch { return false; }
  }

  /**
   * Strip hash fragment from a URL (hash is never sent to the server).
   */
  function stripHash(url) {
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      return parsed.toString();
    } catch { return url; }
  }

  /**
   * Check if fetched HTML looks like a SPA shell rather than real content.
   */
  function isSpaShell(html) {
    const lower = html.toLowerCase();
    const spaIndicators = [
      '<app-root', '<app-component', 'ng-app', 'ng-version',
      'id="root"></div>', 'id="app"></div>', '__next', '__nuxt',
      'window.__INITIAL_STATE__', 'data-reactroot',
    ];
    const matchCount = spaIndicators.filter(s => lower.includes(s)).length;
    // Also check: very little visible text relative to total HTML size
    const textContent = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const isLowContent = html.length > 500 && textContent.length < html.length * 0.05;
    return matchCount >= 1 || isLowContent;
  }

  // ---- Known SPA platform detectors ----

  /**
   * Detect if a URL points to a known SPA platform with REST API.
   * Returns platform config if detected, null otherwise.
   */
  function detectKnownPlatform(url, html) {
    const lower = (html || '').toLowerCase();
    // Coverity Connect — Angular SPA with <cim-root> and COVJSESSIONID
    if (lower.includes('<cim-root') || lower.includes('coverity') || /covjsessionid/i.test(html)) {
      return { name: 'coverity', label: 'Coverity Connect' };
    }
    // SonarQube
    if (lower.includes('sonarqube') || lower.includes('<div id="content">') && lower.includes('sonar')) {
      return { name: 'sonarqube', label: 'SonarQube' };
    }
    // Jira
    if (lower.includes('atlassian') || lower.includes('jira')) {
      return { name: 'jira', label: 'Jira' };
    }
    return null;
  }

  /**
   * Fetch data from Coverity Connect REST API v2 and format as readable text.
   */
  async function fetchCoverityApi(baseUrl, corsProxy, authConfig) {
    const base = baseUrl.replace(/\/+$/, '');
    const hashRoute = (new URL(baseUrl.replace(/#.*/, '') + '#')).hash || '';

    // Build auth header for direct requests
    const headers = { 'Accept': 'application/json' };
    if (authConfig && authConfig.enabled && authConfig.type === 'basic') {
      headers['Authorization'] = 'Basic ' + btoa(authConfig.username + ':' + authConfig.password);
    } else if (authConfig && authConfig.enabled && authConfig.type === 'bearer') {
      headers['Authorization'] = 'Bearer ' + authConfig.token;
    }

    // Helper to fetch a single API endpoint (tries direct, then each proxy)
    async function apiGet(path) {
      const fullUrl = base + path;
      const attempts = [
        { name: 'direct', url: fullUrl },
      ];
      if (corsProxy) {
        attempts.push({ name: 'custom-proxy', url: corsProxy + encodeURIComponent(fullUrl) });
      }
      for (const proxy of CORS_PROXIES) {
        attempts.push({ name: proxy.name, url: proxy.buildUrl(fullUrl) });
      }
      for (const attempt of attempts) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);
          const opts = { headers, signal: controller.signal };
          if (attempt.name === 'direct') {
            opts.credentials = 'include';
          }
          const res = await fetch(attempt.url, opts);
          clearTimeout(timeout);
          if (!res.ok) continue;
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('json')) {
            return await res.json();
          }
          // If HTML returned, the endpoint doesn't exist
          const text = await res.text();
          if (text.startsWith('{') || text.startsWith('[')) {
            try { return JSON.parse(text); } catch { /* not JSON */ }
          }
          return null; // HTML error page
        } catch { /* next */ }
      }
      return null;
    }

    // Fetch all available Coverity endpoints in parallel
    const [projects, streams, users, roles, groups, componentMaps] = await Promise.all([
      apiGet('/api/v2/projects?rowCount=100'),
      apiGet('/api/v2/streams?rowCount=100'),
      apiGet('/api/v2/users?rowCount=100'),
      apiGet('/api/v2/roles?rowCount=100'),
      apiGet('/api/v2/groups?rowCount=100'),
      apiGet('/api/v2/componentMaps?rowCount=100'),
    ]);

    // Build readable text output
    const lines = [];
    lines.push('# Coverity Connect — Extracted via REST API');
    lines.push(`Source: ${baseUrl}`);
    lines.push('');

    if (projects && projects.projects) {
      lines.push('## Projects');
      for (const p of projects.projects) {
        lines.push(`### ${p.name} (Key: ${p.projectKey})`);
        if (p.description) lines.push(`Description: ${p.description}`);
        lines.push(`Created by: ${p.createdBy} on ${p.dateCreated}`);
        if (p.streams && p.streams.length) {
          lines.push('Streams:');
          for (const s of p.streams) {
            lines.push(`  - ${s.name} (Language: ${s.language}, Component Map: ${s.componentMapName})`);
            lines.push(`    Triage Store: ${s.triageStoreName}, Desktop Analysis: ${s.enableDesktopAnalysis}`);
          }
        }
        if (p.roleAssignments && p.roleAssignments.length) {
          lines.push('Role Assignments:');
          for (const r of p.roleAssignments) {
            const who = r.username || (r.group && r.group.name) || 'unknown';
            lines.push(`  - ${who}: ${r.roleName} (${r.scope})`);
          }
        }
        lines.push('');
      }
    }

    if (streams && streams.streams) {
      lines.push('## All Streams');
      for (const s of streams.streams) {
        lines.push(`- ${s.name} → Project: ${s.primaryProjectName}, Language: ${s.language}`);
        lines.push(`  Component Map: ${s.componentMapName}, Triage Store: ${s.triageStoreName}`);
        lines.push(`  Owner Assignment: ${s.ownerAssignmentOption}, Desktop Analysis: ${s.enableDesktopAnalysis}`);
      }
      lines.push('');
    }

    if (users && users.users) {
      lines.push('## Users');
      for (const u of users.users) {
        const name = [u.givenName, u.familyName].filter(Boolean).join(' ');
        lines.push(`- ${u.name} (${name}) — Groups: ${(u.groupNames || []).join(', ')}`);
        lines.push(`  Super User: ${u.superUser}, Disabled: ${u.disabled}, Local: ${u.local}`);
        if (u.lastLogin) lines.push(`  Last Login: ${u.lastLogin}`);
        if (u.roleAssignments && u.roleAssignments.length) {
          for (const r of u.roleAssignments) {
            lines.push(`  Role: ${r.roleName} (${r.scope})`);
          }
        }
      }
      lines.push('');
    }

    if (roles && roles.roles) {
      lines.push('## Roles & Permissions');
      for (const r of roles.roles) {
        lines.push(`### ${r.displayName}`);
        lines.push(`Description: ${r.displayDescription}`);
        lines.push(`Permissions:`);
        for (const p of (r.displayPermissions || [])) {
          lines.push(`  - ${p.displayName}`);
        }
        lines.push('');
      }
    }

    if (groups && groups.groups) {
      lines.push('## Groups');
      for (const g of groups.groups) {
        lines.push(`- ${g.name}${g.domainName ? ' (Domain: ' + g.domainName + ')' : ''}`);
      }
      lines.push('');
    }

    if (componentMaps && componentMaps.componentMaps) {
      lines.push('## Component Maps');
      for (const c of componentMaps.componentMaps) {
        lines.push(`- ${c.name}${c.description ? ': ' + c.description : ''}`);
      }
      lines.push('');
    }

    const result = lines.join('\n').trim();
    if (result.split('\n').length < 5) {
      throw new Error('Coverity API returned very little data. The credentials may be wrong or the instance is empty.');
    }
    return result;
  }

  /**
   * Fetch content from a URL (through CORS proxy), with optional auth.
   * Detects known SPA platforms (Coverity, etc.) and uses their REST API.
   * Tries multiple proxies on failure. When auth is enabled, direct fetch is
   * tried first because CORS proxies typically do not forward auth headers.
   */
  async function fetchUrl(url, corsProxy, authConfig) {
    const hasAuth = authConfig && authConfig.enabled;
    const isSpa = detectSpaHash(url);
    const fetchTarget = stripHash(url); // server never sees hash

    const headers = {};

    if (hasAuth) {
      switch (authConfig.type) {
        case 'basic': {
          const encoded = btoa(authConfig.username + ':' + authConfig.password);
          headers['Authorization'] = 'Basic ' + encoded;
          break;
        }
        case 'bearer': {
          headers['Authorization'] = 'Bearer ' + authConfig.token;
          break;
        }
        case 'cookie': {
          headers['Cookie'] = authConfig.cookie;
          break;
        }
        case 'form': {
          const loginResult = await formLogin(authConfig, corsProxy);
          if (loginResult.cookie) {
            headers['Cookie'] = loginResult.cookie;
          }
          break;
        }
      }
    }

    // --- Build ordered list of fetch strategies ---
    const strategies = [];

    // When auth is enabled, try direct fetch FIRST (proxies won't forward auth)
    if (hasAuth) {
      strategies.push({ name: 'direct+auth', url: fetchTarget, useCredentials: true });
      // Also try basic-auth-in-URL for proxies (some proxies honour this)
      if (authConfig.type === 'basic') {
        try {
          const parsed = new URL(fetchTarget);
          parsed.username = authConfig.username;
          parsed.password = authConfig.password;
          const authUrl = parsed.toString();
          if (corsProxy) {
            strategies.push({ name: 'custom-proxy+url-auth', url: corsProxy + encodeURIComponent(authUrl) });
          }
          for (const proxy of CORS_PROXIES) {
            strategies.push({ name: proxy.name + '+url-auth', url: proxy.buildUrl(authUrl) });
          }
        } catch { /* skip URL-embedded auth if URL parsing fails */ }
      }
    }

    // Custom proxy
    if (corsProxy) {
      strategies.push({ name: 'custom', url: corsProxy + encodeURIComponent(fetchTarget) });
    }

    // Built-in proxies
    for (const proxy of CORS_PROXIES) {
      const pUrl = proxy.buildUrl(fetchTarget);
      if (!strategies.some(s => s.url === pUrl)) {
        strategies.push({ name: proxy.name, url: pUrl });
      }
    }

    // Direct fetch without auth (last resort if no auth, or as fallback)
    if (!hasAuth) {
      strategies.push({ name: 'direct', url: fetchTarget });
    }

    // --- Try each strategy ---
    let lastError = null;
    let spaWarning = '';

    for (const strategy of strategies) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const fetchOpts = {
          headers: strategy.useCredentials ? headers : {},
          signal: controller.signal,
        };
        if (strategy.useCredentials) {
          fetchOpts.credentials = 'include';
          fetchOpts.mode = 'cors';
        }

        const response = await fetch(strategy.url, fetchOpts);
        clearTimeout(timeout);

        if (!response.ok) {
          lastError = new Error(`${strategy.name}: HTTP ${response.status}`);
          continue;
        }

        const html = await response.text();
        if (!html || html.trim().length < 50) {
          lastError = new Error(`${strategy.name}: Empty or too short response`);
          continue;
        }

        // Detect known SPA platform and switch to API-based fetching
        const platform = detectKnownPlatform(url, html);
        if (platform) {
          try {
            if (platform.name === 'coverity') {
              return await fetchCoverityApi(fetchTarget, corsProxy, authConfig);
            }
          } catch (apiErr) {
            lastError = apiErr;
            // Fall through to generic SPA handling
          }
        }

        // Detect generic SPA shell
        if (isSpaShell(html)) {
          spaWarning = `Note: This appears to be a Single Page Application (SPA). ` +
            `The fetched content is the app shell, not the rendered "${url.split('#')[1] || ''}" page. ` +
            `For best results, open the page in your browser, select all visible content (Ctrl+A / Cmd+A), ` +
            `copy it, and paste it into the Text Input tab.\n\n---\n\n`;
        }

        const extracted = extractTextFromHtml(html);
        return spaWarning + extracted;
      } catch (err) {
        lastError = err;
      }
    }

    // Build actionable error message
    let errorMsg = `Failed to fetch URL after trying ${strategies.length} methods.`;
    if (isSpa) {
      errorMsg += `\n\nThis URL uses client-side routing (${url.split('#')[1] || '#'}). The page content is rendered by JavaScript in the browser and cannot be fetched server-side.`;
    }
    if (hasAuth) {
      errorMsg += `\n\nThe site requires authentication, which CORS proxies cannot forward.`;
    }
    errorMsg += `\n\nSuggested workarounds:\n` +
      `1. Open the URL in your browser (authenticated), select all content (Ctrl+A), copy, and paste into the Text Input tab.\n` +
      `2. Save the page as HTML from your browser (Ctrl+S) and upload it via the File tab.\n` +
      `3. Use browser DevTools → Console → document.body.innerText, copy the output, and paste it.`;
    if (lastError) {
      errorMsg += `\n\nLast error: ${lastError.message}`;
    }
    throw new Error(errorMsg);
  }

  /**
   * Perform form-based login and return session cookies.
   */
  async function formLogin(authConfig, corsProxy) {
    const loginUrl = authConfig.loginUrl;
    if (!loginUrl) throw new Error('Login URL is required for form-based authentication');

    const formData = new URLSearchParams();
    formData.append('username', authConfig.username);
    formData.append('email', authConfig.username);
    formData.append('password', authConfig.password);

    const proxyLoginUrl = corsProxy ? corsProxy + encodeURIComponent(loginUrl) : loginUrl;

    try {
      const response = await fetch(proxyLoginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
        credentials: 'include',
      });

      const cookie = response.headers.get('set-cookie') || '';
      return { cookie, ok: response.ok };
    } catch (err) {
      throw new Error(`Form login failed: ${err.message}. Try using Cookie method instead — log in manually and paste your session cookie.`);
    }
  }

  /**
   * Extract meaningful text from HTML string.
   */
  function extractTextFromHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove script, style, nav, footer elements
    const removeTags = ['script', 'style', 'nav', 'footer', 'header', 'iframe', 'noscript'];
    removeTags.forEach(tag => {
      doc.querySelectorAll(tag).forEach(el => el.remove());
    });

    // Try to get main content area first
    const mainContent = doc.querySelector('main, article, [role="main"], .content, .main, #content, #main');
    const target = mainContent || doc.body;

    if (!target) return html;

    // Extract text with structure
    const lines = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text) lines.push(text);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        if (['h1','h2','h3','h4','h5','h6'].includes(tag)) {
          lines.push('\n## ' + node.textContent.trim());
        } else if (tag === 'li') {
          lines.push('- ' + node.textContent.trim());
        } else if (['p','div','section','tr'].includes(tag)) {
          node.childNodes.forEach(walk);
          lines.push('');
        } else {
          node.childNodes.forEach(walk);
        }
      }
    };
    walk(target);

    return lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Analyze text and extract structured features/requirements.
   * Enhanced deep-analysis engine: extracts API endpoints, form fields,
   * business rules, data models, workflows, roles, error patterns, and more.
   */
  function analyzeContent(text) {
    const sections = [];
    const features = [];
    const requirements = [];
    const userStories = [];
    const entities = new Set();
    const actions = new Set();
    const apiEndpoints = [];
    const formFields = [];
    const businessRules = [];
    const workflows = [];
    const roles = new Set();
    const errorPatterns = [];
    const dataModels = [];
    const integrationPoints = [];
    const stateTransitions = [];
    const boundaryValues = [];
    const securityConcerns = [];

    // --- Source code analysis structures ---
    const codeAnalysis = {
      isSourceCode: false,
      language: '',
      fileName: '',
      functions: [],    // { name, params, returnType, lineNum, isAsync, isExported, visibility, body }
      classes: [],       // { name, methods[], properties[], extends, implements, lineNum }
      imports: [],       // { module, names[], lineNum }
      exports: [],       // { name, type, lineNum }
      errorHandling: [], // { type: 'try-catch'|'throw'|'assert', context, lineNum }
      conditionals: [],  // { condition, lineNum, complexity }
      loops: [],         // { type, iterable, lineNum }
      constants: [],     // { name, value, lineNum }
      typeDefinitions: [], // { name, fields, lineNum }
      apiRoutes: [],     // { method, path, handler, lineNum }
      dbOperations: [],  // { type, table/model, lineNum }
      envVariables: [],  // { name, lineNum }
      dependencies: [],  // from package.json / requirements.txt / etc
      todos: [],         // TODO/FIXME/HACK/XXX comments
      complexity: { functions: 0, branches: 0, loops: 0, depth: 0 },
    };

    const lines = text.split('\n');
    const trimmedLines = lines.map(l => l.trim()).filter(Boolean);

    // Detect if this is source code from our annotation
    const sourceMatch = text.match(/^\[SOURCE_CODE\]\nFile: (.+)\nLanguage: (.+)\nLines: (\d+)\n\[\/SOURCE_CODE_META\]/);
    if (sourceMatch) {
      codeAnalysis.isSourceCode = true;
      codeAnalysis.fileName = sourceMatch[1];
      codeAnalysis.language = sourceMatch[2];
    }

    // --- Source code deep extraction ---
    if (codeAnalysis.isSourceCode) {
      analyzeSourceCode(lines, codeAnalysis);
    }

    let currentSection = '';
    let currentWorkflow = [];
    let workflowActive = false;

    for (const line of trimmedLines) {
      // Detect headings / sections
      if (/^#{1,6}\s/.test(line) || /^[A-Z][A-Za-z\s]{2,50}:?\s*$/.test(line)) {
        // close any active workflow
        if (workflowActive && currentWorkflow.length > 1) {
          workflows.push({ name: currentSection, steps: [...currentWorkflow] });
        }
        currentWorkflow = [];
        workflowActive = false;

        currentSection = line.replace(/^#+\s*/, '').replace(/:$/, '').trim();
        sections.push(currentSection);
      }

      // Detect user stories
      if (/as a .+ i want .+ so that/i.test(line)) {
        userStories.push(line);
      }

      // Detect requirement patterns
      if (/\b(shall|must|should|will|need to|required to)\b/i.test(line)) {
        requirements.push(line);
      }

      // Detect feature descriptions
      if (/\b(feature|functionality|capability|module|component|screen|page|endpoint|api)\b/i.test(line)) {
        features.push(line);
      }

      // Extract entity names (capitalized multi-word = likely entities)
      const entityMatches = line.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/g);
      if (entityMatches) entityMatches.forEach(e => entities.add(e));

      // Extract action verbs
      const actionPatterns = /\b(create|read|update|delete|submit|login|logout|register|search|filter|sort|upload|download|export|import|approve|reject|cancel|send|receive|validate|verify|display|show|hide|enable|disable|add|remove|edit|view|list|save|load|navigate|redirect|authenticate|authorize|configure|manage|process|calculate|generate|reset|change|select|deselect|check|uncheck|toggle|expand|collapse|open|close|drag|drop|scroll|zoom|print|share|notify|subscribe|unsubscribe|pay|checkout|refund|ship|deliver|assign|escalate|archive|restore|merge|split|sync|retry|refresh|monitor|alert|audit|log|encrypt|decrypt|hash|sign|revoke|grant|deny|block|unblock|suspend|activate|deactivate|publish|unpublish|schedule|postpone|batch|queue|stream|cache|invalidate|migrate|rollback|deploy|provision)\b/gi;
      const actionMatches = line.match(actionPatterns);
      if (actionMatches) actionMatches.forEach(a => actions.add(a.toLowerCase()));

      // --- Deep analysis: API endpoints ---
      const endpointMatch = line.match(/\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\/?([a-zA-Z0-9_\-\/{}:]+)/i);
      if (endpointMatch) {
        apiEndpoints.push({ method: endpointMatch[1].toUpperCase(), path: '/' + endpointMatch[2].replace(/^\//, '') });
      }
      const urlPatternMatch = line.match(/\/api\/[a-zA-Z0-9_\-\/{}:]+/g);
      if (urlPatternMatch) {
        urlPatternMatch.forEach(u => {
          if (!apiEndpoints.some(e => e.path === u)) {
            apiEndpoints.push({ method: 'GET', path: u });
          }
        });
      }

      // --- Deep analysis: form fields & input types ---
      const fieldMatch = line.match(/\b(field|input|textbox|textarea|checkbox|radio|dropdown|select|picker|date\s*picker|file\s*upload|password\s*field|email\s*field|phone\s*field|search\s*bar|slider|toggle|switch)[:\s]+["']?([^"'\n,;]{2,60})/i);
      if (fieldMatch) {
        formFields.push({ type: fieldMatch[1].toLowerCase().trim(), name: fieldMatch[2].trim() });
      }
      // Detect field-like patterns: "Name:", "Email:", etc. followed by input descriptions
      const labelMatch = line.match(/^[-•*]?\s*([\w\s]{2,30}):\s*(required|optional|mandatory|text|number|email|phone|date|url|password)/i);
      if (labelMatch) {
        formFields.push({ type: labelMatch[2].toLowerCase().trim(), name: labelMatch[1].trim() });
      }

      // --- Deep analysis: business rules ---
      if (/\b(if|when|whenever|unless|only if|provided that|on condition)\b.+\b(then|shall|must|should|will)\b/i.test(line)) {
        businessRules.push(line);
      }
      if (/\b(rule|constraint|validation|condition|limit|threshold|maximum|minimum|at least|at most|no more than|no less than|between)\b/i.test(line)) {
        businessRules.push(line);
      }

      // --- Deep analysis: workflows (sequential steps) ---
      if (/^(\d+[\.\)]\s|step\s*\d+|[-•*]\s)/i.test(line)) {
        workflowActive = true;
        currentWorkflow.push(line.replace(/^(\d+[\.\)]\s|step\s*\d+[:\.\)]\s*|[-•*]\s)/i, '').trim());
      } else if (workflowActive && line.length > 10) {
        // End workflow on non-step line
        if (currentWorkflow.length > 1) {
          workflows.push({ name: currentSection || 'Workflow', steps: [...currentWorkflow] });
        }
        currentWorkflow = [];
        workflowActive = false;
      }

      // --- Deep analysis: user roles ---
      const roleMatch = line.match(/\b(admin|administrator|user|manager|editor|viewer|moderator|operator|customer|guest|owner|member|subscriber|superadmin|super\s*user|support|agent|analyst|developer|tester|reviewer|approver)\b/gi);
      if (roleMatch) roleMatch.forEach(r => roles.add(r.toLowerCase()));
      // "As a <role>" pattern
      const asARole = line.match(/as an?\s+([a-z\s]{2,30}?)[\s,]/i);
      if (asARole) roles.add(asARole[1].trim().toLowerCase());

      // --- Deep analysis: error patterns ---
      if (/\b(error|exception|failure|fail|invalid|denied|forbidden|unauthorized|timeout|unavailable|conflict|not found|exceeded|overflow|corrupt|violation|rejected|blocked)\b/i.test(line)) {
        errorPatterns.push(line);
      }

      // --- Deep analysis: data models (field lists, schema-like) ---
      const dataFieldMatch = line.match(/\b(string|integer|int|float|double|boolean|bool|date|datetime|timestamp|uuid|id|text|varchar|char|decimal|bigint|array|object|enum|json|blob)\b/i);
      if (dataFieldMatch) {
        dataModels.push(line);
      }

      // --- Deep analysis: integrations ---
      if (/\b(integrate|integration|third.?party|external|webhook|callback|api\s*call|microservice|service|message\s*queue|kafka|rabbitmq|redis|elasticsearch|s3|stripe|paypal|twilio|sendgrid|firebase|aws|azure|gcp|oauth|sso|saml|ldap|smtp|ftp|sftp|grpc|graphql|websocket|mqtt|rest\s*api)\b/i.test(line)) {
        integrationPoints.push(line);
      }

      // --- Deep analysis: state transitions ---
      const stateMatch = line.match(/\b(status|state)\b.+\b(from|changes?\s+to|transitions?\s+to|moves?\s+to|becomes?)\b.+/i);
      if (stateMatch) {
        stateTransitions.push(line);
      }
      // "pending -> approved -> completed" style
      const arrowStates = line.match(/(\w+)\s*(?:->|→|=>|-->)\s*(\w+)/g);
      if (arrowStates) {
        arrowStates.forEach(s => stateTransitions.push(s));
      }

      // --- Deep analysis: boundary values ---
      const boundaryMatch = line.match(/\b(max(?:imum)?|min(?:imum)?|limit|range|between|at\s+least|at\s+most|up\s+to|no\s+more\s+than|exceeds?|greater\s+than|less\s+than)\b[:\s]*(\d[\d,.\s]*)/i);
      if (boundaryMatch) {
        boundaryValues.push({ description: line, value: boundaryMatch[2].trim(), type: boundaryMatch[1].toLowerCase() });
      }

      // --- Deep analysis: security concerns ---
      if (/\b(authentication|authorization|permission|role.based|access\s*control|encrypt|decrypt|hash|token|session|cookie|csrf|xss|injection|sanitize|validate|password|credential|secret|api.key|certificate|ssl|tls|https|oauth|jwt|cors|firewall|rate.limit|brute.force|captcha|2fa|mfa|two.factor|multi.factor|audit.log|compliance|gdpr|hipaa|pci|sox)\b/i.test(line)) {
        securityConcerns.push(line);
      }
    }

    // Flush remaining workflow
    if (currentWorkflow.length > 1) {
      workflows.push({ name: currentSection || 'Workflow', steps: [...currentWorkflow] });
    }

    // Compute keywords
    const wordFreq = {};
    const stopWords = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','shall','should','would','could','can','may','might','must','that','this','these','those','it','its','of','in','to','for','with','on','at','by','from','or','and','but','not','no','if','then','else','when','where','how','what','which','who','whom','as','into','through','about','above','below','between','out','up','down','off','over','under','again','further','once']);
    text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach(word => {
      if (word.length > 2 && !stopWords.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    const keywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([word]) => word);

    // Deduplicate arrays
    const uniqueFilter = (arr, maxLen) => [...new Set(arr)].slice(0, maxLen);

    return {
      sections,
      features: features.slice(0, 50),
      requirements: requirements.slice(0, 50),
      userStories: userStories.slice(0, 30),
      entities: [...entities].slice(0, 30),
      actions: [...actions],
      keywords,
      apiEndpoints: apiEndpoints.slice(0, 50),
      formFields: formFields.slice(0, 50),
      businessRules: uniqueFilter(businessRules, 40),
      workflows: workflows.slice(0, 20),
      roles: [...roles],
      errorPatterns: uniqueFilter(errorPatterns, 30),
      dataModels: uniqueFilter(dataModels, 30),
      integrationPoints: uniqueFilter(integrationPoints, 20),
      stateTransitions: uniqueFilter(stateTransitions, 20),
      boundaryValues: boundaryValues.slice(0, 20),
      securityConcerns: uniqueFilter(securityConcerns, 30),
      totalLines: trimmedLines.length,
      rawText: text,
      codeAnalysis,
    };
  }

  /**
   * Deep source code analyzer — extracts functions, classes, imports, routes,
   * error handling, conditionals, loops, DB operations, and complexity metrics.
   */
  function analyzeSourceCode(lines, ca) {
    const lang = ca.language.toLowerCase();
    const isJS = /javascript|typescript|react/i.test(lang);
    const isPy = /python/i.test(lang);
    const isJava = /java(?!script)|kotlin|scala|groovy/i.test(lang);
    const isGo = /^go$/i.test(lang);
    const isRust = /rust/i.test(lang);
    const isCSharp = /c#|f#/i.test(lang);
    const isCpp = /^c$|c\+\+|c\/c/i.test(lang);
    const isRuby = /ruby/i.test(lang);
    const isPHP = /php/i.test(lang);
    const isSwift = /swift/i.test(lang);
    const isSQL = /sql/i.test(lang);
    const isShell = /shell|bash|zsh|powershell|batch/i.test(lang);
    const isConfig = /json|yaml|yml|toml|ini|config|env|dockerfile|terraform|hcl/i.test(lang);

    let braceDepth = 0;
    let currentClassContext = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const lineNum = i + 1;

      // Skip meta header
      if (trimmed.startsWith('[SOURCE_CODE') || trimmed.startsWith('[/SOURCE_CODE')) continue;
      if (/^(File|Language|Lines):/.test(trimmed)) continue;

      // Track brace depth for context
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;
      if (braceDepth < 0) braceDepth = 0;

      // --- TODO / FIXME / HACK ---
      const todoMatch = trimmed.match(/\/\/\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE|WARNING)[:\s]+(.*)/i) ||
                         trimmed.match(/#\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE|WARNING)[:\s]+(.*)/i);
      if (todoMatch) {
        ca.todos.push({ type: todoMatch[1].toUpperCase(), text: todoMatch[2].trim(), lineNum });
      }

      // --- Imports / Dependencies ---
      // JS/TS
      if (isJS) {
        const importMatch = trimmed.match(/^import\s+(?:(?:{([^}]+)}|(\w+))\s+from\s+)?['"]([@\w\/.#-]+)['"]/);
        if (importMatch) {
          const names = importMatch[1] ? importMatch[1].split(',').map(s => s.trim()) : importMatch[2] ? [importMatch[2]] : [];
          ca.imports.push({ module: importMatch[3], names, lineNum });
        }
        const requireMatch = trimmed.match(/(?:const|let|var)\s+(?:{([^}]+)}|(\w+))\s*=\s*require\(['"]([@\w\/.#-]+)['"]\)/);
        if (requireMatch) {
          const names = requireMatch[1] ? requireMatch[1].split(',').map(s => s.trim()) : [requireMatch[2]];
          ca.imports.push({ module: requireMatch[3], names, lineNum });
        }
      }
      // Python
      if (isPy) {
        const pyImport = trimmed.match(/^(?:from\s+([\w.]+)\s+)?import\s+(.+)/);
        if (pyImport) {
          const module = pyImport[1] || pyImport[2].split(',')[0].trim();
          const names = pyImport[2].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
          ca.imports.push({ module, names, lineNum });
        }
      }
      // Java/Kotlin/C#
      if (isJava || isCSharp) {
        const javaImport = trimmed.match(/^(?:import|using)\s+([\w.*]+);?/);
        if (javaImport) {
          ca.imports.push({ module: javaImport[1], names: [javaImport[1].split('.').pop()], lineNum });
        }
      }
      // Go
      if (isGo) {
        const goImport = trimmed.match(/^import\s+(?:"([\w\/.]+)"|\()/);
        if (goImport && goImport[1]) {
          ca.imports.push({ module: goImport[1], names: [goImport[1].split('/').pop()], lineNum });
        }
      }
      // Rust
      if (isRust) {
        const rustUse = trimmed.match(/^use\s+([\w:]+)(?:::{(.+)})?;/);
        if (rustUse) {
          const names = rustUse[2] ? rustUse[2].split(',').map(s => s.trim()) : [rustUse[1].split('::').pop()];
          ca.imports.push({ module: rustUse[1], names, lineNum });
        }
      }

      // --- Function/Method Detection ---
      let funcMatch = null;

      // JS/TS: function declarations, arrow functions, class methods
      if (isJS) {
        funcMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/)
          || trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|(\w+))\s*=>/)
          || trimmed.match(/^(?:export\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*\w+)?\s*{/)
          || trimmed.match(/^(?:public|private|protected|static|async|get|set)\s+(?:async\s+)?(\w+)\s*\(([^)]*)\)/);
      }
      // Python
      if (isPy) {
        funcMatch = trimmed.match(/^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/);
      }
      // Java/Kotlin/C#
      if (isJava || isCSharp) {
        funcMatch = trimmed.match(/(?:public|private|protected|static|final|override|virtual|abstract|async|suspend)\s+(?:[\w<>\[\],\s]+\s+)?(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[\w,\s]+)?{?/);
      }
      // Go
      if (isGo) {
        funcMatch = trimmed.match(/^func\s+(?:\(\s*\w+\s+\*?\w+\s*\)\s+)?(\w+)\s*\(([^)]*)\)/);
      }
      // Rust
      if (isRust) {
        funcMatch = trimmed.match(/^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)/);
      }
      // Ruby
      if (isRuby) {
        funcMatch = trimmed.match(/^def\s+(?:self\.)?(\w+[?!]?)\s*(?:\(([^)]*)\))?/);
      }
      // PHP
      if (isPHP) {
        funcMatch = trimmed.match(/(?:public|private|protected|static)?\s*function\s+(\w+)\s*\(([^)]*)\)/);
      }
      // Swift
      if (isSwift) {
        funcMatch = trimmed.match(/(?:public|private|internal|open|static|class|override|mutating)?\s*func\s+(\w+)\s*\(([^)]*)\)/);
      }

      if (funcMatch && funcMatch[1]) {
        const name = funcMatch[1];
        // Skip constructors, test lifecycle, common noise
        if (!/^(constructor|__init__|setUp|tearDown|beforeEach|afterEach|describe|it|test)$/.test(name)) {
          const params = (funcMatch[2] || '').split(',').map(p => p.trim()).filter(Boolean);
          const isAsync = /\basync\b/.test(trimmed) || /\bsuspend\b/.test(trimmed);
          const isExported = /^export/.test(trimmed) || /^pub\b/.test(trimmed) || /^public\b/.test(trimmed);
          const visibility = /private/.test(trimmed) ? 'private' : /protected/.test(trimmed) ? 'protected' : 'public';

          // Grab function body (next few lines for context)
          const bodyLines = [];
          for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
            if (/^}|^\\s*$/.test(lines[j].trim()) && bodyLines.length > 2) break;
            bodyLines.push(lines[j].trim());
          }

          ca.functions.push({
            name, params, isAsync, isExported, visibility, lineNum,
            body: bodyLines.join('\\n'),
            returnType: detectReturnType(trimmed, bodyLines),
            hasErrorHandling: bodyLines.some(l => /try|catch|throw|raise|except|panic|unwrap|expect/.test(l)),
          });
        }
      }

      // --- Class Detection ---
      const classMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(\w+)\s*(?:extends\s+(\w+))?\s*(?:implements\s+([\w,\s]+))?/)
        || (isPy && trimmed.match(/^class\s+(\w+)\s*(?:\(([^)]*)\))?:/))
        || (isRust && trimmed.match(/^(?:pub\s+)?struct\s+(\w+)/))
        || (isGo && trimmed.match(/^type\s+(\w+)\s+struct/))
        || (isRuby && trimmed.match(/^class\s+(\w+)\s*(?:<\s*(\w+))?/));
      if (classMatch) {
        currentClassContext = {
          name: classMatch[1],
          extends: classMatch[2] || null,
          implements: classMatch[3] ? classMatch[3].split(',').map(s => s.trim()) : [],
          methods: [],
          properties: [],
          lineNum,
        };
        ca.classes.push(currentClassContext);
      }

      // --- Error Handling ---
      if (/\btry\s*{|\btry:|\btry\s*\(/.test(trimmed)) {
        ca.errorHandling.push({ type: 'try-catch', context: trimmed.substring(0, 100), lineNum });
        ca.complexity.branches++;
      }
      if (/\bthrow\s+new|\bthrow\s+\w|\braise\s+\w|\bpanic!\(|\bpanic\(/.test(trimmed)) {
        ca.errorHandling.push({ type: 'throw', context: trimmed.substring(0, 100), lineNum });
      }
      if (/\bassert|\bassert_eq|\bassert_ne|expect\(/.test(trimmed)) {
        ca.errorHandling.push({ type: 'assert', context: trimmed.substring(0, 100), lineNum });
      }

      // --- Conditionals ---
      if (/\bif\s*\(|\bif\s+\w|\belse\s+if|\belif\b|\bswitch\s*\(|\bmatch\s+\w|\bwhen\s*\(/.test(trimmed)) {
        const condMatch = trimmed.match(/(?:if|elif|else if|switch|match|when)\s*\(?(.{0,80})/);
        ca.conditionals.push({ condition: condMatch ? condMatch[1].trim() : trimmed.substring(0, 80), lineNum });
        ca.complexity.branches++;
      }

      // --- Loops ---
      if (/\bfor\s*\(|\bfor\s+\w|\bwhile\s*\(|\bwhile\s+\w|\bloop\s*{|\b\.forEach\(|\b\.map\(|\b\.filter\(|\b\.reduce\(/.test(trimmed)) {
        const loopType = /while/.test(trimmed) ? 'while' : /\.forEach|\.map|\.filter|\.reduce/.test(trimmed) ? 'iterator' : 'for';
        ca.loops.push({ type: loopType, context: trimmed.substring(0, 80), lineNum });
        ca.complexity.loops++;
      }

      // --- Constants ---
      if (/^(?:export\s+)?(?:const|final|val|static\s+final|#define|let\s+\w+\s*:\s*\w+\s*=)\s+([A-Z_][A-Z0-9_]+)\s*[=:]/.test(trimmed)) {
        const constMatch = trimmed.match(/(?:const|final|val|static\s+final|#define|let)\s+([A-Z_][A-Z0-9_]+)\s*[=:]\s*(.{0,60})/);
        if (constMatch) {
          ca.constants.push({ name: constMatch[1], value: constMatch[2].trim(), lineNum });
        }
      }

      // --- Type Definitions / Interfaces ---
      const typeMatch = trimmed.match(/^(?:export\s+)?(?:interface|type|enum)\s+(\w+)/)
        || (isRust && trimmed.match(/^(?:pub\s+)?enum\s+(\w+)/))
        || (isPy && trimmed.match(/^class\s+(\w+)\((?:TypedDict|BaseModel|Enum|NamedTuple)\)/));
      if (typeMatch) {
        ca.typeDefinitions.push({ name: typeMatch[1], lineNum });
      }

      // --- API Routes ---
      // Express.js / Koa / Fastify
      const routeMatch = trimmed.match(/(?:app|router|server)\.(get|post|put|patch|delete|all)\s*\(\s*['"](\/[^'"]*)['"]/i);
      if (routeMatch) {
        ca.apiRoutes.push({ method: routeMatch[1].toUpperCase(), path: routeMatch[2], lineNum });
      }
      // Python Flask/Django/FastAPI
      const pyRouteMatch = trimmed.match(/@(?:app|router|api)\.(route|get|post|put|patch|delete)\s*\(\s*['"](\/[^'"]*)['"]/i)
        || trimmed.match(/path\(\s*['"]([\w\/<>:]+)['"]/);
      if (pyRouteMatch) {
        const method = pyRouteMatch[1] || 'GET';
        ca.apiRoutes.push({ method: method.toUpperCase(), path: pyRouteMatch[2], lineNum });
      }
      // Java Spring / annotations
      const springRoute = trimmed.match(/@(GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping)\s*\(\s*(?:value\s*=\s*)?['"](\/[^'"]*)['"]/i);
      if (springRoute) {
        const methodMap = { getmapping: 'GET', postmapping: 'POST', putmapping: 'PUT', deletemapping: 'DELETE', requestmapping: 'GET' };
        ca.apiRoutes.push({ method: methodMap[springRoute[1].toLowerCase()] || 'GET', path: springRoute[2], lineNum });
      }
      // Go Gin/Echo/Chi
      const goRoute = trimmed.match(/(?:r|router|e|g|group)\.(GET|POST|PUT|PATCH|DELETE)\s*\(\s*['"](\/[^'"]*)['"]/i);
      if (goRoute) {
        ca.apiRoutes.push({ method: goRoute[1].toUpperCase(), path: goRoute[2], lineNum });
      }

      // --- Database Operations ---
      if (/\.(find|findOne|findMany|findAll|create|update|delete|destroy|save|insert|select|where|aggregate|count|query|execute|raw)\s*\(/.test(trimmed) ||
          /\b(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|ALTER TABLE|DROP TABLE|JOIN)\b/.test(trimmed)) {
        const dbOp = trimmed.match(/\.(find\w*|create|update|delete|destroy|save|insert|select|where|aggregate)\s*\(/) ||
                     trimmed.match(/\b(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE)\b/i);
        if (dbOp) {
          ca.dbOperations.push({ type: (dbOp[1] || dbOp[0]).toLowerCase(), context: trimmed.substring(0, 80), lineNum });
        }
      }

      // --- Environment Variables ---
      const envMatch = trimmed.match(/process\.env\.(\w+)|os\.environ(?:\.get)?\s*\(\s*['"]([\w]+)['"]|getenv\s*\(\s*['"]([\w]+)['"]|ENV\[['"](\w+)['"]\]/);
      if (envMatch) {
        const envName = envMatch[1] || envMatch[2] || envMatch[3] || envMatch[4];
        ca.envVariables.push({ name: envName, lineNum });
      }

      // --- Exports ---
      if (isJS) {
        const expMatch = trimmed.match(/^(?:module\.)?exports?\s*(?:\.(\w+))?/) || trimmed.match(/^export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)/);
        if (expMatch && expMatch[1]) {
          ca.exports.push({ name: expMatch[1], lineNum });
        }
      }
    }

    // Compute complexity score
    ca.complexity.functions = ca.functions.length;
    ca.complexity.depth = Math.max(0, ...ca.functions.map(f => {
      const body = f.body || '';
      let d = 0, max = 0;
      for (const ch of body) { if (ch === '{') { d++; max = Math.max(max, d); } else if (ch === '}') d--; }
      return max;
    }));

    // Cross-reference: add methods to their classes
    if (ca.classes.length > 0 && ca.functions.length > 0) {
      for (const cls of ca.classes) {
        cls.methods = ca.functions.filter(f => f.lineNum > cls.lineNum && f.lineNum < cls.lineNum + 200);
      }
    }
  }

  function detectReturnType(declaration, bodyLines) {
    // TypeScript / Rust / Go explicit return types
    const explicitMatch = declaration.match(/\)\s*:\s*([\w<>\[\]|&]+)/);
    if (explicitMatch) return explicitMatch[1];
    // Java / C# return type before method name
    const javaMatch = declaration.match(/(?:public|private|protected|static)\s+([\w<>\[\]]+)\s+\w+\s*\(/);
    if (javaMatch && javaMatch[1] !== 'void') return javaMatch[1];
    // Infer from body
    const returnLine = bodyLines.find(l => /\breturn\b/.test(l));
    if (returnLine) {
      if (/return\s+true|return\s+false/.test(returnLine)) return 'boolean';
      if (/return\s+\d/.test(returnLine)) return 'number';
      if (/return\s+['"`]/.test(returnLine)) return 'string';
      if (/return\s+\[/.test(returnLine)) return 'array';
      if (/return\s+{/.test(returnLine)) return 'object';
      if (/return\s+null|return\s+None/.test(returnLine)) return 'nullable';
    }
    return 'unknown';
  }

  // ============================================================
  // Project / Zip Parsing
  // ============================================================

  // Paths to skip when extracting project files
  const SKIP_DIRS = /(?:^|\/)(?:node_modules|\.git|__pycache__|\.idea|\.vscode|vendor|\.next|\.nuxt|dist|build|out|target|bin|obj|\.gradle|\.mvn|\.cache|\.tox|\.eggs|\.mypy_cache|coverage|\.nyc_output)\//;
  const SKIP_FILES = /(?:^|\/)(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Gemfile\.lock|poetry\.lock|composer\.lock|Cargo\.lock|go\.sum|\.DS_Store|Thumbs\.db)/;
  const TEST_FILE_PATTERN = /(?:^|\/)(?:test[s_]?|__tests__|spec[s]?)\//i;
  const TEST_NAME_PATTERN = /(?:\.test\.|\.spec\.|_test\.|_spec\.)/i;

  /**
   * Parse a .zip file containing project source code.
   * Returns { text, stats } where text is all files concatenated with headers,
   * and stats contains file counts by type.
   */
  async function parseProjectZip(file, options = {}) {
    const includeTests = options.includeTests || false;
    const includeDocs = options.includeDocs !== false; // default true

    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library not loaded. Please refresh the page and try again.');
    }

    const zip = await JSZip.loadAsync(file);
    const fileEntries = [];

    // Collect and filter files
    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;

      // Skip common non-source directories
      if (SKIP_DIRS.test(relativePath)) return;
      if (SKIP_FILES.test(relativePath)) return;

      // Skip test files unless requested
      if (!includeTests) {
        if (TEST_FILE_PATTERN.test(relativePath) || TEST_NAME_PATTERN.test(relativePath)) return;
      }

      const ext = relativePath.split('.').pop().toLowerCase();
      const baseName = relativePath.split('/').pop().toLowerCase();

      const isCode = CODE_EXTENSIONS.has(ext) || CODE_EXTENSIONS.has(baseName);
      const isDoc = DOC_EXTENSIONS.has(ext) || /^readme/i.test(baseName) || /^changelog/i.test(baseName) || /^contributing/i.test(baseName);

      if (isCode || (isDoc && includeDocs)) {
        fileEntries.push({ path: relativePath, ext, isCode, isDoc, entry: zipEntry });
      }
    });

    if (fileEntries.length === 0) {
      throw new Error('No supported source code or documentation files found in the zip. Make sure the zip contains source files (.js, .py, .java, etc.).');
    }

    // Sort: code files first (by directory depth), then docs
    fileEntries.sort((a, b) => {
      if (a.isCode !== b.isCode) return a.isCode ? -1 : 1;
      return a.path.localeCompare(b.path);
    });

    // Limit to prevent browser memory issues
    const MAX_FILES = 2000;
    const MAX_FILE_SIZE = 500 * 1024; // 500KB per file
    const limited = fileEntries.slice(0, MAX_FILES);

    // Build combined text
    const parts = [];
    const stats = { totalFiles: fileEntries.length, parsedFiles: 0, skippedLarge: 0, byLanguage: {}, byType: { code: 0, doc: 0 } };

    // Project structure overview
    parts.push('[PROJECT_STRUCTURE]');
    parts.push(`Total files: ${fileEntries.length}${fileEntries.length > MAX_FILES ? ` (showing first ${MAX_FILES})` : ''}`);
    parts.push('Files:');
    fileEntries.forEach(f => parts.push(`  ${f.path}`));
    parts.push('[/PROJECT_STRUCTURE]');
    parts.push('');

    // Extract each file
    for (const entry of limited) {
      try {
        const content = await entry.entry.async('string');
        if (content.length > MAX_FILE_SIZE) {
          stats.skippedLarge++;
          parts.push(`\n${'='.repeat(60)}`);
          parts.push(`FILE: ${entry.path} (TRUNCATED — ${Math.round(content.length / 1024)}KB > ${MAX_FILE_SIZE / 1024}KB limit)`);
          parts.push('='.repeat(60));
          parts.push(annotateSourceCode(content.substring(0, MAX_FILE_SIZE), entry.ext, entry.path));
          continue;
        }

        // Check if it's binary (contains null bytes)
        if (/\x00/.test(content.substring(0, 500))) continue;

        parts.push(`\n${'='.repeat(60)}`);
        parts.push(`FILE: ${entry.path}`);
        parts.push('='.repeat(60));

        if (entry.isCode) {
          parts.push(annotateSourceCode(content, entry.ext, entry.path));
          stats.byType.code++;
          const lang = detectLanguage(entry.ext);
          stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1;
        } else {
          parts.push(content);
          stats.byType.doc++;
        }

        stats.parsedFiles++;
      } catch {
        // Skip files that can't be read as text
      }
    }

    const text = parts.join('\n');
    if (text.trim().length < 100) {
      throw new Error('Could not extract meaningful content from the zip file.');
    }

    return { text, stats };
  }

  return { parseFile, fetchUrl, analyzeContent, parseProjectZip };
})();
