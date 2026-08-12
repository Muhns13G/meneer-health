import {
  profileFieldOrder,
  type ProfileDraft,
  type ProfileErrors,
  type ProfileField,
} from "@/domain/journey/profile-form";

export function ProfileErrorSummary({ errors }: { errors: ProfileErrors }) {
  const entries = profileFieldOrder.flatMap((field) =>
    errors[field] ? [{ field, message: errors[field] }] : [],
  );
  if (entries.length === 0) return null;

  return (
    <div
      role="alert"
      aria-labelledby="profile-error-title"
      className="mt-6 rounded-xl border border-red-400/40 bg-red-950/20 p-4"
    >
      <h3 id="profile-error-title" className="font-medium text-foreground">
        Check the highlighted details
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-100">
        {entries.map(({ field, message }) => (
          <li key={field}>
            <a href={`#profile-${field}`} className="underline underline-offset-2">
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProfileFields({
  profile,
  errors,
  onChange,
  nameLabel = "First name",
  nameAutocomplete = "given-name",
}: {
  profile: ProfileDraft;
  errors: ProfileErrors;
  onChange: (field: ProfileField, value: string) => void;
  nameLabel?: "First name" | "Full name";
  nameAutocomplete?: "given-name" | "name";
}) {
  const fields = [
    {
      field: "firstName",
      label: nameLabel,
      type: "text",
      autoComplete: nameAutocomplete,
      inputMode: "text",
      maxLength: 50,
      placeholder: nameLabel === "Full name" ? undefined : "Themba",
      description: "Required.",
    },
    {
      field: "email",
      label: "Email",
      type: "email",
      autoComplete: "email",
      inputMode: "email",
      maxLength: 255,
      placeholder: "you@private.co.za",
      description: "Required. Use an address you can access privately.",
    },
    {
      field: "whatsapp",
      label: "WhatsApp number",
      type: "tel",
      autoComplete: "tel",
      inputMode: "tel",
      maxLength: 20,
      placeholder: "+27 82 000 0000",
      description: "Required. Include the country code when outside South Africa.",
    },
    {
      field: "password",
      label: "Password",
      type: "password",
      autoComplete: "new-password",
      inputMode: "text",
      maxLength: 100,
      placeholder: "At least 8 characters",
      description: "Required. Use at least 8 characters.",
    },
  ] as const;
  const inputClass =
    "mt-2 w-full rounded-xl border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold aria-invalid:border-red-300";

  return (
    <div className="mt-8 grid gap-5">
      {fields.map((field) => {
        const inputId = `profile-${field.field}`;
        const descriptionId = `${inputId}-description`;
        const errorId = `${inputId}-error`;
        const error = errors[field.field];
        return (
          <div key={field.field}>
            <label htmlFor={inputId} className="block text-sm text-muted-foreground">
              {field.label} <span aria-hidden="true">*</span>
            </label>
            <p id={descriptionId} className="mt-1 text-xs text-muted-foreground">
              {field.description}
            </p>
            <input
              id={inputId}
              name={field.field}
              required
              type={field.type}
              autoComplete={field.autoComplete}
              inputMode={field.inputMode}
              value={profile[field.field]}
              maxLength={field.maxLength}
              onChange={(event) => onChange(field.field, event.target.value)}
              aria-invalid={error ? "true" : undefined}
              aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
              className={inputClass}
              placeholder={field.placeholder}
            />
            {error && (
              <p id={errorId} className="mt-2 text-sm text-red-200">
                {error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
