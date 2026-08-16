export function parseTrustedRepairOwnerEmails(configured: string | undefined) {
  return (configured ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isTrustedRepairOwnerEmail(
  email: string | null,
  configured: string | undefined,
) {
  if (!email) return false;
  const allowlist = parseTrustedRepairOwnerEmails(configured);
  return (
    allowlist.length > 0 && allowlist.includes(email.trim().toLowerCase())
  );
}
