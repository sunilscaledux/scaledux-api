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

const ANY_HTML_TAG = /<[^>]*>/;

/** Joi custom validator that rejects ALL HTML tags in plain text fields. */
export function rejectAllHtml(value: string, helpers: Joi.CustomHelpers) {
  if (!value) return value;
  if (ANY_HTML_TAG.test(value)) {
    return helpers.error("string.noHtml");
  }
  return value;
}

export const noHtmlMessages = {
  "string.noHtml": "{{#label}} must not contain HTML tags",
};

const SAFE_URL_PATTERN = /^(www\.)?[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}(\/[a-zA-Z0-9._~:/?#\[\]@!$&'()*+,;=%-]*)?$/;
const SQL_PATTERN = /('|--|;|\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC)\b)/i;

/** Joi custom validator for safe website URLs. Accepts: www.scaledux.com or scaledux.com */
export function validateSafeUrl(value: string, helpers: Joi.CustomHelpers) {
  if (!value || value.trim() === '') return value;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return helpers.error("string.urlNoProtocol");
  }
  if (ANY_HTML_TAG.test(trimmed)) {
    return helpers.error("string.urlNoHtml");
  }
  if (JS_PROTOCOL_PATTERN.test(trimmed)) {
    return helpers.error("string.urlNoScript");
  }
  if (SQL_PATTERN.test(trimmed)) {
    return helpers.error("string.urlNoSql");
  }
  if (!SAFE_URL_PATTERN.test(trimmed)) {
    return helpers.error("string.urlInvalid");
  }
  return trimmed;
}

export const safeUrlMessages = {
  "string.urlNoProtocol": "Please enter website without http:// or https://",
  "string.urlInvalid": "Invalid website format. Eg: scaledux.com or www.scaledux.com",
  "string.urlNoHtml": "Website must not contain HTML tags",
  "string.urlNoScript": "Website contains invalid characters",
  "string.urlNoSql": "Website contains invalid characters",
};
