export function normalizePdfText(value: string): string {
  if (!value) {
    return "";
  }

  return value
    .replace(/[μµ]/g, "my")
    .replace(/[Øø]/g, "diameter");
}
