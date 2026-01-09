
import * as React from "react";
import { createContext, useCallback, useContext } from "react";

// NOTE: WidgetProvider has been disabled to prevent crashes
// The @bacons/apple-targets package requires additional configuration
// that is not currently set up in this project.

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  const refreshWidget = useCallback(() => {
    console.log("Widget refresh called (currently disabled)");
    // ExtensionStorage.reloadWidget() is disabled
  }, []);

  return (
    <WidgetContext.Provider value={{ refreshWidget }}>
      {children}
    </WidgetContext.Provider>
  );
}

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidget must be used within a WidgetProvider");
  }
  return context;
};
