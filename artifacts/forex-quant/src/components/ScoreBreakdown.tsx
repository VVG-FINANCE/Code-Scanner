import React from 'react';
import { ScoreBreakdown as IScoreBreakdown } from '@workspace/api-client-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ScoreBreakdownProps {
  breakdown: IScoreBreakdown;
}

const DIMENSIONS = [
  { key: 'priceAction', label: 'Price Action', color: 'bg-blue-500' },
  { key: 'marketStructure', label: 'Structure', color: 'bg-indigo-500' },
  { key: 'technicalIndicators', label: 'Technicals', color: 'bg-cyan-500' },
  { key: 'monteCarlo', label: 'Monte Carlo', color: 'bg-teal-500' },
  { key: 'bayesian', label: 'Bayesian', color: 'bg-green-500' },
  { key: 'machineLearning', label: 'ML Model', color: 'bg-purple-500' },
  { key: 'econophysics', label: 'Econophysics', color: 'bg-rose-500' },
  { key: 'marketRegime', label: 'Regime', color: 'bg-orange-500' },
] as const;

export function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  // Normalize scores to percentages for width
  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  
  return (
    <div className="w-full flex h-3 rounded-full overflow-hidden bg-muted/50 border border-border/50">
      {DIMENSIONS.map((dim) => {
        const val = breakdown[dim.key as keyof IScoreBreakdown];
        const width = total > 0 ? (val / total) * 100 : 0;
        
        return (
          <Tooltip key={dim.key}>
            <TooltipTrigger asChild>
              <div 
                className={`h-full ${dim.color} transition-all duration-500 hover:brightness-125 cursor-help border-r border-background/20 last:border-0`}
                style={{ width: `${width}%`, opacity: val < 30 ? 0.4 : 1 }}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs border-border bg-card">
              <span className="font-semibold">{dim.label}:</span> <span className="font-numeric">{val.toFixed(1)}</span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
