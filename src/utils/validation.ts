import Joi from "joi";

/**
 * Regex to detect dangerous HTML: script, iframe, object, embed, style, form,
 * input, link, meta, base tags, event handlers (on*=), and javascript: protocol.
 * Safe formatting tags from Tiptap (p, strong, em, ul, ol, li, a, br, h1-h6,
 * blockquote, code, pre, span, div, img) are allowed.
 */
const DANGEROUS_HTML_PATTERN =
  /<\s*\/?\s*(script|iframe|object|embed|style|form|input|link|meta|base)\b[^>]*>/i;
const EVENT_HANDLER_PATTERN = /\bon\w+\s*=/i;
const JS_PROTOCOL_PATTERN = /javascript\s*:/i;

/** Joi custom validator that rejects dangerous HTML in string fields. */
export function rejectDangerousHtml(value: string, helpers: Joi.CustomHelpers) {
  if (!value) return value;
  if (DANGEROUS_HTML_PATTERN.test(value)) {
    return helpers.error("string.dangerousHtml");
  }
  if (EVENT_HANDLER_PATTERN.test(value)) {
    return helpers.error("string.dangerousHtml");
  }
  if (JS_PROTOCOL_PATTERN.test(value)) {
    return helpers.error("string.dangerousHtml");
  }
  return value;
}

export const dangerousHtmlMessages = {
  "string.dangerousHtml": "{{#label}} contains disallowed HTML content",
};
