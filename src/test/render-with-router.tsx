import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

export async function renderWithRouter(ui: ReactElement) {
  const rootRoute = createRootRoute({ component: Outlet });
  const testRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => ui,
  });
  const history = createMemoryHistory({ initialEntries: ["/"] });
  const router = createRouter({ routeTree: rootRoute.addChildren([testRoute]), history });

  await router.load();

  return {
    ...render(<RouterProvider router={router} />),
    history,
    router,
  };
}
