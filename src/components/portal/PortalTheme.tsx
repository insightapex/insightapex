"use client";

import { createContext, useContext } from "react";
import type { PortalAccent } from "@/components/portal/types";

const PortalThemeContext = createContext<PortalAccent>("admin");

export function PortalThemeProvider({
  accent,
  children,
}: {
  accent: PortalAccent;
  children: React.ReactNode;
}) {
  return <PortalThemeContext.Provider value={accent}>{children}</PortalThemeContext.Provider>;
}

export function usePortalAccent() {
  return useContext(PortalThemeContext);
}
