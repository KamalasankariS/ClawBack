export function cleanDeleted(raw: unknown): boolean {
  if (raw === true || raw === 1 || raw === '1' || raw === 'true') return true;
  return false;
}
