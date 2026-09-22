const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "fabianomauro@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const isAdminEmail = (email: string) => ADMIN_EMAILS.includes(email.trim().toLowerCase());
