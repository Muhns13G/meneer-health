export const GOOGLE_FONTS_STYLESHEET_ORIGIN = "https://fonts.googleapis.com";
export const GOOGLE_FONTS_FILE_ORIGIN = "https://fonts.gstatic.com";

export const GOOGLE_FONTS_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap";

export const PUBLIC_FONT_POLICY = Object.freeze({
  delivery: "approved-external-v1",
  provider: "Google Fonts CSS API",
  families: Object.freeze([
    Object.freeze({ family: "DM Sans", weights: Object.freeze([300, 400, 500, 600, 700]) }),
    Object.freeze({
      family: "Playfair Display",
      weights: Object.freeze([400, 500, 600, 700]),
    }),
  ]),
  display: "swap",
  fallbacks: Object.freeze({
    sans: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    serif: '"Playfair Display", Georgia, serif',
  }),
  reviewTrigger: "before-public-launch-or-nextjs-migration",
});
