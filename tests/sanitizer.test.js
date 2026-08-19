import { describe, it, expect } from 'vitest';
import { escapeHtml, html, rawHtml } from '../src/core/sanitizer.js';

describe('Sanitizer Module', () => {
  it('should escape dangerous HTML characters in strings', () => {
    expect(escapeHtml('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    expect(escapeHtml('Tom & Jerry "The Best" <tag> \'quote\'')).toBe('Tom &amp; Jerry &quot;The Best&quot; &lt;tag&gt; &#39;quote&#39;');
  });

  it('should handle null and undefined safely', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('should automatically escape interpolations in html template tag', () => {
    const dangerousName = '<img src=x onerror=alert(1)>';
    const output = html`<div class="team">${dangerousName}</div>`.toString();
    expect(output).toBe('<div class="team">&lt;img src&#x3D;x onerror&#x3D;alert(1)&gt;</div>');
  });

  it('should allow rawHtml to bypass escaping when explicitly trusted', () => {
    const safeBadge = rawHtml('<span class="badge">CHAMPION</span>');
    const output = html`<div>${safeBadge}</div>`.toString();
    expect(output).toBe('<div><span class="badge">CHAMPION</span></div>');
  });
});
