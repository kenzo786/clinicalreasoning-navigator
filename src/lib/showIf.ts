/**
 * Evaluate a showIf expression against structured responses.
 * Supported operators: ==, !=, contains, &&, ||
 * 
 * Examples:
 *   "fever == yes"
 *   "duration != acute && severity == severe"
 *   "symptoms contains dysuria"
 */
export function evaluateShowIf(
  expression: string,
  responses: Record<string, string | number | boolean | string[]>
): boolean {
  if (!expression || expression.trim() === "") return true;

  // Split on || first (lower precedence)
  if (expression.includes("||")) {
    return expression.split("||").some((part) => evaluateShowIf(part.trim(), responses));
  }

  // Split on && (higher precedence)
  if (expression.includes("&&")) {
    return expression.split("&&").every((part) => evaluateShowIf(part.trim(), responses));
  }

  // Single condition
  const normalizeTarget = (value: string): string => {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  };

  const containsMatch = expression.match(/^(\w[\w.-]*)\s+contains\s+(.+)$/);
  if (containsMatch) {
    const fieldVal = responses[containsMatch[1]];
    const target = normalizeTarget(containsMatch[2]);
    if (Array.isArray(fieldVal)) return fieldVal.includes(target);
    return String(fieldVal ?? "").includes(target);
  }

  const neqMatch = expression.match(/^(\w[\w.-]*)\s*!=\s*(.+)$/);
  if (neqMatch) {
    const fieldVal = String(responses[neqMatch[1]] ?? "");
    return fieldVal !== normalizeTarget(neqMatch[2]);
  }

  const eqMatch = expression.match(/^(\w[\w.-]*)\s*==\s*(.+)$/);
  if (eqMatch) {
    const fieldVal = String(responses[eqMatch[1]] ?? "");
    return fieldVal === normalizeTarget(eqMatch[2]);
  }

  return true;
}
