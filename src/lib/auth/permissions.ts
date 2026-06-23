export function isClient(role: string) {
  return role === "CLIENT";
}

export function isIntern(role: string) {
  return role === "INTERN";
}

export function isStaff(role: string) {
  return role === "ADMIN" || role === "TEAM";
}

export function canLogOutreach(role: string) {
  return isStaff(role) || isIntern(role);
}

export function canViewRevenue(role: string) {
  return isStaff(role);
}

export const INTERN_ALLOWED_PATH_PREFIXES = [
  "/sales/outreach",
  "/api/outreach",
  "/api/auth",
  "/login",
];

export function isInternAllowedPath(pathname: string) {
  return INTERN_ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
