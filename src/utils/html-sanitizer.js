/**
 * HTML Sanitizer
 * 
 * Shared utility for sanitizing HTML content and checking if it has meaningful content
 */

/**
 * Sanitize HTML content to remove dangerous elements and attributes
 * @param {string} html - Raw HTML content
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
  try {
    const template = document.createElement('template');
    template.innerHTML = html;

    sanitizeNodeTree(template.content);

    return template.innerHTML;
  } catch (error) {
    return html;
  }
}

/**
 * Walk the node tree and remove dangerous elements/attributes
 * @param {Node} root - Root node to sanitize
 */
function sanitizeNodeTree(root) {
  const blockedTags = new Set(['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'AUDIO', 'VIDEO']);
  const stack = [];

  Array.from(root.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      stack.push(child);
    } else if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
    }
  });

  while (stack.length > 0) {
    const node = stack.pop();

    if (blockedTags.has(node.tagName)) {
      node.remove();
      continue;
    }

    // Remove event handler attributes
    const attributes = Array.from(node.attributes || []);
    for (const attr of attributes) {
      if (attr.name.startsWith('on') || attr.name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:')) {
        node.removeAttribute(attr.name);
      }
    }

    // Process children
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        stack.push(child);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
      }
    });
  }
}

/**
 * Check if sanitized HTML has any meaningful content
 * @param {string} sanitizedHtml - Sanitized HTML string
 * @returns {boolean} True if has content, false if empty or only whitespace
 */
export function hasHtmlContent(sanitizedHtml) {
  const temp = document.createElement('div');
  temp.innerHTML = sanitizedHtml;
  // Check if there's any text content or element nodes
  return temp.textContent.trim().length > 0 || temp.querySelector('*') !== null;
}

/**
 * Sanitize HTML and check if it has content in one step
 * @param {string} html - Raw HTML content
 * @returns {{sanitized: string, hasContent: boolean}}
 */
export function sanitizeAndCheck(html) {
  // Skip simple line breaks (only <br> tags with whitespace/nbsp)
  if (/^(?:<br\s*\/?>(?:\s|&nbsp;)*)+$/i.test(html)) {
    return { sanitized: '', hasContent: false };
  }

  const sanitized = sanitizeHtml(html);
  const hasContent = hasHtmlContent(sanitized);
  return { sanitized, hasContent };
}
