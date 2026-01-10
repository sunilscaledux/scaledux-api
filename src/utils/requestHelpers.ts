/**
 * Safely extract a string parameter from req.params or req.query
 * Handles the case where the value might be string | string[]
 */
export function getStringParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}

/**
 * Safely extract and parse an integer parameter from req.params or req.query
 */
export function getIntParam(value: string | string[] | undefined): number {
  const stringValue = getStringParam(value);
  const parsed = parseInt(stringValue, 10);
  return isNaN(parsed) ? 0 : parsed;
}
