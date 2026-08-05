// Ensures TanStack Start's route augmentation (the `server` option on
// createFileRoute) is always loaded, even by checkers that skip the
// `export type *` re-export in @tanstack/start-client-core.
/// <reference types="@tanstack/react-start" />
import "@tanstack/start-client-core/dist/esm/serverRoute.js";

export {};
