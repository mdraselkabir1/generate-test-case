/**
 * LLM Integration Module
 * Sends analyzed content to LLM APIs (OpenAI, Anthropic, Google, OpenRouter, custom)
 * and returns enhanced, context-aware test cases.
 */
const LLM = (() => {
  'use strict';

  const PROVIDERS = {
    openai: {
      name: 'OpenAI (GPT)',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      defaultModel: 'gpt-4o-mini',
    },
    anthropic: {
      name: 'Anthropic (Claude)',
      endpoint: 'https://api.anthropic.com/v1/messages',
      models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-20250514', 'claude-3-5-sonnet-20241022'],
      defaultModel: 'claude-sonnet-4-20250514',
    },
    google: {
      name: 'Google (Gemini)',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
      models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash'],
      defaultModel: 'gemini-2.0-flash',
    },
    openrouter: {
      name: 'OpenRouter',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      models: ['anthropic/claude-sonnet-4', 'openai/gpt-4o', 'google/gemini-2.0-flash-exp:free', 'meta-llama/llama-3.3-70b-instruct'],
      defaultModel: 'google/gemini-2.0-flash-exp:free',
    },
    custom: {
      name: 'Custom / Local (Ollama, LM Studio, etc.)',
      endpoint: '',
      models: [],
      defaultModel: '',
    },
  };

  /**
   * Build the system prompt for test case generation.
   */
  function buildSystemPrompt(options) {
    return `You are an expert QA engineer and test architect. Generate detailed, actionable test cases based on the provided content analysis.

RULES:
- Output ONLY valid JSON — no markdown fences, no commentary.
- Return an array of test case objects.
- Each object must have exactly these fields:
  { "title": string, "type": string, "priority": string, "preconditions": string, "steps": string[], "expectedResult": string, "notes": string }
- "type" must be one of: functional, unit, ui, api, security, performance, accessibility, integration, edge-cases, data-integrity, regression, compatibility, error-recovery
- "priority" must be one of: critical, high, medium, low
- Generate ${options.depth === 'basic' ? '5-10' : options.depth === 'standard' ? '10-25' : options.depth === 'comprehensive' ? '25-50' : '50-100'} test cases.
- Focus on ${options.testType === 'all' ? 'all test types balanced' : options.testType + ' testing'}.
- Steps should be specific and actionable, not generic.
- Expected results should be precise and verifiable.
- Include edge cases, negative tests, and boundary conditions.
- For source code: reference actual function names, class names, parameters, and return types.
- For API routes: test all HTTP methods, status codes, auth, and input validation.
- Think about what a senior QA engineer would actually test.`;
  }

  /**
   * Build the user prompt with analyzed content.
   */
  function buildUserPrompt(analysis, content, options) {
    const parts = ['Here is the content analysis for test case generation:\n'];

    // Summary
    if (analysis.title) parts.push(`Title: ${analysis.title}`);
    parts.push(`Actions detected: ${analysis.actions.join(', ') || 'none'}`);
    parts.push(`Entities: ${analysis.entities.join(', ') || 'none'}`);
    parts.push(`Features: ${analysis.features.join(', ') || 'none'}`);
    parts.push(`Keywords: ${analysis.keywords.slice(0, 30).join(', ') || 'none'}`);

    if (analysis.requirements.length > 0) {
      parts.push(`\nRequirements:\n${analysis.requirements.slice(0, 20).map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
    }
    if (analysis.userStories.length > 0) {
      parts.push(`\nUser Stories:\n${analysis.userStories.slice(0, 10).map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
    }

    // Source code analysis
    const ca = analysis.codeAnalysis;
    if (ca && ca.isSourceCode) {
      parts.push(`\n--- SOURCE CODE ANALYSIS ---`);
      parts.push(`Language: ${ca.language}`);
      if (ca.functions.length > 0) {
        parts.push(`\nFunctions (${ca.functions.length}):`);
        ca.functions.slice(0, 50).forEach(fn => {
          parts.push(`  - ${fn.isAsync ? 'async ' : ''}${fn.name}(${fn.params.join(', ')}) → ${fn.returnType} [${fn.visibility}] line ${fn.lineNum}`);
        });
      }
      if (ca.classes.length > 0) {
        parts.push(`\nClasses (${ca.classes.length}):`);
        ca.classes.slice(0, 20).forEach(cls => {
          parts.push(`  - ${cls.name} ${cls.extends ? 'extends ' + cls.extends : ''} [methods: ${cls.methods.join(', ')}]`);
        });
      }
      if (ca.apiRoutes.length > 0) {
        parts.push(`\nAPI Routes (${ca.apiRoutes.length}):`);
        ca.apiRoutes.slice(0, 30).forEach(r => {
          parts.push(`  - ${r.method} ${r.path} → ${r.handler}`);
        });
      }
      if (ca.dbOperations.length > 0) {
        parts.push(`\nDB Operations: ${ca.dbOperations.slice(0, 20).join(', ')}`);
      }
      if (ca.imports.length > 0) {
        parts.push(`\nImports: ${ca.imports.slice(0, 30).join(', ')}`);
      }
      if (ca.errorHandlers.length > 0) {
        parts.push(`\nError Handlers: ${ca.errorHandlers.slice(0, 15).join(', ')}`);
      }
    }

    // Raw content (trimmed)
    const maxContent = 12000;
    const trimmedContent = content.length > maxContent ? content.substring(0, maxContent) + '\n...(truncated)' : content;
    parts.push(`\n--- RAW CONTENT ---\n${trimmedContent}`);

    parts.push(`\nGenerate ${options.testType === 'all' ? 'all types of' : options.testType} test cases at ${options.depth} depth. Return ONLY the JSON array.`);

    return parts.join('\n');
  }

  /**
   * Call the LLM API based on provider.
   */
  async function callLLM(systemPrompt, userPrompt, config) {
    const { provider, apiKey, model, endpoint } = config;

    if (!apiKey && provider !== 'custom') {
      throw new Error(`API key required for ${PROVIDERS[provider]?.name || provider}`);
    }

    switch (provider) {
      case 'openai':
      case 'openrouter':
        return callOpenAICompatible(systemPrompt, userPrompt, config);
      case 'anthropic':
        return callAnthropic(systemPrompt, userPrompt, config);
      case 'google':
        return callGoogle(systemPrompt, userPrompt, config);
      case 'custom':
        return callOpenAICompatible(systemPrompt, userPrompt, config);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * OpenAI-compatible API (OpenAI, OpenRouter, Ollama, LM Studio, etc.)
   */
  async function callOpenAICompatible(systemPrompt, userPrompt, config) {
    const url = config.provider === 'openrouter'
      ? PROVIDERS.openrouter.endpoint
      : config.provider === 'custom'
        ? config.endpoint
        : PROVIDERS.openai.endpoint;

    if (!url) throw new Error('API endpoint URL is required for custom provider');

    const headers = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }
    if (config.provider === 'openrouter') {
      headers['HTTP-Referer'] = window.location.origin;
    }

    const body = {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 16000,
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`${PROVIDERS[config.provider]?.name || 'API'} error (${resp.status}): ${errBody.substring(0, 300)}`);
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('No response content from API');
    return text;
  }

  /**
   * Anthropic Messages API (Claude)
   */
  async function callAnthropic(systemPrompt, userPrompt, config) {
    const resp = await fetch(PROVIDERS.anthropic.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.3,
        max_tokens: 16000,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`Claude API error (${resp.status}): ${errBody.substring(0, 300)}`);
    }

    const data = await resp.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new Error('No response content from Claude API');
    return text;
  }

  /**
   * Google Gemini API
   */
  async function callGoogle(systemPrompt, userPrompt, config) {
    const url = PROVIDERS.google.endpoint.replace('{model}', config.model) + `?key=${config.apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 16000 },
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`Gemini API error (${resp.status}): ${errBody.substring(0, 300)}`);
    }

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response content from Gemini API');
    return text;
  }

  /**
   * Parse LLM response text into test case array.
   */
  function parseResponse(responseText) {
    // Strip markdown code fences if present
    let cleaned = responseText.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

    // Try to find JSON array in the response
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!arrayMatch) throw new Error('LLM response did not contain a valid JSON array');

    let cases;
    try {
      cases = JSON.parse(arrayMatch[0]);
    } catch (e) {
      throw new Error(`Failed to parse LLM JSON: ${e.message}`);
    }

    if (!Array.isArray(cases)) throw new Error('LLM response is not an array');

    // Validate and normalize each case
    const validTypes = new Set(['functional', 'unit', 'ui', 'api', 'security', 'performance', 'accessibility', 'integration', 'edge-cases', 'data-integrity', 'regression', 'compatibility', 'error-recovery']);
    const validPriorities = new Set(['critical', 'high', 'medium', 'low']);

    return cases.map(tc => ({
      title: String(tc.title || 'Untitled Test Case'),
      type: validTypes.has(tc.type) ? tc.type : 'functional',
      priority: validPriorities.has(tc.priority) ? tc.priority : 'medium',
      preconditions: String(tc.preconditions || ''),
      steps: Array.isArray(tc.steps) ? tc.steps.map(String) : ['Execute the test scenario', 'Observe results'],
      expectedResult: String(tc.expectedResult || tc.expected_result || ''),
      notes: String(tc.notes || '') + ' [LLM-generated]',
    }));
  }

  /**
   * Main entry: generate test cases via LLM.
   * @param {object} analysis - From Parser.analyzeContent()
   * @param {string} content - Raw input content
   * @param {object} options - { testType, depth, planName, ... }
   * @param {object} llmConfig - { provider, apiKey, model, endpoint }
   * @returns {Promise<object[]>} Array of test case objects
   */
  async function generateTestCases(analysis, content, options, llmConfig) {
    const systemPrompt = buildSystemPrompt(options);
    const userPrompt = buildUserPrompt(analysis, content, options);
    const responseText = await callLLM(systemPrompt, userPrompt, llmConfig);
    return parseResponse(responseText);
  }

  /**
   * Get LLM config from Storage.
   */
  function getConfig() {
    const settings = Storage.getSettings();
    return settings.llm || {
      enabled: false,
      provider: 'openai',
      apiKey: '',
      model: '',
      endpoint: '',
      mode: 'llm-only',  // 'llm-only' | 'hybrid' | 'enhance'
    };
  }

  /**
   * Save LLM config to Storage.
   */
  function saveConfig(llmConfig) {
    const settings = Storage.getSettings();
    settings.llm = llmConfig;
    Storage.saveSettings(settings);
  }

  return {
    PROVIDERS,
    generateTestCases,
    getConfig,
    saveConfig,
    parseResponse,
  };
})();
