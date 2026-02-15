import { resolveDateToken } from "./dateHelpers";

export interface ChoiceToken {
  type: "choice";
  raw: string;
  options: string[];
  defaultIndex: number;
}

export interface VariableToken {
  type: "variable";
  raw: string;
  name: string;
}

export type UnresolvedToken = ChoiceToken | VariableToken;

const CHOICE_RE = /\{([^}]+)\}/g;
const VARIABLE_RE = /\[([^\]]+)\]/g;
const DATE_RE = /@date\(\+\d+[dwm]\)/g;

/**
 * Resolve date tokens automatically, extract choice & variable tokens for modal resolution.
 */
export function parseTokens(content: string): {
  textWithDatesResolved: string;
  unresolvedTokens: UnresolvedToken[];
} {
  // 1. Resolve date tokens first
  let text = content.replace(DATE_RE, (match) => resolveDateToken(match));

  // 2. Extract choice tokens
  const unresolvedTokens: UnresolvedToken[] = [];
  const seenRawTokens = new Set<string>();

  const choiceMatches = [...text.matchAll(CHOICE_RE)];
  for (const m of choiceMatches) {
    const raw = m[0];
    if (seenRawTokens.has(raw)) continue;
    const inner = m[1];
    const parts = inner.split("|");
    let defaultIndex = 0;
    const options = parts.map((p, i) => {
      if (p.endsWith("*")) {
        defaultIndex = i;
        return p.slice(0, -1);
      }
      return p;
    });
    unresolvedTokens.push({ type: "choice", raw, options, defaultIndex });
    seenRawTokens.add(raw);
  }

  // 3. Extract variable tokens
  const varMatches = [...text.matchAll(VARIABLE_RE)];
  for (const m of varMatches) {
    const raw = m[0];
    if (seenRawTokens.has(raw)) continue;
    unresolvedTokens.push({ type: "variable", raw, name: m[1] });
    seenRawTokens.add(raw);
  }

  return { textWithDatesResolved: text, unresolvedTokens };
}

/**
 * Apply resolved values to token placeholders in text.
 */
export function applyResolutions(
  text: string,
  resolutions: Map<string, string>
): string {
  let result = text;
  for (const [raw, value] of resolutions) {
    result = result.split(raw).join(value);
  }
  return result;
}
