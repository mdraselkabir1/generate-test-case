/**
 * Exporter Module — exports test plans/cases in various formats.
 */
const Exporter = (() => {

  function exportPlan(plan, format) {
    switch (format) {
      case 'csv': return exportCSV(plan);
      case 'json': return exportJSON(plan);
      case 'markdown': return exportMarkdown(plan);
      case 'html': return exportHTML(plan);
      default: return exportMarkdown(plan);
    }
  }

  function exportAllPlans(format) {
    const plans = Storage.getPlans();
    if (plans.length === 0) return null;

    switch (format) {
      case 'csv': return exportAllCSV(plans);
      case 'json': return exportAllJSON(plans);
      case 'markdown': return exportAllMarkdown(plans);
      case 'html': return exportAllHTML(plans);
      default: return exportAllMarkdown(plans);
    }
  }

  // ===== CSV =====
  function exportCSV(plan) {
    const headers = ['ID', 'Title', 'Type', 'Priority', 'Preconditions', 'Steps', 'Expected Result', 'Notes'];
    const rows = plan.testCases.map(tc => [
      tc.id,
      csvEscape(tc.title),
      tc.type,
      tc.priority,
      csvEscape(tc.preconditions),
      csvEscape(tc.steps.join(' → ')),
      csvEscape(tc.expectedResult),
      csvEscape(tc.notes || ''),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return { content: csv, filename: `${sanitizeFilename(plan.name)}.csv`, mimeType: 'text/csv' };
  }

  function exportAllCSV(plans) {
    const headers = ['Plan', 'ID', 'Title', 'Type', 'Priority', 'Preconditions', 'Steps', 'Expected Result', 'Notes'];
    const rows = [];
    plans.forEach(plan => {
      plan.testCases.forEach(tc => {
        rows.push([
          csvEscape(plan.name),
          tc.id,
          csvEscape(tc.title),
          tc.type,
          tc.priority,
          csvEscape(tc.preconditions),
          csvEscape(tc.steps.join(' → ')),
          csvEscape(tc.expectedResult),
          csvEscape(tc.notes || ''),
        ]);
      });
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return { content: csv, filename: 'all-test-plans.csv', mimeType: 'text/csv' };
  }

  // ===== JSON =====
  function exportJSON(plan) {
    const content = JSON.stringify(plan, null, 2);
    return { content, filename: `${sanitizeFilename(plan.name)}.json`, mimeType: 'application/json' };
  }

  function exportAllJSON(plans) {
    const content = JSON.stringify({ plans, exportedAt: new Date().toISOString() }, null, 2);
    return { content, filename: 'all-test-plans.json', mimeType: 'application/json' };
  }

  // ===== Markdown =====
  function exportMarkdown(plan) {
    let md = `# ${plan.name}\n\n`;
    md += `**Created:** ${new Date(plan.createdAt).toLocaleString()}\n`;
    md += `**Source:** ${plan.source}${plan.sourceRef ? ` (${plan.sourceRef})` : ''}\n`;
    md += `**Total Test Cases:** ${plan.testCases.length}\n\n`;

    // Summary
    md += `## Summary\n\n`;
    md += `| Type | Count |\n|------|-------|\n`;
    Object.entries(plan.summary.byType).forEach(([type, count]) => {
      md += `| ${type} | ${count} |\n`;
    });
    md += `\n| Priority | Count |\n|----------|-------|\n`;
    Object.entries(plan.summary.byPriority).forEach(([pri, count]) => {
      md += `| ${pri} | ${count} |\n`;
    });
    md += '\n';

    // Test Cases
    md += `## Test Cases\n\n`;
    plan.testCases.forEach(tc => {
      md += `### ${tc.id}: ${tc.title}\n\n`;
      md += `- **Type:** ${tc.type}\n`;
      md += `- **Priority:** ${tc.priority}\n`;
      md += `- **Preconditions:** ${tc.preconditions}\n\n`;
      md += `**Steps:**\n`;
      tc.steps.forEach((step, i) => {
        md += `${i + 1}. ${step}\n`;
      });
      md += `\n**Expected Result:** ${tc.expectedResult}\n`;
      if (tc.notes) md += `\n> ${tc.notes}\n`;
      md += '\n---\n\n';
    });

    return { content: md, filename: `${sanitizeFilename(plan.name)}.md`, mimeType: 'text/markdown' };
  }

  function exportAllMarkdown(plans) {
    let md = `# Test Plans Export\n\n**Exported:** ${new Date().toLocaleString()}\n**Total Plans:** ${plans.length}\n\n---\n\n`;
    plans.forEach(plan => {
      md += exportMarkdown(plan).content + '\n\n';
    });
    return { content: md, filename: 'all-test-plans.md', mimeType: 'text/markdown' };
  }

  // ===== HTML Report =====
  function exportHTML(plan) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(plan.name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 1.8rem; margin-bottom: 8px; color: #4f46e5; }
    h2 { font-size: 1.3rem; margin: 24px 0 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    .meta { color: #6c757d; font-size: 0.9rem; margin-bottom: 24px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .summary-card { background: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center; }
    .summary-card h3 { font-size: 1.5rem; color: #4f46e5; }
    .summary-card p { font-size: 0.8rem; color: #6c757d; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 0.85rem; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8f9fa; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .tc { margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .tc-header { background: #f8f9fa; padding: 12px 16px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
    .tc-body { padding: 16px; }
    .tc-body p { margin-bottom: 8px; }
    .badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
    .badge-critical { background: #fef2f2; color: #ef4444; }
    .badge-high { background: #fffbeb; color: #f59e0b; }
    .badge-medium { background: #eff6ff; color: #3b82f6; }
    .badge-low { background: #f8f9fa; color: #6c757d; }
    ol { padding-left: 20px; }
    ol li { margin-bottom: 4px; }
    .expected { background: #ecfdf5; border-left: 3px solid #10b981; padding: 10px 14px; border-radius: 0 8px 8px 0; margin-top: 12px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 0.8rem; color: #6c757d; text-align: center; }
    @media print { body { max-width: none; } .tc { break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(plan.name)}</h1>
  <div class="meta">
    <p>Created: ${new Date(plan.createdAt).toLocaleString()} | Source: ${escapeHtml(plan.source)} | Total Cases: ${plan.testCases.length}</p>
  </div>

  <div class="summary">
    <div class="summary-card"><h3>${plan.testCases.length}</h3><p>Total Cases</p></div>
    ${Object.entries(plan.summary.byPriority).map(([p, c]) => `<div class="summary-card"><h3>${c}</h3><p>${p}</p></div>`).join('')}
  </div>

  <h2>Summary Table</h2>
  <table>
    <thead><tr><th>ID</th><th>Title</th><th>Type</th><th>Priority</th></tr></thead>
    <tbody>
      ${plan.testCases.map(tc => `<tr><td>${tc.id}</td><td>${escapeHtml(tc.title)}</td><td>${tc.type}</td><td><span class="badge badge-${tc.priority}">${tc.priority}</span></td></tr>`).join('')}
    </tbody>
  </table>

  <h2>Detailed Test Cases</h2>
  ${plan.testCases.map(tc => `
  <div class="tc">
    <div class="tc-header">
      <span>${tc.id}: ${escapeHtml(tc.title)}</span>
      <span class="badge badge-${tc.priority}">${tc.priority}</span>
    </div>
    <div class="tc-body">
      <p><strong>Type:</strong> ${tc.type}</p>
      <p><strong>Preconditions:</strong> ${escapeHtml(tc.preconditions)}</p>
      <p><strong>Steps:</strong></p>
      <ol>${tc.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
      <div class="expected"><strong>Expected Result:</strong> ${escapeHtml(tc.expectedResult)}</div>
    </div>
  </div>`).join('')}

  <div class="footer">
    <p>Generated by TestForge — ${new Date().toLocaleDateString()}</p>
  </div>
</body>
</html>`;
    return { content: html, filename: `${sanitizeFilename(plan.name)}.html`, mimeType: 'text/html' };
  }

  function exportAllHTML(plans) {
    let combined = '';
    plans.forEach(plan => {
      combined += exportHTML(plan).content + '\n\n';
    });
    return { content: combined, filename: 'all-test-plans.html', mimeType: 'text/html' };
  }

  // ===== Download Helper =====
  function download(exportResult) {
    if (!exportResult) return;
    const blob = new Blob([exportResult.content], { type: exportResult.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ===== Utilities =====
  function csvEscape(str) {
    if (!str) return '""';
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase().substring(0, 60);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { exportPlan, exportAllPlans, download };
})();
