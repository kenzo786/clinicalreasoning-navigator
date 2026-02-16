import type { ChoiceToken, UnresolvedToken, VariableToken } from "@/lib/tokenParser";

export type TokenFieldControl = "radio" | "checkboxes" | "text";

export interface ChoiceFieldOption {
  value: string;
  label: string;
}

export interface ChoiceFieldModel {
  key: string;
  raw: string;
  label: string;
  control: "radio" | "checkboxes";
  options: ChoiceFieldOption[];
  defaultValue: string;
  normalValue: string;
}

export interface VariableFieldModel {
  key: string;
  raw: string;
  label: string;
  control: "text";
  placeholder: string;
}

export type TokenFieldModel = ChoiceFieldModel | VariableFieldModel;

interface TokenContext {
  beforeLine: string;
  nearbyText: string;
  trailingText: string;
}

function toTitleCase(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  return trimmed
    .split(" ")
    .map((part) => {
      if (part.toUpperCase() === part && part.length > 1) return part;
      if (part.includes("/")) {
        return part
          .split("/")
          .map((slice) => (slice ? slice[0].toUpperCase() + slice.slice(1).toLowerCase() : slice))
          .join("/");
      }
      return part[0].toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function normalizeOptionLabel(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) return cleaned;
  if (/^[a-z0-9].*/.test(cleaned) && cleaned === cleaned.toLowerCase()) {
    return cleaned[0].toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

function isNumericOption(option: string): boolean {
  return /^\d+\+?$/.test(option.trim());
}

function extractTokenContext(text: string, raw: string): TokenContext {
  const index = text.indexOf(raw);
  if (index < 0) {
    return { beforeLine: "", nearbyText: text.slice(0, 120), trailingText: "" };
  }
  const before = text.slice(Math.max(0, index - 120), index);
  const after = text.slice(index + raw.length, index + raw.length + 120);
  const lastLineBreak = before.lastIndexOf("\n");
  const beforeLine = before.slice(lastLineBreak + 1).trim();
  return {
    beforeLine,
    nearbyText: `${before} ${after}`.trim(),
    trailingText: after.trim(),
  };
}

function inferExplicitLabel(beforeLine: string): string | null {
  if (!beforeLine) return null;
  const cleaned = beforeLine.replace(/^[-*]\s*/, "").trim();
  const colonMatch = cleaned.match(/([A-Za-z][A-Za-z0-9\s/()+-]{2,80})\s*:\s*$/);
  if (colonMatch?.[1]) return toTitleCase(colonMatch[1]);

  const bulletMatch = cleaned.match(/([A-Za-z][A-Za-z0-9\s/()+-]{2,80})\s*$/);
  if (bulletMatch?.[1] && cleaned.endsWith("-")) return toTitleCase(bulletMatch[1]);
  return null;
}

function inferDurationUnit(context: TokenContext): string | null {
  const source = `${context.beforeLine} ${context.trailingText}`.toLowerCase();
  if (/\bdays?\b/.test(source)) return "days";
  if (/\bweeks?\b/.test(source)) return "weeks";
  if (/\bmonths?\b/.test(source)) return "months";
  if (/\bhours?\b/.test(source)) return "hours";
  return null;
}

function inferChoiceLabel(token: ChoiceToken, context: TokenContext): string {
  const explicit = inferExplicitLabel(context.beforeLine);
  if (explicit) return explicit;

  if (token.options.every((option) => isNumericOption(option))) {
    if (inferDurationUnit(context)) {
      return "Duration (for documentation)";
    }
    return "Record value (for documentation)";
  }

  if (token.options.length === 2) {
    const lowered = token.options.map((option) => option.toLowerCase());
    if (
      lowered.some((option) => option.includes("yes")) &&
      lowered.some((option) => option.includes("no"))
    ) {
      return "Clinical finding";
    }
    if (
      lowered.some((option) => option.includes("present")) &&
      lowered.some((option) => option.includes("absent"))
    ) {
      return "Clinical finding";
    }
  }

  return "Select documentation value";
}

function inferChoiceControl(token: ChoiceToken, label: string): "radio" | "checkboxes" {
  const labelLower = label.toLowerCase();
  const looksLikeRedFlagList =
    /red flag|warning sign|features present|red flags present/.test(labelLower) &&
    token.options.length >= 3 &&
    token.options.every(
      (option) => !/\bno\b|\bnone\b|\babsent\b|\bnegative\b/i.test(option)
    );
  return looksLikeRedFlagList ? "checkboxes" : "radio";
}

function inferVariableLabel(token: VariableToken, context: TokenContext): string {
  const explicit = inferExplicitLabel(context.beforeLine);
  if (explicit) return explicit;
  return toTitleCase(token.name.replace(/[_-]+/g, " "));
}

function inferVariablePlaceholder(label: string, tokenName: string): string {
  const lower = `${label} ${tokenName}`.toLowerCase();
  if (lower.includes("duration")) return "e.g., 3 days";
  if (lower.includes("factor")) return "e.g., Lifting heavy boxes";
  if (lower.includes("degree")) return "e.g., 45";
  if (lower.includes("finding")) return "e.g., Reduced sensation over L5";
  if (lower.includes("score")) return "Record manually";
  return `Enter ${label.toLowerCase()}`;
}

function formatChoiceOptionLabel(option: string, context: TokenContext): string {
  const cleaned = option.trim().replace(/\s+/g, " ");
  if (!cleaned) return cleaned;

  if (isNumericOption(cleaned)) {
    const unit = inferDurationUnit(context);
    if (unit) return `${cleaned} ${unit}`;
  }

  return normalizeOptionLabel(cleaned);
}

function selectNormalOption(token: ChoiceToken): string {
  const rankedMatchers = [
    /\bnormal\b/i,
    /\bnegative\b/i,
    /\bneg\b/i,
    /\bnone\b/i,
    /\babsent\b/i,
    /\bintact\b/i,
    /\bfull\b/i,
    /\bnon-tender\b/i,
    /\bnot tested\b/i,
    /^no\b/i,
  ];
  for (const matcher of rankedMatchers) {
    const match = token.options.find((option) => matcher.test(option));
    if (match) return match;
  }
  return token.options[token.defaultIndex] ?? token.options[0] ?? "";
}

export function buildTokenFieldModels(text: string, tokens: UnresolvedToken[]): TokenFieldModel[] {
  return tokens.map((token, index) => {
    const context = extractTokenContext(text, token.raw);
    if (token.type === "choice") {
      const label = inferChoiceLabel(token, context);
      return {
        key: `${token.raw}-${index}`,
        raw: token.raw,
        label,
        control: inferChoiceControl(token, label),
        options: token.options.map((option) => ({
          value: option,
          label: formatChoiceOptionLabel(option, context),
        })),
        defaultValue: token.options[token.defaultIndex] ?? token.options[0] ?? "",
        normalValue: selectNormalOption(token),
      } satisfies ChoiceFieldModel;
    }
    const label = inferVariableLabel(token, context);
    return {
      key: `${token.raw}-${index}`,
      raw: token.raw,
      label,
      control: "text",
      placeholder: inferVariablePlaceholder(label, token.name),
    } satisfies VariableFieldModel;
  });
}
