/** Maps 1-based week numbers to playoff round names. */
const PLAYOFF_LABELS: Record<number, string> = {
  19: "Wildcard",
  20: "Divisional",
  21: "Conference",
  22: "Pro Bowl",
  23: "Super Bowl",
};

/** Short labels for compact contexts (sidebar, transaction chips, etc.). */
const PLAYOFF_LABELS_SHORT: Record<number, string> = {
  19: "WC",
  20: "DIV",
  21: "CONF",
  22: "PB",
  23: "SB",
};

/**
 * Full week label.
 * Regular season → "Week 5"
 * Playoffs → "Wildcard", "Divisional", "Conference", "Super Bowl"
 */
export function getWeekLabel(week: number): string {
  return PLAYOFF_LABELS[week] ?? `Week ${week}`;
}

/**
 * Short week label for compact/inline contexts.
 * Regular season → "W5"
 * Playoffs → "WC", "DIV", "CONF", "SB"
 */
export function getWeekLabelShort(week: number): string {
  return PLAYOFF_LABELS_SHORT[week] ?? `W${week}`;
}
