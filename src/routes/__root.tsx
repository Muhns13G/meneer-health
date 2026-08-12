import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import { PUBLIC_FAVICON, PUBLIC_SOCIAL_IMAGE } from "@/lib/public-metadata";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Meneer — Back to your best." },
      {
        name: "description",
        content:
          "Back to your best. South African men's telehealth with real HPCSA-registered doctors. Hair loss, ED, weight, TRT — discreetly delivered to your door.",
      },
      { name: "application-name", content: "Meneer" },
      { name: "author", content: "Meneer" },
      { property: "og:title", content: "Meneer — Back to your best." },
      {
        property: "og:description",
        content: "Real doctors, real prescriptions, dropped at your door. Back to your best.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: PUBLIC_SOCIAL_IMAGE.url },
      { property: "og:image:secure_url", content: PUBLIC_SOCIAL_IMAGE.secureUrl },
      { property: "og:image:type", content: PUBLIC_SOCIAL_IMAGE.type },
      { property: "og:image:width", content: PUBLIC_SOCIAL_IMAGE.width },
      { property: "og:image:height", content: PUBLIC_SOCIAL_IMAGE.height },
      { property: "og:image:alt", content: PUBLIC_SOCIAL_IMAGE.alt },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Meneer — Back to your best." },
      {
        name: "twitter:description",
        content: "Real doctors, real prescriptions, dropped at your door. Back to your best.",
      },
      { name: "twitter:image", content: PUBLIC_SOCIAL_IMAGE.url },
      { name: "twitter:image:alt", content: PUBLIC_SOCIAL_IMAGE.alt },
    ],
    links: [
      { rel: "icon", href: PUBLIC_FAVICON.href, type: PUBLIC_FAVICON.type },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
