const CONTROL_CHARACTERS_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const DINGBATS_PATTERN = /[\u2700-\u27BF]/g;
const REPLACEMENT_RULES: Array<[RegExp, string]> = [
  [/\u00A0/g, " "],
  [/\u2013|\u2014/g, "-"],
  [/\u2026/g, "..."],
];

export function sanitizePdfText(value: string): string {
  if (!value) {
    return "";
  }

  let sanitized = value;

  for (const [pattern, replacement] of REPLACEMENT_RULES) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  sanitized = sanitized.replace(DINGBATS_PATTERN, " ");
  sanitized = sanitized.replace(CONTROL_CHARACTERS_PATTERN, " ");
  sanitized = sanitized.replace(/[ \t]{2,}/g, " ");

  return sanitized;
}

export function sanitizePdfTextArray(values: string[]): string[] {
  return values.map((value) => sanitizePdfText(value));
}
