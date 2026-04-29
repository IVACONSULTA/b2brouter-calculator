function getSession(cookies) {
  const raw = cookies.get("session")?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export { getSession as g };
