export type ProfileDraft = Readonly<{
  firstName: string;
  email: string;
  whatsapp: string;
  password: string;
}>;

export type ProfileField = keyof ProfileDraft;
export type ProfileErrors = Partial<Record<ProfileField, string>>;

export const profileFieldOrder: readonly ProfileField[] = [
  "firstName",
  "email",
  "whatsapp",
  "password",
];

export function validateProfileDraft(profile: ProfileDraft): ProfileErrors {
  const errors: ProfileErrors = {};
  if (!profile.firstName.trim()) errors.firstName = "Enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!/^\+?[0-9][0-9\s()-]{6,19}$/.test(profile.whatsapp.trim())) {
    errors.whatsapp = "Enter a valid WhatsApp number.";
  }
  if (profile.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }
  return errors;
}
