import { format, addDays, addWeeks, addMonths } from "date-fns";

/**
 * Resolve @date(+Nd), @date(+Nw), @date(+Nm) tokens to formatted date strings.
 */
export function resolveDateToken(token: string): string {
  const match = token.match(/@date\(\+(\d+)([dwm])\)/);
  if (!match) return token;

  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const now = new Date();

  let target: Date;
  switch (unit) {
    case "d":
      target = addDays(now, amount);
      break;
    case "w":
      target = addWeeks(now, amount);
      break;
    case "m":
      target = addMonths(now, amount);
      break;
    default:
      return token;
  }

  return format(target, "dd/MM/yyyy");
}
