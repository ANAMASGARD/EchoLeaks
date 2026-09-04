export function maskEmail(email: string | null | undefined) {
  if (!email) return null;

  const separatorIndex = email.indexOf("@");
  const localPart = email.slice(0, separatorIndex);
  const domain = email.slice(separatorIndex + 1);

  if (
    email !== email.trim() ||
    separatorIndex <= 0 ||
    separatorIndex !== email.lastIndexOf("@") ||
    !domain.includes(".") ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    localPart.includes("..") ||
    domain.includes("..") ||
    /\s/.test(email)
  ) {
    return null;
  }

  return `${localPart[0]}•••@${domain}`;
}
