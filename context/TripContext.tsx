import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useTrip } from "@/hooks/useTrip";

type TripContextType = ReturnType<typeof useTrip>;

const TripContext = createContext<TripContextType | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const tripState = useTrip();

  // Initialize data on mount to ensure database is set up before screens render
  useEffect(() => {
    tripState.loadData().catch((error) => {
      console.error("[TripProvider] Critical error loading data on mount:", error);
    });
  }, []);

  return (
    <TripContext.Provider value={tripState}>{children}</TripContext.Provider>
  );
}

export function useTripContext() {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error("useTripContext must be used within a TripProvider");
  }
  return context;
}
