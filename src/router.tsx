import { createRouter } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { DefaultErrorComponent } from "@/components/DefaultErrorComponent";
import { routeTree } from "./routeTree.gen";

// The stream captures this value before the render callback runs. Initialise it
// when constructing the request router, then reuse the SSR meta value on hydration.
const getSsrNonce = createIsomorphicFn()
  .server(() => crypto.randomUUID().replaceAll("-", ""))
  .client(() => document.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]')?.content);

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
    ssr: { nonce: getSsrNonce() },
  });

  return router;
};
