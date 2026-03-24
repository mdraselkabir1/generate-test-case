/**
 * Test Case Generator Engine
 * Generates test plans and test cases from analyzed content.
 */
const Generator = (() => {

  const DEPTH_MAP = {
    basic:         { min: 5,  max: 10, edgeCases: false, negatives: false },
    standard:      { min: 10, max: 25, edgeCases: true,  negatives: true  },
    comprehensive: { min: 25, max: 50, edgeCases: true,  negatives: true  },
    exhaustive:    { min: 50, max: 200, edgeCases: true,  negatives: true  },
  };

  /**
   * Main entry: generate a test plan from analyzed content + options.
   */
  function generateTestPlan(analysis, options) {
    const { testType, priority, depth, planName } = options;
    const depthConfig = DEPTH_MAP[depth] || DEPTH_MAP.standard;

    const id = Storage.generateId();
    const name = planName || inferPlanName(analysis);
    const testCases = [];

    // --- Generate functional test cases ---
    if (testType === 'all' || testType === 'functional') {
      testCases.push(...generateFunctionalCases(analysis, depthConfig));
    }

    // --- Generate UI/UX test cases ---
    if (testType === 'all' || testType === 'ui') {
      testCases.push(...generateUICases(analysis, depthConfig));
    }

    // --- Generate API test cases ---
    if (testType === 'all' || testType === 'api') {
      testCases.push(...generateAPICases(analysis, depthConfig));
    }

    // --- Generate security test cases ---
    if (testType === 'all' || testType === 'security') {
      testCases.push(...generateSecurityCases(analysis, depthConfig));
    }

    // --- Generate performance test cases ---
    if (testType === 'all' || testType === 'performance') {
      testCases.push(...generatePerformanceCases(analysis, depthConfig));
    }

    // --- Generate accessibility test cases ---
    if (testType === 'all' || testType === 'accessibility') {
      testCases.push(...generateAccessibilityCases(analysis, depthConfig));
    }

    // --- Generate edge case tests ---
    if ((testType === 'all' || testType === 'edge-cases') && depthConfig.edgeCases) {
      testCases.push(...generateEdgeCases(analysis, depthConfig));
    }

    // --- Generate unit test cases from source code ---
    if (testType === 'all' || testType === 'unit') {
      if (analysis.codeAnalysis && analysis.codeAnalysis.isSourceCode) {
        testCases.push(...generateUnitTestCases(analysis, depthConfig));
      }
    }

    // --- Generate integration test cases from source code ---
    if (testType === 'all' || testType === 'integration') {
      if (analysis.codeAnalysis && analysis.codeAnalysis.isSourceCode) {
        testCases.push(...generateCodeIntegrationCases(analysis, depthConfig));
      }
    }

    // --- Generate from user stories ---
    if (analysis.userStories.length > 0) {
      testCases.push(...generateFromUserStories(analysis, depthConfig));
    }

    // --- Generate from requirements ---
    if (analysis.requirements.length > 0) {
      testCases.push(...generateFromRequirements(analysis, depthConfig));
    }

    // Filter by priority if specified
    let filtered = testCases;
    if (priority && priority !== 'all') {
      filtered = testCases.filter(tc => tc.priority === priority);
      // If filtering removes too many, add some back
      if (filtered.length < depthConfig.min) filtered = testCases;
    }

    // Trim to max count
    const finalCases = filtered.slice(0, depthConfig.max);

    // Assign IDs
    finalCases.forEach((tc, i) => {
      tc.id = `TC-${String(i + 1).padStart(3, '0')}`;
    });

    return {
      id,
      name,
      createdAt: new Date().toISOString(),
      source: options.sourceType || 'text',
      sourceRef: options.sourceRef || '',
      testType: testType,
      depth: depth,
      testCases: finalCases,
      summary: {
        total: finalCases.length,
        byType: countBy(finalCases, 'type'),
        byPriority: countBy(finalCases, 'priority'),
      },
    };
  }

  // ============================================================
  // Functional Test Cases
  // ============================================================
  function generateFunctionalCases(analysis, depthConfig) {
    const cases = [];
    const { actions, entities, features, sections, keywords } = analysis;

    // Generate cases for each detected action
    actions.forEach(action => {
      const context = findContextForKeyword(analysis, action);

      cases.push({
        title: `Verify ${action} operation works correctly`,
        type: 'functional',
        priority: getActionPriority(action),
        preconditions: `User is authenticated and has access to ${action} functionality`,
        steps: [
          `Navigate to the ${action} feature/page`,
          `Provide valid input data for ${action} operation`,
          `Execute the ${action} action`,
          `Observe the system response`,
        ],
        expectedResult: `The ${action} operation completes successfully with appropriate confirmation`,
        notes: context ? `Context: ${context.substring(0, 150)}` : '',
      });

      // Negative test
      if (depthConfig.negatives) {
        cases.push({
          title: `Verify ${action} fails gracefully with invalid data`,
          type: 'functional',
          priority: 'medium',
          preconditions: `User is authenticated`,
          steps: [
            `Navigate to the ${action} feature/page`,
            `Provide invalid or empty input data`,
            `Attempt to execute the ${action} action`,
            `Observe the error handling`,
          ],
          expectedResult: `System displays appropriate error message and does not proceed with invalid data`,
          notes: 'Negative test case',
        });
      }
    });

    // Generate cases from sections/features
    sections.forEach(section => {
      cases.push({
        title: `Verify ${section} functionality end-to-end`,
        type: 'functional',
        priority: 'high',
        preconditions: `System is accessible and ${section} module is available`,
        steps: [
          `Access the ${section} section`,
          `Verify all elements are displayed correctly`,
          `Test the primary workflow in ${section}`,
          `Verify data is saved/processed correctly`,
          `Confirm success state is reached`,
        ],
        expectedResult: `${section} functions as specified with all workflows completing successfully`,
        notes: '',
      });
    });

    // Generate cases from detected entities
    entities.forEach(entity => {
      cases.push({
        title: `Verify CRUD operations for ${entity}`,
        type: 'functional',
        priority: 'high',
        preconditions: `User has permissions to manage ${entity}`,
        steps: [
          `Create a new ${entity} with valid data`,
          `Verify ${entity} appears in the listing`,
          `View the ${entity} details`,
          `Update the ${entity} information`,
          `Verify changes are saved`,
          `Delete the ${entity}`,
          `Confirm ${entity} is removed`,
        ],
        expectedResult: `All CRUD operations for ${entity} work correctly`,
        notes: '',
      });
    });

    return cases;
  }

  // ============================================================
  // UI/UX Test Cases
  // ============================================================
  function generateUICases(analysis, depthConfig) {
    const cases = [];
    const { sections, keywords, actions } = analysis;

    const uiKeywords = keywords.filter(k =>
      ['button', 'form', 'input', 'page', 'screen', 'menu', 'modal', 'dialog',
       'table', 'list', 'dropdown', 'tab', 'navigation', 'layout', 'image',
       'text', 'label', 'field', 'link', 'card', 'panel', 'header', 'footer',
       'sidebar', 'widget', 'icon', 'tooltip', 'popup', 'banner', 'notification'].includes(k)
    );

    // General UI cases
    cases.push({
      title: 'Verify responsive design across screen sizes',
      type: 'ui',
      priority: 'high',
      preconditions: 'Application is accessible',
      steps: [
        'Open the application on desktop (1920x1080)',
        'Resize browser to tablet size (768px)',
        'Resize browser to mobile size (375px)',
        'Check all pages for layout issues',
        'Verify no horizontal scrollbar appears unnecessarily',
      ],
      expectedResult: 'Application layout adapts properly to all screen sizes without broken elements',
      notes: '',
    });

    cases.push({
      title: 'Verify consistent visual styling across pages',
      type: 'ui',
      priority: 'medium',
      preconditions: 'Application is accessible',
      steps: [
        'Navigate through all main pages/sections',
        'Check font consistency (family, sizes, weights)',
        'Check color consistency for similar elements',
        'Verify spacing and alignment is uniform',
        'Check button styles are consistent',
      ],
      expectedResult: 'Visual styling is consistent across all pages following the design system',
      notes: '',
    });

    cases.push({
      title: 'Verify loading states and feedback',
      type: 'ui',
      priority: 'medium',
      preconditions: 'Application is accessible',
      steps: [
        'Trigger actions that require processing time',
        'Observe loading indicators (spinners, progress bars)',
        'Verify user cannot double-submit during loading',
        'Check that loading states resolve properly',
      ],
      expectedResult: 'Appropriate loading feedback is shown for all async operations',
      notes: '',
    });

    // Section-specific UI cases
    sections.slice(0, 5).forEach(section => {
      cases.push({
        title: `Verify ${section} page layout and visual elements`,
        type: 'ui',
        priority: 'medium',
        preconditions: `${section} page is accessible`,
        steps: [
          `Navigate to the ${section} page`,
          'Verify page layout matches design specifications',
          'Check all text is readable and properly formatted',
          'Verify images/icons load correctly',
          'Test interactive elements (hover, focus states)',
        ],
        expectedResult: `${section} page displays correctly with all visual elements properly rendered`,
        notes: '',
      });
    });

    if (actions.some(a => ['submit', 'create', 'save', 'add', 'register'].includes(a))) {
      cases.push({
        title: 'Verify form validation displays inline errors',
        type: 'ui',
        priority: 'high',
        preconditions: 'Form page is accessible',
        steps: [
          'Navigate to a form page',
          'Submit the form without filling any fields',
          'Verify inline error messages appear for required fields',
          'Fill one field incorrectly and verify specific error',
          'Correct the errors and verify error messages disappear',
        ],
        expectedResult: 'Form validation shows clear, inline error messages that update as user corrects input',
        notes: '',
      });
    }

    return cases;
  }

  // ============================================================
  // API Test Cases
  // ============================================================
  function generateAPICases(analysis, depthConfig) {
    const cases = [];
    const { actions, entities, keywords } = analysis;

    const apiKeywords = keywords.filter(k =>
      ['api', 'endpoint', 'request', 'response', 'get', 'post', 'put', 'delete',
       'patch', 'rest', 'json', 'xml', 'status', 'token', 'header', 'body',
       'parameter', 'query', 'payload', 'webhook', 'graphql'].includes(k)
    );

    // Standard REST API cases
    const httpMethods = [
      { method: 'GET', action: 'retrieve', priority: 'high' },
      { method: 'POST', action: 'create', priority: 'critical' },
      { method: 'PUT', action: 'update', priority: 'high' },
      { method: 'DELETE', action: 'delete', priority: 'high' },
    ];

    entities.slice(0, 5).forEach(entity => {
      httpMethods.forEach(({ method, action, priority }) => {
        cases.push({
          title: `API: ${method} ${entity} - success scenario`,
          type: 'api',
          priority,
          preconditions: `API server is running, valid auth token available`,
          steps: [
            `Send ${method} request to /${entity.toLowerCase().replace(/\s+/g, '-')} endpoint`,
            'Include valid authorization header',
            method !== 'GET' && method !== 'DELETE' ? 'Include valid request body with required fields' : 'Include required query parameters if any',
            'Verify response status code',
            'Validate response body structure',
          ].filter(Boolean),
          expectedResult: `API returns ${method === 'POST' ? '201 Created' : method === 'DELETE' ? '204 No Content' : '200 OK'} with correct response body`,
          notes: '',
        });
      });

      // Unauthorized access
      cases.push({
        title: `API: ${entity} endpoint rejects unauthorized requests`,
        type: 'api',
        priority: 'critical',
        preconditions: 'API server is running',
        steps: [
          `Send request to /${entity.toLowerCase().replace(/\s+/g, '-')} without auth token`,
          'Verify response status code',
          'Verify error message in response body',
        ],
        expectedResult: 'API returns 401 Unauthorized with appropriate error message',
        notes: 'Security-related API test',
      });
    });

    // Generic API cases
    cases.push({
      title: 'API: Verify rate limiting is enforced',
      type: 'api',
      priority: 'medium',
      preconditions: 'API server is running',
      steps: [
        'Send rapid consecutive requests exceeding rate limit',
        'Observe response after limit is reached',
        'Wait for rate limit window to reset',
        'Verify requests succeed again',
      ],
      expectedResult: 'API returns 429 Too Many Requests when rate limit is exceeded',
      notes: '',
    });

    cases.push({
      title: 'API: Verify proper error responses for invalid input',
      type: 'api',
      priority: 'high',
      preconditions: 'API server is running with valid auth',
      steps: [
        'Send request with malformed JSON body',
        'Send request with missing required fields',
        'Send request with invalid field types',
        'Verify each returns appropriate 400-level error',
      ],
      expectedResult: 'API returns 400 Bad Request with descriptive error messages for each invalid input',
      notes: '',
    });

    return cases;
  }

  // ============================================================
  // Security Test Cases
  // ============================================================
  function generateSecurityCases(analysis, depthConfig) {
    const cases = [];
    const { actions, keywords } = analysis;

    const securityTests = [
      {
        title: 'Verify protection against SQL injection',
        priority: 'critical',
        steps: [
          'Identify all user input fields',
          'Enter SQL injection payloads in each field (e.g., \' OR 1=1 --)',
          'Submit the form and observe behavior',
          'Verify application does not expose database errors',
          'Verify data integrity is maintained',
        ],
        expected: 'Application sanitizes input and does not execute injected SQL. No database errors exposed.',
      },
      {
        title: 'Verify protection against XSS attacks',
        priority: 'critical',
        steps: [
          'Identify all user input fields that display output',
          'Enter XSS payloads (e.g., <script>alert("xss")</script>)',
          'Submit and navigate to where input is displayed',
          'Verify script does not execute',
          'Check that input is properly escaped/sanitized',
        ],
        expected: 'Application escapes all user input. No script execution occurs.',
      },
      {
        title: 'Verify authentication security',
        priority: 'critical',
        steps: [
          'Attempt to access protected resources without authentication',
          'Test session timeout functionality',
          'Try accessing another user\'s data with current session',
          'Verify password is not stored/transmitted in plain text',
        ],
        expected: 'Authentication controls prevent unauthorized access. Sessions expire appropriately.',
      },
      {
        title: 'Verify CSRF protection',
        priority: 'high',
        steps: [
          'Identify all state-changing operations (forms, API calls)',
          'Attempt to forge requests from external origin',
          'Verify CSRF tokens are present and validated',
          'Test that expired CSRF tokens are rejected',
        ],
        expected: 'All state-changing operations are protected with CSRF tokens.',
      },
      {
        title: 'Verify data encryption in transit',
        priority: 'critical',
        steps: [
          'Verify HTTPS is enforced on all pages',
          'Check for HTTP to HTTPS redirect',
          'Inspect network traffic for sensitive data',
          'Verify TLS version and cipher suites',
        ],
        expected: 'All data is transmitted over HTTPS with strong TLS configuration.',
      },
      {
        title: 'Verify authorization and access control',
        priority: 'critical',
        steps: [
          'Test role-based access control (RBAC)',
          'Attempt vertical privilege escalation',
          'Attempt horizontal privilege escalation',
          'Verify resource-level permissions',
        ],
        expected: 'Users can only access resources and perform actions allowed by their role.',
      },
    ];

    if (actions.includes('upload')) {
      securityTests.push({
        title: 'Verify file upload security',
        priority: 'high',
        steps: [
          'Attempt to upload executable files (.exe, .sh)',
          'Attempt to upload oversized files',
          'Attempt to upload files with double extensions',
          'Verify uploaded files are scanned and stored securely',
        ],
        expected: 'Only allowed file types are accepted. Files are scanned and stored securely.',
      });
    }

    securityTests.forEach(t => {
      cases.push({
        title: t.title,
        type: 'security',
        priority: t.priority,
        preconditions: 'Application is accessible in a test environment',
        steps: t.steps,
        expectedResult: t.expected,
        notes: '',
      });
    });

    return cases;
  }

  // ============================================================
  // Performance Test Cases
  // ============================================================
  function generatePerformanceCases(analysis, depthConfig) {
    const cases = [];

    const perfTests = [
      {
        title: 'Verify page load time under normal conditions',
        priority: 'high',
        steps: [
          'Clear browser cache',
          'Navigate to the main page',
          'Measure time to First Contentful Paint (FCP)',
          'Measure time to Largest Contentful Paint (LCP)',
          'Verify total page load time',
        ],
        expected: 'Page loads within 3 seconds. FCP under 1.5s, LCP under 2.5s.',
      },
      {
        title: 'Verify system performance under concurrent users',
        priority: 'high',
        steps: [
          'Set up load testing tool (e.g., k6, JMeter)',
          'Simulate 100 concurrent users',
          'Monitor response times and error rates',
          'Gradually increase to 500 concurrent users',
          'Record performance metrics at each level',
        ],
        expected: 'System handles 100+ concurrent users with <2s response time and <1% error rate.',
      },
      {
        title: 'Verify database query performance',
        priority: 'medium',
        steps: [
          'Identify critical database queries',
          'Test with 10,000+ records in database',
          'Measure query execution times',
          'Check for N+1 query problems',
          'Verify indexes are used effectively',
        ],
        expected: 'All critical queries execute within 100ms. No N+1 query issues detected.',
      },
      {
        title: 'Verify application memory usage',
        priority: 'medium',
        steps: [
          'Monitor memory usage over extended period',
          'Perform repeated operations (create, navigate, search)',
          'Check for memory leaks',
          'Verify garbage collection works properly',
        ],
        expected: 'Memory usage remains stable. No memory leaks detected over extended usage.',
      },
    ];

    perfTests.forEach(t => {
      cases.push({
        title: t.title,
        type: 'performance',
        priority: t.priority,
        preconditions: 'Performance testing environment is set up',
        steps: t.steps,
        expectedResult: t.expected,
        notes: '',
      });
    });

    return cases;
  }

  // ============================================================
  // Accessibility Test Cases
  // ============================================================
  function generateAccessibilityCases(analysis, depthConfig) {
    const cases = [];

    const a11yTests = [
      {
        title: 'Verify keyboard navigation support',
        priority: 'high',
        steps: [
          'Navigate through the application using only Tab key',
          'Verify all interactive elements are reachable',
          'Test Enter/Space to activate buttons and links',
          'Verify focus indicators are visible',
          'Test Escape key to close modals/dropdowns',
        ],
        expected: 'All functionality is accessible via keyboard with visible focus indicators.',
      },
      {
        title: 'Verify screen reader compatibility',
        priority: 'high',
        steps: [
          'Enable screen reader (VoiceOver/NVDA/JAWS)',
          'Navigate through the main workflows',
          'Verify all images have alt text',
          'Verify form labels are properly associated',
          'Verify dynamic content changes are announced',
        ],
        expected: 'Application is fully navigable with screen reader. All content is properly announced.',
      },
      {
        title: 'Verify color contrast compliance (WCAG AA)',
        priority: 'medium',
        steps: [
          'Use contrast checker tool on all text elements',
          'Verify normal text has 4.5:1 contrast ratio',
          'Verify large text has 3:1 contrast ratio',
          'Check contrast in both light and dark modes',
          'Verify information is not conveyed by color alone',
        ],
        expected: 'All text meets WCAG AA contrast requirements. Color is not sole information conveyor.',
      },
      {
        title: 'Verify proper heading hierarchy',
        priority: 'medium',
        steps: [
          'Inspect heading levels on each page',
          'Verify headings follow logical order (H1 -> H2 -> H3)',
          'Verify each page has exactly one H1',
          'Check that headings accurately describe their sections',
        ],
        expected: 'Heading hierarchy is logical with no skipped levels. Each page has one H1.',
      },
    ];

    a11yTests.forEach(t => {
      cases.push({
        title: t.title,
        type: 'accessibility',
        priority: t.priority,
        preconditions: 'Application is accessible with assistive technology tools ready',
        steps: t.steps,
        expectedResult: t.expected,
        notes: '',
      });
    });

    return cases;
  }

  // ============================================================
  // Edge Cases
  // ============================================================
  function generateEdgeCases(analysis, depthConfig) {
    const cases = [];
    const { actions, entities, keywords } = analysis;

    const edgeTests = [
      {
        title: 'Verify behavior with empty/null inputs',
        priority: 'medium',
        steps: [
          'Locate all input fields',
          'Submit forms with empty fields',
          'Submit forms with only whitespace',
          'Verify error handling for null values',
        ],
        expected: 'Application handles empty inputs gracefully with appropriate validation messages.',
      },
      {
        title: 'Verify behavior with maximum length inputs',
        priority: 'medium',
        steps: [
          'Enter maximum allowed characters in text fields',
          'Enter text exceeding maximum length',
          'Test with very long URLs/email addresses',
          'Verify UI handles long text without breaking layout',
        ],
        expected: 'Application enforces max length limits and handles overflow text gracefully.',
      },
      {
        title: 'Verify behavior with special characters',
        priority: 'medium',
        steps: [
          'Enter special characters (!@#$%^&*) in input fields',
          'Enter Unicode characters and emojis',
          'Enter HTML tags in text inputs',
          'Verify data is stored and displayed correctly',
        ],
        expected: 'Special characters are handled correctly without errors or security issues.',
      },
      {
        title: 'Verify behavior with network interruption',
        priority: 'high',
        steps: [
          'Perform an action that requires network',
          'Simulate network disconnection during operation',
          'Verify error handling and user notification',
          'Restore network and verify recovery',
        ],
        expected: 'Application detects network issues, shows clear error, and recovers when network resumes.',
      },
      {
        title: 'Verify concurrent modification handling',
        priority: 'medium',
        steps: [
          'Open same resource in two browser tabs',
          'Modify the resource in first tab',
          'Attempt to modify the same resource in second tab',
          'Verify conflict resolution behavior',
        ],
        expected: 'Application detects concurrent modifications and handles conflicts appropriately.',
      },
      {
        title: 'Verify browser back/forward button behavior',
        priority: 'low',
        steps: [
          'Navigate through several pages',
          'Use browser back button',
          'Verify correct page is shown with correct state',
          'Use forward button',
          'Test back button after form submission',
        ],
        expected: 'Browser navigation works correctly. No duplicate submissions on back/forward.',
      },
    ];

    edgeTests.forEach(t => {
      cases.push({
        title: t.title,
        type: 'edge-cases',
        priority: t.priority,
        preconditions: 'Application is accessible in test environment',
        steps: t.steps,
        expectedResult: t.expected,
        notes: 'Edge case scenario',
      });
    });

    return cases;
  }

  // ============================================================
  // From User Stories
  // ============================================================
  function generateFromUserStories(analysis, depthConfig) {
    const cases = [];

    analysis.userStories.slice(0, 10).forEach((story, i) => {
      const parts = story.match(/as a (.+?) i want (.+?) so that (.+)/i);
      if (parts) {
        const [, role, action, benefit] = parts;
        cases.push({
          title: `User Story: ${role.trim()} - ${action.trim().substring(0, 60)}`,
          type: 'functional',
          priority: 'high',
          preconditions: `User is logged in as ${role.trim()}`,
          steps: [
            `Log in as ${role.trim()}`,
            `Navigate to the relevant feature area`,
            `Perform action: ${action.trim()}`,
            `Verify the expected outcome`,
            `Confirm: ${benefit.trim()}`,
          ],
          expectedResult: `${action.trim()} is completed successfully, achieving: ${benefit.trim()}`,
          notes: `Source story: "${story.substring(0, 200)}"`,
        });
      } else {
        cases.push({
          title: `User Story #${i + 1}: Verify scenario`,
          type: 'functional',
          priority: 'medium',
          preconditions: 'User is authenticated',
          steps: [
            `Review user story: "${story.substring(0, 150)}"`,
            'Execute the described workflow',
            'Verify expected behavior',
          ],
          expectedResult: `The user story scenario works as described`,
          notes: `Source: "${story.substring(0, 200)}"`,
        });
      }
    });

    return cases;
  }

  // ============================================================
  // From Requirements
  // ============================================================
  function generateFromRequirements(analysis, depthConfig) {
    const cases = [];

    analysis.requirements.slice(0, 15).forEach((req, i) => {
      const priorityWord = req.match(/\b(shall|must)\b/i) ? 'critical' :
                           req.match(/\bshould\b/i) ? 'high' : 'medium';
      cases.push({
        title: `REQ-${String(i + 1).padStart(3, '0')}: ${req.substring(0, 80).trim()}`,
        type: 'functional',
        priority: priorityWord,
        preconditions: 'System is in the required state described by the requirement',
        steps: [
          `Set up preconditions for: "${req.substring(0, 120)}"`,
          'Execute the specified behavior/action',
          'Verify the system meets the requirement',
          'Document any deviations',
        ],
        expectedResult: `System behavior matches requirement: "${req.substring(0, 150)}"`,
        notes: `Source requirement: "${req.substring(0, 200)}"`,
      });
    });

    return cases;
  }

  // ============================================================
  // Helpers
  // ============================================================

  // ============================================================
  // Unit Test Cases (from source code analysis)
  // ============================================================
  function generateUnitTestCases(analysis, depthConfig) {
    const cases = [];
    const ca = analysis.codeAnalysis;
    if (!ca || !ca.isSourceCode) return cases;

    const lang = ca.language;
    const file = ca.fileName;

    // --- Per-function test cases ---
    ca.functions.forEach(fn => {
      const paramList = fn.params.length > 0 ? fn.params.join(', ') : 'no parameters';

      // Happy path
      cases.push({
        title: `Unit: ${fn.name}() — returns correct result with valid input`,
        type: 'unit',
        priority: fn.isExported ? 'critical' : 'high',
        preconditions: `${file} is loaded. Dependencies are mocked/stubbed.`,
        steps: [
          `Call ${fn.name}(${paramList}) with valid, typical input values`,
          'Capture the return value',
          'Assert the return value matches the expected output',
          fn.isAsync ? 'Ensure the promise resolves (not rejects)' : 'Verify no exceptions are thrown',
        ],
        expectedResult: `${fn.name}() returns the correct expected value for valid input`,
        notes: `Line ${fn.lineNum} | ${fn.visibility} | ${fn.isAsync ? 'async' : 'sync'} | Returns: ${fn.returnType}`,
      });

      // Null/undefined params
      if (fn.params.length > 0) {
        cases.push({
          title: `Unit: ${fn.name}() — handles null/undefined parameters`,
          type: 'unit',
          priority: 'high',
          preconditions: `${file} is loaded`,
          steps: [
            `Call ${fn.name}() with null for each parameter one at a time`,
            `Call ${fn.name}() with undefined for each parameter`,
            `Call ${fn.name}() with no arguments (if not required)`,
            'Observe behavior for each case',
          ],
          expectedResult: `${fn.name}() either returns a safe default, throws a descriptive error, or handles gracefully — no unhandled crash`,
          notes: `Parameters: ${paramList}`,
        });
      }

      // Edge-case parameter values
      if (fn.params.length > 0 && depthConfig.edgeCases) {
        cases.push({
          title: `Unit: ${fn.name}() — boundary and edge-case inputs`,
          type: 'unit',
          priority: 'medium',
          preconditions: `${file} is loaded`,
          steps: [
            `Call ${fn.name}() with empty string "" for string params`,
            `Call ${fn.name}() with 0, -1, Number.MAX_SAFE_INTEGER for numeric params`,
            `Call ${fn.name}() with empty array [] or empty object {} for collection params`,
            `Call ${fn.name}() with extremely long strings (10000+ chars)`,
            `Call ${fn.name}() with special characters and unicode in string params`,
          ],
          expectedResult: `${fn.name}() handles all boundary values without crashing`,
          notes: `Edge case testing for ${paramList}`,
        });
      }

      // Error handling within function
      if (fn.hasErrorHandling) {
        cases.push({
          title: `Unit: ${fn.name}() — error handling paths are exercised`,
          type: 'unit',
          priority: 'high',
          preconditions: `${file} is loaded. Dependencies are mockable.`,
          steps: [
            `Mock dependencies to trigger error conditions inside ${fn.name}()`,
            'Call the function and expect it to handle the error',
            'Verify the correct error type/message is thrown or returned',
            'Verify no side effects occur (no partial writes, no state corruption)',
          ],
          expectedResult: `${fn.name}() catches errors correctly and the caller receives an appropriate error`,
          notes: 'Tests try/catch, throw, or error propagation paths',
        });
      }

      // Async-specific tests
      if (fn.isAsync) {
        cases.push({
          title: `Unit: ${fn.name}() — async rejection/timeout handling`,
          type: 'unit',
          priority: 'high',
          preconditions: `${file} is loaded. Async dependencies are mockable.`,
          steps: [
            `Mock async dependency to reject/throw`,
            `Call ${fn.name}() and await the result`,
            'Verify the rejection is propagated or caught correctly',
            'Mock network/timeout scenario and verify timeout handling',
            'Verify no dangling promises or unhandled rejections',
          ],
          expectedResult: `${fn.name}() properly handles async failures without unhandled promise rejections`,
          notes: 'Async function — test both resolve and reject paths',
        });
      }

      // Return type validation
      if (fn.returnType && fn.returnType !== 'unknown') {
        cases.push({
          title: `Unit: ${fn.name}() — return type is always ${fn.returnType}`,
          type: 'unit',
          priority: 'medium',
          preconditions: `${file} is loaded`,
          steps: [
            `Call ${fn.name}() with various valid inputs`,
            `Assert return type is ${fn.returnType} in every case`,
            `Call ${fn.name}() with edge-case inputs`,
            `Assert return type remains ${fn.returnType} (or null/undefined where documented)`,
          ],
          expectedResult: `Return value is always of type ${fn.returnType} regardless of input variation`,
          notes: `Return type contract enforcement`,
        });
      }
    });

    // --- Per-class test cases ---
    ca.classes.forEach(cls => {
      cases.push({
        title: `Unit: ${cls.name} — instantiation and initialization`,
        type: 'unit',
        priority: 'critical',
        preconditions: `${file} is loaded`,
        steps: [
          `Create a new instance of ${cls.name}${cls.extends ? ` (extends ${cls.extends})` : ''}`,
          'Verify the instance is created without errors',
          'Check all properties are initialized to expected defaults',
          'Verify the instance is of the correct type',
        ],
        expectedResult: `${cls.name} instance is created successfully with correct initial state`,
        notes: `${cls.extends ? 'Extends: ' + cls.extends : ''}${cls.implements.length ? ' | Implements: ' + cls.implements.join(', ') : ''}`,
      });

      // Test each method
      if (cls.methods && cls.methods.length > 0) {
        cls.methods.forEach(method => {
          cases.push({
            title: `Unit: ${cls.name}.${method.name}() — correct behavior`,
            type: 'unit',
            priority: method.visibility === 'public' ? 'high' : 'medium',
            preconditions: `${cls.name} instance is created and in valid state`,
            steps: [
              `Create instance of ${cls.name}`,
              `Call .${method.name}(${method.params.join(', ')}) with valid arguments`,
              'Assert return value is correct',
              'Assert instance state is updated correctly (if stateful)',
            ],
            expectedResult: `${cls.name}.${method.name}() performs its operation correctly`,
            notes: `${method.visibility} method | Line ${method.lineNum}`,
          });
        });
      }
    });

    // --- API Route test cases ---
    ca.apiRoutes.forEach(route => {
      cases.push({
        title: `Unit: ${route.method} ${route.path} handler — success response`,
        type: 'unit',
        priority: 'critical',
        preconditions: `Route handler is isolated. Database/service mocked.`,
        steps: [
          `Send mock ${route.method} request to ${route.path}`,
          'Include valid request body/params as required',
          'Assert the handler returns correct status code',
          'Assert response body structure matches schema',
        ],
        expectedResult: `Handler responds with correct status and body for valid ${route.method} ${route.path}`,
        notes: `Line ${route.lineNum}`,
      });

      // Error cases for routes
      cases.push({
        title: `Unit: ${route.method} ${route.path} handler — error response`,
        type: 'unit',
        priority: 'high',
        preconditions: `Route handler is isolated`,
        steps: [
          `Send mock ${route.method} request with invalid/missing data`,
          'Assert handler returns 4xx error code',
          'Mock database/service failure',
          'Assert handler returns 500 with safe error message (no stack trace leak)',
        ],
        expectedResult: `Handler returns appropriate error responses without leaking internals`,
        notes: 'Negative test for route handler',
      });
    });

    // --- Database operation test cases ---
    const seenDbOps = new Set();
    ca.dbOperations.forEach(op => {
      const key = op.type;
      if (seenDbOps.has(key)) return;
      seenDbOps.add(key);
      cases.push({
        title: `Unit: Database ${op.type} operation — correct query execution`,
        type: 'unit',
        priority: 'high',
        preconditions: `Database connection is mocked/stubbed`,
        steps: [
          `Trigger the code path that performs ${op.type} operation`,
          'Assert the correct query/method is called with expected arguments',
          'Verify the result is processed correctly',
          'Test with empty result set from mock DB',
          'Test with mock DB failure (connection error, constraint violation)',
        ],
        expectedResult: `Database ${op.type} operation is called correctly and results are handled`,
        notes: `Context: ${op.context.substring(0, 80)}`,
      });
    });

    // --- Environment variable tests ---
    if (ca.envVariables.length > 0) {
      cases.push({
        title: `Unit: Environment variables — behavior when missing`,
        type: 'unit',
        priority: 'critical',
        preconditions: `Application environment is configurable`,
        steps: ca.envVariables.slice(0, 8).map(ev =>
          `Unset ${ev.name} and verify the code fails gracefully or uses a default`
        ).concat([
          'Set environment variables to invalid values (empty string, wrong type)',
          'Verify the application validates environment variables at startup',
        ]),
        expectedResult: `Application handles missing/invalid env vars gracefully with clear error messages`,
        notes: `Env vars used: ${ca.envVariables.map(e => e.name).join(', ')}`,
      });
    }

    // --- TODO/FIXME items as risk-based tests ---
    ca.todos.forEach(todo => {
      cases.push({
        title: `Risk: ${todo.type} at line ${todo.lineNum} — verify affected behavior`,
        type: 'unit',
        priority: todo.type === 'BUG' || todo.type === 'FIXME' ? 'critical' : 'medium',
        preconditions: `Code around line ${todo.lineNum} is testable`,
        steps: [
          `Review the ${todo.type} comment: "${todo.text.substring(0, 100)}"`,
          'Identify the affected code path',
          'Write a test that exercises this code path',
          'Verify current behavior is acceptable or document the limitation',
        ],
        expectedResult: `Code path is tested and behavior is documented`,
        notes: `${todo.type}: ${todo.text}`,
      });
    });

    // --- Conditional/branching coverage ---
    if (ca.conditionals.length > 3 && depthConfig.edgeCases) {
      const complexBranches = ca.conditionals.slice(0, 10);
      cases.push({
        title: `Unit: Branch coverage — all conditional paths tested`,
        type: 'unit',
        priority: 'high',
        preconditions: `${file} is loaded with code coverage tooling enabled`,
        steps: [
          `Identify all ${ca.conditionals.length} conditional branches in ${file}`,
          ...complexBranches.slice(0, 5).map(c =>
            `Test both true/false paths for condition at line ${c.lineNum}: ${c.condition.substring(0, 60)}`
          ),
          'Verify branch coverage reaches at least 80%',
        ],
        expectedResult: `All conditional branches are exercised with correct behavior in each path`,
        notes: `Total conditionals: ${ca.conditionals.length} | Total loops: ${ca.loops.length}`,
      });
    }

    return cases;
  }

  // ============================================================
  // Code Integration Test Cases (from source code analysis)
  // ============================================================
  function generateCodeIntegrationCases(analysis, depthConfig) {
    const cases = [];
    const ca = analysis.codeAnalysis;
    if (!ca || !ca.isSourceCode) return cases;

    // --- Import/dependency integration tests ---
    const externalDeps = ca.imports.filter(imp =>
      !imp.module.startsWith('.') && !imp.module.startsWith('/')
    );
    if (externalDeps.length > 0) {
      cases.push({
        title: `Integration: External dependencies — verified compatibility`,
        type: 'integration',
        priority: 'high',
        preconditions: `All dependencies are installed`,
        steps: [
          ...externalDeps.slice(0, 6).map(dep =>
            `Verify ${dep.module} functions [${dep.names.join(', ')}] work correctly when called from ${ca.fileName}`
          ),
          'Run full integration test suite without mocks',
          'Verify no version conflicts or breaking API changes',
        ],
        expectedResult: `All external dependency integrations function correctly end-to-end`,
        notes: `${externalDeps.length} external dependencies detected`,
      });
    }

    // --- API route integration tests ---
    ca.apiRoutes.forEach(route => {
      cases.push({
        title: `Integration: ${route.method} ${route.path} — full request lifecycle`,
        type: 'integration',
        priority: 'critical',
        preconditions: `Server is running, database is seeded with test data`,
        steps: [
          `Send real ${route.method} request to ${route.path}`,
          'Verify request passes through middlewares (auth, validation)',
          'Verify handler processes request with real database',
          'Verify response matches API contract/schema',
          'Verify database state is updated correctly (if write operation)',
        ],
        expectedResult: `Full request from client → middleware → handler → database → response works correctly`,
        notes: `Line ${route.lineNum}`,
      });
    });

    // --- Database integration ---
    if (ca.dbOperations.length > 0) {
      cases.push({
        title: `Integration: Database operations — real DB connectivity`,
        type: 'integration',
        priority: 'critical',
        preconditions: `Test database is running with schema applied`,
        steps: [
          'Connect to test database',
          'Run all database operations against real database',
          'Verify data persistence (write then read back)',
          'Verify transactions commit/rollback correctly',
          'Verify constraints (unique, foreign key, not null) are enforced',
        ],
        expectedResult: `All database operations work correctly against a real database`,
        notes: `${ca.dbOperations.length} DB operations detected`,
      });
    }

    // --- Class inheritance integration ---
    ca.classes.filter(cls => cls.extends).forEach(cls => {
      cases.push({
        title: `Integration: ${cls.name} extends ${cls.extends} — inheritance works`,
        type: 'integration',
        priority: 'high',
        preconditions: `Both ${cls.name} and ${cls.extends} are loaded`,
        steps: [
          `Create instance of ${cls.name}`,
          `Verify inherited methods from ${cls.extends} work correctly`,
          'Verify overridden methods produce correct results',
          'Verify polymorphic behavior (${cls.name} can be used where ${cls.extends} is expected)',
        ],
        expectedResult: `Inheritance chain works correctly — overrides, super calls, and polymorphism all function`,
        notes: `Line ${cls.lineNum}`,
      });
    });

    return cases;
  }

  // ============================================================
  function inferPlanName(analysis) {
    if (analysis.codeAnalysis && analysis.codeAnalysis.isSourceCode) {
      const ca = analysis.codeAnalysis;
      const mainEntity = ca.classes.length > 0 ? ca.classes[0].name :
                         ca.functions.length > 0 ? ca.functions[0].name + '()' : ca.fileName;
      return `Test Plan: ${mainEntity} (${ca.language})`;
    }
    if (analysis.sections.length > 0) {
      return `Test Plan: ${analysis.sections[0]}`;
    }
    if (analysis.keywords.length > 0) {
      return `Test Plan: ${analysis.keywords.slice(0, 3).join(', ')}`;
    }
    return `Test Plan - ${new Date().toLocaleDateString()}`;
  }

  function getActionPriority(action) {
    const critical = ['login', 'logout', 'authenticate', 'authorize', 'submit', 'create', 'delete'];
    const high = ['update', 'save', 'register', 'upload', 'download', 'process', 'validate'];
    if (critical.includes(action)) return 'critical';
    if (high.includes(action)) return 'high';
    return 'medium';
  }

  function findContextForKeyword(analysis, keyword) {
    const text = analysis.rawText || '';
    const idx = text.toLowerCase().indexOf(keyword);
    if (idx === -1) return '';
    const start = Math.max(0, idx - 50);
    const end = Math.min(text.length, idx + keyword.length + 100);
    return text.substring(start, end).trim();
  }

  function countBy(arr, key) {
    return arr.reduce((acc, item) => {
      acc[item[key]] = (acc[item[key]] || 0) + 1;
      return acc;
    }, {});
  }

  return { generateTestPlan };
})();
