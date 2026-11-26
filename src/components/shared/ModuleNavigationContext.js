import { createContext, useContext } from "react";

/**
 * Shared navigation context provided by PortalModuleContent so every module's
 * ModuleHeaderToolbar renders a clickable Home >> Module >> Section breadcrumb.
 */
export const ModuleNavigationContext = createContext({
  moduleTitle: "",
  onHome: null,
  onModuleRoot: null
});

export function useModuleNavigation() {
  return useContext(ModuleNavigationContext);
}
