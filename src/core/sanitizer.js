/**
 * Sanitizer Utility for Y2K Record Book v2
 * Prevents client-side DOM Cross-Site Scripting (XSS) when rendering dynamic data.
 */

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Escapes unsafe HTML characters in a string.
 * @param {any} value - The input value to escape.
 * @returns {string} - Escaped safe HTML string.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"'`=\/]/g, (char) => ESCAPE_MAP[char]);
}

/**
 * Tagged template literal for safely composing HTML with automatic escaping of interpolated values.
 * Values wrapped in rawHtml() are not escaped.
 */
class RawHtmlString {
  constructor(html) {
    this.html = String(html);
  }
  toString() {
    return this.html;
  }
}

/**
 * Marks a string as already safe raw HTML (e.g. trusted SVGs, badges, nested safe components).
 * @param {string} html 
 * @returns {RawHtmlString}
 */
export function rawHtml(html) {
  return new RawHtmlString(html);
}

/**
 * Tagged template literal builder.
 * Usage: html`<div>${unsafeUserInput}</div>`
 */
export function html(strings, ...values) {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      const val = values[i];
      if (val instanceof RawHtmlString) {
        result += val.toString();
      } else if (Array.isArray(val)) {
        result += val.map(item => item instanceof RawHtmlString ? item.toString() : escapeHtml(item)).join('');
      } else {
        result += escapeHtml(val);
      }
    }
  }
  return rawHtml(result);
}
