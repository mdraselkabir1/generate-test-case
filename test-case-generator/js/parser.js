/**
 * Parser Module — extracts text content from various file types and URLs.
 */
const Parser = (() => {

  /**
   * Parse uploaded file and return extracted text content.
   */
  async function parseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    switch (ext) {
      case 'txt':
      case 'md':
        return await readAsText(file);
      case 'docx':
        return await parseDocx(file);
      case 'pdf':
        return await parsePdf(file);
      case 'xlsx':
      case 'csv':
        return await parseSpreadsheet(file);
      default:
        throw new Error(`Unsupported file type: .${ext}`);
    }
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
   * Fetch content from a URL (through CORS proxy), with optional auth.
   * Tries multiple proxies on failure.
   */
  async function fetchUrl(url, corsProxy, authConfig) {
    const headers = {};

    if (authConfig && authConfig.enabled) {
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

    // Build list of proxy URLs to try
    const proxyUrls = [];

    // If user provided a custom proxy, try that first
    if (corsProxy) {
      proxyUrls.push({ name: 'custom', url: corsProxy + encodeURIComponent(url) });
    }

    // Add built-in fallback proxies
    for (const proxy of CORS_PROXIES) {
      const pUrl = proxy.buildUrl(url);
      // Avoid duplicating the custom proxy
      if (!proxyUrls.some(p => p.url === pUrl)) {
        proxyUrls.push({ name: proxy.name, url: pUrl });
      }
    }

    // Also try direct fetch (works for CORS-friendly sites)
    proxyUrls.push({ name: 'direct', url });

    let lastError = null;
    for (const proxy of proxyUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch(proxy.url, {
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          lastError = new Error(`${proxy.name}: HTTP ${response.status}`);
          continue;
        }

        const html = await response.text();
        if (!html || html.trim().length < 50) {
          lastError = new Error(`${proxy.name}: Empty or too short response`);
          continue;
        }

        return extractTextFromHtml(html);
      } catch (err) {
        lastError = err;
        // Continue to next proxy
      }
    }

    throw new Error(`Failed to fetch URL after trying ${proxyUrls.length} methods. Last error: ${lastError?.message || 'Unknown error'}. Try downloading the page manually and uploading it as a file instead.`);
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
   */
  function analyzeContent(text) {
    const sections = [];
    const features = [];
    const requirements = [];
    const userStories = [];
    const entities = new Set();
    const actions = new Set();

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    let currentSection = '';
    for (const line of lines) {
      // Detect headings / sections
      if (/^#{1,6}\s/.test(line) || /^[A-Z][A-Za-z\s]{2,50}:?\s*$/.test(line)) {
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
      const actionPatterns = /\b(create|read|update|delete|submit|login|logout|register|search|filter|sort|upload|download|export|import|approve|reject|cancel|send|receive|validate|verify|display|show|hide|enable|disable|add|remove|edit|view|list|save|load|navigate|redirect|authenticate|authorize|configure|manage|process|calculate|generate|reset|change|select|deselect|check|uncheck|toggle|expand|collapse|open|close|drag|drop|scroll|zoom|print|share|notify|subscribe|unsubscribe)\b/gi;
      const actionMatches = line.match(actionPatterns);
      if (actionMatches) actionMatches.forEach(a => actions.add(a.toLowerCase()));
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
      .slice(0, 30)
      .map(([word]) => word);

    return {
      sections,
      features: features.slice(0, 50),
      requirements: requirements.slice(0, 50),
      userStories: userStories.slice(0, 30),
      entities: [...entities].slice(0, 30),
      actions: [...actions],
      keywords,
      totalLines: lines.length,
      rawText: text,
    };
  }

  return { parseFile, fetchUrl, analyzeContent };
})();
