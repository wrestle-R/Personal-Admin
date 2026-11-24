export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^\s*[=+@\-\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
