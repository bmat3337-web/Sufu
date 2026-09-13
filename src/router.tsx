import { useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from "react";

export interface Route {
  /** "/explore", "/provider/bless-plumbing", or a legacy anchor id like "how-it-works" */
  path: string;
  params: URLSearchParams;
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = raw.split("?");
  return { path: path || "/", params: new URLSearchParams(query) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return route;
}

export function navigate(to: string) {
  if (window.location.hash === `#${to}`) return;
  window.location.hash = to;
}

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children: ReactNode;
}

/** Renders an <a href="#/..."> so middle-click/open-in-new-tab keeps working. */
export function Link({ to, children, ...rest }: LinkProps) {
  return (
    <a href={`#${to}`} {...rest}>
      {children}
    </a>
  );
}
