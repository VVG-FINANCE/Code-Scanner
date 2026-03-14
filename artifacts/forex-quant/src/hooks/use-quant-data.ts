import { 
  useGetMarketPrice, 
  useGetTechnicalAnalysis, 
  useGetEconophysicsAnalysis, 
  useGetMarketState, 
  useGetMonteCarloSimulation, 
  useGetSignals, 
  useGetSignalHistory,
  useGetMarketHistory,
  useUpdatePipAdjustment,
  useResolveSignal
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const POLLING_INTERVAL = 10000; // 10 seconds

export function useQuantData() {
  const queryClient = useQueryClient();

  const marketPrice = useGetMarketPrice({
    query: { refetchInterval: POLLING_INTERVAL }
  });

  const technical = useGetTechnicalAnalysis({
    query: { refetchInterval: POLLING_INTERVAL }
  });

  const econophysics = useGetEconophysicsAnalysis({
    query: { refetchInterval: POLLING_INTERVAL }
  });

  const marketState = useGetMarketState({
    query: { refetchInterval: POLLING_INTERVAL }
  });

  const monteCarlo = useGetMonteCarloSimulation({
    query: { refetchInterval: POLLING_INTERVAL }
  });

  const activeSignals = useGetSignals({
    query: { refetchInterval: POLLING_INTERVAL }
  });

  const signalHistory = useGetSignalHistory({ limit: 50 }, {
    query: { refetchInterval: POLLING_INTERVAL * 3 } // Slower poll for history
  });

  const priceHistory = useGetMarketHistory({ limit: 100 }, {
    query: { refetchInterval: POLLING_INTERVAL }
  });

  const updatePipMutation = useUpdatePipAdjustment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/market/price"] });
      }
    }
  });

  const resolveSignalMutation = useResolveSignal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
        queryClient.invalidateQueries({ queryKey: ["/api/signals/history"] });
      }
    }
  });

  return {
    marketPrice,
    technical,
    econophysics,
    marketState,
    monteCarlo,
    activeSignals,
    signalHistory,
    priceHistory,
    updatePipMutation,
    resolveSignalMutation
  };
}
