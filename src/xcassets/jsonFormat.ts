export function stringifyContentsJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n'
}

export function parseContentsJson(
  text: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
