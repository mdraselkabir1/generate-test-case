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
   * Fetch content from a URL (through CORS proxy).
   */
  async function fetchUrl(url, corsProxy) {
    const proxyUrl = corsProxy ? corsProxy + encodeURIComponent(url) : url;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status}`);
    const html = await response.text();
    return extractTextFromHtml(html);
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
