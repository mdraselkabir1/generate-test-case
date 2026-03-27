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
    return `You are an expert QA engineer and test architect with 15+ years of experience. Generate detailed, actionable test cases based on the provided content analysis.

RULES:
- Output ONLY valid JSON — no markdown fences, no commentary.
- Return an array of test case objects.
- Each object must have exactly these fields:
  { "title": string, "type": string, "priority": string, "preconditions": string, "steps": string[], "expectedResult": string, "notes": string }
- "type" must be one of: functional, unit, ui, api, security, performance, accessibility, integration, edge-cases, data-integrity, regression, compatibility, error-recovery
- "priority" must be one of: critical, high, medium, low
- Generate ${options.depth === 'basic' ? '5-10' : options.depth === 'standard' ? '10-25' : options.depth === 'comprehensive' ? '25-50' : '50-100'} test cases.
- Focus on ${options.testType === 'all' ? 'all test types balanced' : options.testType + ' testing'}.

QUALITY REQUIREMENTS:
- Steps must be specific and actionable — use real field names, button labels, URLs, values from the content.
- Expected results must be precise and verifiable — include exact messages, status codes, state changes.
- For each user story, generate tests for happy path, edge cases, and negative scenarios.
- For each requirement with "shall"/"must", generate at least one verification test.
- For each business rule, test the condition (true + false) and its outcome.
- For each workflow, test the complete flow end-to-end and test interruptions at each step.
- For each role/persona, test permissions granted and permissions denied.
- For each form field, test valid input, empty input, boundary values, and invalid formats.
- For each API endpoint, test success, auth failure, validation failure, and edge cases.
- For each state transition, test valid transitions and invalid/impossible transitions.
- For each boundary value, test at boundary, below boundary, and above boundary.
- For each error pattern, test that the error is handled gracefully with a clear message.
- For each security concern, generate specific exploit/mitigation test scenarios.
- For each integration point, test connectivity, timeout, and error propagation.
- Think about what a senior QA engineer would actually test — focus on risk and business impact.`;
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

    // Sections / Document structure
    if (analysis.sections && analysis.sections.length > 0) {
      parts.push(`\nDocument Sections (${analysis.sections.length}):\n${analysis.sections.slice(0, 30).map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`);
    }

    // Requirements
    if (analysis.requirements.length > 0) {
      parts.push(`\nRequirements (${analysis.requirements.length}):\n${analysis.requirements.slice(0, 30).map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
    }

    // User Stories
    if (analysis.userStories.length > 0) {
      parts.push(`\nUser Stories (${analysis.userStories.length}):\n${analysis.userStories.slice(0, 15).map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
    }

    // Business Rules
    if (analysis.businessRules && analysis.businessRules.length > 0) {
      parts.push(`\nBusiness Rules (${analysis.businessRules.length}):\n${analysis.businessRules.slice(0, 20).map((r, i) => `  ${i + 1}. ${r}`).join('\n')}`);
    }

    // Workflows
    if (analysis.workflows && analysis.workflows.length > 0) {
      parts.push(`\nWorkflows (${analysis.workflows.length}):`);
      analysis.workflows.slice(0, 15).forEach(wf => {
        if (typeof wf === 'object' && wf.name) {
          parts.push(`  • ${wf.name}: ${(wf.steps || []).join(' → ')}`);
        } else {
          parts.push(`  • ${wf}`);
        }
      });
    }

    // Roles / Personas
    if (analysis.roles && analysis.roles.length > 0) {
      parts.push(`\nUser Roles: ${analysis.roles.join(', ')}`);
    }

    // API Endpoints
    if (analysis.apiEndpoints && analysis.apiEndpoints.length > 0) {
      parts.push(`\nAPI Endpoints (${analysis.apiEndpoints.length}):`);
      analysis.apiEndpoints.slice(0, 30).forEach(ep => {
        if (typeof ep === 'object') {
          parts.push(`  - ${ep.method || 'GET'} ${ep.path || ep}`);
        } else {
          parts.push(`  - ${ep}`);
        }
      });
    }

    // Form Fields
    if (analysis.formFields && analysis.formFields.length > 0) {
      parts.push(`\nForm Fields (${analysis.formFields.length}):\n${analysis.formFields.slice(0, 30).map(f => `  - ${typeof f === 'object' ? (f.name || f.type || JSON.stringify(f)) : f}`).join('\n')}`);
    }

    // Error Patterns
    if (analysis.errorPatterns && analysis.errorPatterns.length > 0) {
      parts.push(`\nError/Exception Patterns (${analysis.errorPatterns.length}):\n${analysis.errorPatterns.slice(0, 20).map(e => `  - ${e}`).join('\n')}`);
    }

    // Data Models
    if (analysis.dataModels && analysis.dataModels.length > 0) {
      parts.push(`\nData Models/Types (${analysis.dataModels.length}):\n${analysis.dataModels.slice(0, 20).map(d => `  - ${d}`).join('\n')}`);
    }

    // Integration Points
    if (analysis.integrationPoints && analysis.integrationPoints.length > 0) {
      parts.push(`\nIntegration Points: ${analysis.integrationPoints.slice(0, 15).join(', ')}`);
    }

    // State Transitions
    if (analysis.stateTransitions && analysis.stateTransitions.length > 0) {
      parts.push(`\nState Transitions (${analysis.stateTransitions.length}):\n${analysis.stateTransitions.slice(0, 15).map(s => `  - ${s}`).join('\n')}`);
    }

    // Boundary Values
    if (analysis.boundaryValues && analysis.boundaryValues.length > 0) {
      parts.push(`\nBoundary Values / Limits (${analysis.boundaryValues.length}):\n${analysis.boundaryValues.slice(0, 15).map(b => `  - ${b}`).join('\n')}`);
    }

    // Security Concerns
    if (analysis.securityConcerns && analysis.securityConcerns.length > 0) {
      parts.push(`\nSecurity Concerns (${analysis.securityConcerns.length}):\n${analysis.securityConcerns.slice(0, 15).map(s => `  - ${s}`).join('\n')}`);
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
      if (ca.envVars && ca.envVars.length > 0) {
        parts.push(`\nEnvironment Variables: ${ca.envVars.slice(0, 20).join(', ')}`);
      }
      if (ca.todos && ca.todos.length > 0) {
        parts.push(`\nTODO/FIXME: ${ca.todos.slice(0, 10).join('; ')}`);
      }
      if (ca.complexity) {
        parts.push(`\nComplexity: conditionals=${ca.complexity.conditionals || 0}, loops=${ca.complexity.loops || 0}, nesting=${ca.complexity.maxNesting || 0}`);
      }
    }

    // Raw content (trimmed) — increased from 12K to 24K for better context
    const maxContent = 24000;
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
   * Build a system prompt specialized for full project / codebase analysis.
   */
  function buildProjectSystemPrompt(options) {
    return `You are an expert QA engineer, test architect, and senior software engineer with 15+ years of experience analyzing full codebases and designing comprehensive test strategies.

You are given the FULL SOURCE CODE of a software project. Your job is to deeply understand the project architecture, modules, data flow, and business logic, then generate thorough, actionable test cases.

ANALYSIS APPROACH:
1. First understand the project structure — identify entry points, core modules, utilities, models, routes, and configuration.
2. Identify all public APIs, endpoints, exported functions, classes, and their interactions.
3. Trace data flows: input → processing → output, including database operations and external calls.
4. Identify error handling patterns, edge cases, and security-sensitive code paths.
5. Look for implicit dependencies, shared state, race conditions, and integration boundaries.

RULES:
- Output ONLY valid JSON — no markdown fences, no commentary.
- Return an array of test case objects.
- Each object must have exactly these fields:
  { "title": string, "type": string, "priority": string, "preconditions": string, "steps": string[], "expectedResult": string, "notes": string }
- "type" must be one of: functional, unit, ui, api, security, performance, accessibility, integration, edge-cases, data-integrity, regression, compatibility, error-recovery
- "priority" must be one of: critical, high, medium, low
- Generate ${options.depth === 'basic' ? '10-20' : options.depth === 'standard' ? '20-40' : options.depth === 'comprehensive' ? '40-80' : '80-150'} test cases.
- Focus on ${options.testType === 'all' ? 'all test types balanced' : options.testType + ' testing'}.

QUALITY REQUIREMENTS:
- Reference actual function names, class names, file paths, variable names, and API routes from the code.
- Steps must be specific — mention exact method calls, parameters, and expected return values.
- For each module/file, generate unit tests for its exported functions and classes.
- For cross-module interactions, generate integration tests.
- Test error paths: what happens when dependencies fail, inputs are invalid, or state is corrupted.
- Test security: injection, auth bypass, data exposure, insecure defaults, missing validation.
- Test performance: O(n²) loops, unbounded queries, memory leaks, missing pagination.
- Test edge cases: empty collections, null/undefined, concurrent access, max limits, Unicode, special chars.
- For API routes, test all HTTP methods, auth requirements, input validation, and error responses.
- For database operations, test CRUD completeness, constraints, transactions, and migration safety.
- Think about what a senior engineer would catch in a thorough code review — those are your test cases.`;
  }

  /**
   * Build a user prompt that sends the full project source code to the LLM.
   * Prioritizes structure overview + key files, with as much raw code as fits in context.
   */
  function buildProjectUserPrompt(analysis, content, options) {
    const parts = ['Here is the FULL SOURCE CODE of a project for test case generation:\n'];

    // Source code analysis summary (from Parser.analyzeContent on the combined content)
    const ca = analysis.codeAnalysis;
    if (ca && ca.isSourceCode) {
      parts.push('--- PROJECT CODE SUMMARY ---');
      parts.push(`Language: ${ca.language}`);
      if (ca.functions.length > 0) {
        parts.push(`Functions (${ca.functions.length}): ${ca.functions.slice(0, 80).map(fn => `${fn.isAsync ? 'async ' : ''}${fn.name}(${fn.params.join(', ')})`).join(', ')}`);
      }
      if (ca.classes.length > 0) {
        parts.push(`Classes (${ca.classes.length}): ${ca.classes.slice(0, 30).map(cls => `${cls.name}${cls.extends ? ' extends ' + cls.extends : ''}`).join(', ')}`);
      }
      if (ca.apiRoutes.length > 0) {
        parts.push(`API Routes (${ca.apiRoutes.length}):`);
        ca.apiRoutes.slice(0, 50).forEach(r => parts.push(`  ${r.method} ${r.path} → ${r.handler}`));
      }
      if (ca.imports.length > 0) {
        parts.push(`Imports/Dependencies: ${ca.imports.slice(0, 40).join(', ')}`);
      }
      if (ca.dbOperations.length > 0) {
        parts.push(`DB Operations: ${ca.dbOperations.slice(0, 30).join(', ')}`);
      }
      if (ca.errorHandlers.length > 0) {
        parts.push(`Error Handlers: ${ca.errorHandlers.slice(0, 20).join(', ')}`);
      }
      if (ca.envVars && ca.envVars.length > 0) {
        parts.push(`Environment Variables: ${ca.envVars.slice(0, 20).join(', ')}`);
      }
      parts.push('');
    }

    // Also include general analysis signals
    if (analysis.actions.length > 0) parts.push(`Actions detected: ${analysis.actions.join(', ')}`);
    if (analysis.entities.length > 0) parts.push(`Entities: ${analysis.entities.join(', ')}`);
    if (analysis.apiEndpoints && analysis.apiEndpoints.length > 0) {
      parts.push(`API Endpoints: ${analysis.apiEndpoints.slice(0, 30).map(ep => typeof ep === 'object' ? `${ep.method || 'GET'} ${ep.path || ep}` : ep).join(', ')}`);
    }
    if (analysis.securityConcerns && analysis.securityConcerns.length > 0) {
      parts.push(`Security Concerns: ${analysis.securityConcerns.slice(0, 15).join(', ')}`);
    }

    // Send as much raw project code as possible (up to 100K for large-context models)
    const maxContent = 100000;
    const trimmedContent = content.length > maxContent ? content.substring(0, maxContent) + '\n...(truncated — project too large to send in full)' : content;
    parts.push(`\n--- FULL PROJECT SOURCE CODE ---\n${trimmedContent}`);

    parts.push(`\nAnalyze this entire codebase thoroughly. Generate ${options.testType === 'all' ? 'all types of' : options.testType} test cases at ${options.depth} depth. Reference actual code (function names, file paths, class names) in your test cases. Return ONLY the JSON array.`);

    return parts.join('\n');
  }

  /**
   * Generate test cases from a full project folder via LLM.
   * Uses the project-specific prompts that send more code context.
   */
  async function generateProjectTestCases(analysis, content, options, llmConfig) {
    const systemPrompt = buildProjectSystemPrompt(options);
    const userPrompt = buildProjectUserPrompt(analysis, content, options);
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
    generateProjectTestCases,
    getConfig,
    saveConfig,
    parseResponse,
  };
})();
