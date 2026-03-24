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

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    let currentSection = '';
    let currentWorkflow = [];
    let workflowActive = false;

    for (const line of lines) {
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
      totalLines: lines.length,
      rawText: text,
    };
  }

  return { parseFile, fetchUrl, analyzeContent };
})();
