import React, { useState } from 'react';
import { useQuantData } from '@/hooks/use-quant-data';
import { formatPrice, formatPips, formatPercentage, cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Activity, Settings2, BarChart2, Zap, BrainCircuit, RefreshCw, LineChart, Target } from 'lucide-react';
import { format } from 'date-fns';
import { HalfGauge } from '@/components/Gauges';
import { SignalCard } from '@/components/SignalCard';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MarketStateRegime, ResolveSignalRequestOutcome } from '@workspace/api-client-react';

export default function Dashboard() {
  const { toast } = useToast();
  const { 
    marketPrice, technical, econophysics, marketState, monteCarlo, 
    activeSignals, signalHistory, priceHistory, updatePipMutation, resolveSignalMutation 
  } = useQuantData();

  const [pipInput, setPipInput] = useState("");

  const handlePipUpdate = () => {
    const val = parseFloat(pipInput);
    if (isNaN(val)) return;
    updatePipMutation.mutate({ data: { pips: val } }, {
      onSuccess: () => {
        toast({ title: "Pip adjustment applied", description: `Offset set to ${val} pips` });
        setPipInput("");
      }
    });
  };

  const handleResolveSignal = (id: number, outcome: string) => {
    resolveSignalMutation.mutate({ id, data: { outcome: outcome as ResolveSignalRequestOutcome } }, {
      onSuccess: () => {
        toast({ title: "Signal updated", description: `Marked as ${outcome}` });
      }
    });
  };

  // Safe data extraction with fallbacks
  const price = marketPrice.data;
  const tech = technical.data;
  const econ = econophysics.data;
  const state = marketState.data;
  const mc = monteCarlo.data;
  const signals = activeSignals.data?.signals || [];
  const history = signalHistory.data?.signals || [];
  const chartData = priceHistory.data?.data || [];

  const isUp = (price?.pipChange || 0) >= 0;

  const regimeColors: Record<MarketStateRegime, string> = {
    trending_up: "bg-success/20 text-success border-success/40",
    trending_down: "bg-destructive/20 text-destructive border-destructive/40",
    ranging: "bg-warning/20 text-warning border-warning/40",
    volatile: "bg-purple-500/20 text-purple-400 border-purple-500/40",
    breakout: "bg-primary/20 text-primary border-primary/40",
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 overflow-x-hidden selection:bg-primary/30">
      
      {/* Top Navigation / Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Activity className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight flex items-center gap-2">
                EUR/USD <span className="text-muted-foreground font-normal text-sm">Quant Analyzer</span>
              </h1>
              {price && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> {format(new Date(price.timestamp), 'HH:mm:ss')}</span>
                  <span>•</span>
                  <span>{price.source}</span>
                </div>
              )}
            </div>
          </div>

          {price && (
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-3xl font-numeric font-extrabold tracking-tighter drop-shadow-md",
                    isUp ? "text-success" : "text-destructive"
                  )}>
                    {formatPrice(price.adjustedPrice)}
                  </span>
                  <div className={cn(
                    "flex flex-col items-start text-sm font-numeric font-bold",
                    isUp ? "text-success" : "text-destructive"
                  )}>
                    <span className="flex items-center">
                      {isUp ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                      {formatPips(price.pipChange)}
                    </span>
                    <span className="text-xs opacity-80">{formatPercentage(price.pipChangePercent)}</span>
                  </div>
                </div>
              </div>

              <div className="h-10 w-px bg-border/80 hidden sm:block"></div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 bg-card border-border/50 hover:bg-accent/10 hover:text-primary hover:border-primary/50 transition-colors">
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 bg-card border-border p-4 shadow-xl">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                      <Settings2 className="w-4 h-4" /> System Settings
                    </h4>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Pip Adjustment Offset</label>
                      <div className="flex gap-2">
                        <Input 
                          className="bg-background font-numeric h-8" 
                          placeholder="e.g. +0.5" 
                          value={pipInput}
                          onChange={e => setPipInput(e.target.value)}
                        />
                        <Button size="sm" className="h-8" onClick={handlePipUpdate} disabled={updatePipMutation.isPending}>
                          Set
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Compensates for broker spread or API lag.</p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Top Mini Chart & State Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-card border border-border/50 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
            <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <LineChart className="w-4 h-4 text-primary" /> Intraday Structure
              </h3>
              {state && (
                <Badge variant="outline" className={cn("uppercase tracking-wider font-bold", regimeColors[state.regime])}>
                  {state.regime.replace('_', ' ')}
                </Badge>
              )}
            </div>
            
            <div className="h-40 w-full relative z-10">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="timestamp" hide />
                    <YAxis domain={['auto', 'auto']} hide />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', fontSize: '12px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontFamily: 'JetBrains Mono' }}
                      labelFormatter={() => ''}
                    />
                    <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                    {state?.supportLevels?.[0] && (
                      <ReferenceLine y={state.supportLevels[0]} stroke="hsl(var(--success))" strokeDasharray="3 3" opacity={0.5} />
                    )}
                    {state?.resistanceLevels?.[0] && (
                      <ReferenceLine y={state.resistanceLevels[0]} stroke="hsl(var(--destructive))" strokeDasharray="3 3" opacity={0.5} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Loading chart...</div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-lg flex flex-col justify-center">
             <h3 className="text-sm font-semibold text-muted-foreground mb-4 text-center">Price Distribution (MC)</h3>
             {mc && (
               <HalfGauge 
                 value={mc.probabilityUp * 100} 
                 label="% Prob Up" 
                 colorClass={mc.probabilityUp > 0.5 ? "text-success" : "text-destructive"} 
                 formatValue={v => `${v.toFixed(1)}%`}
               />
             )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: ACTIVE SIGNALS */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> 
                Active Opportunities
              </h2>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {signals.length} Active
              </Badge>
            </div>
            
            <div className="space-y-4">
              {activeSignals.isLoading && <div className="text-muted-foreground text-sm p-4 text-center border border-dashed border-border rounded-xl">Analyzing market structure...</div>}
              {signals.length === 0 && !activeSignals.isLoading && (
                <div className="bg-card border border-dashed border-border/60 rounded-xl p-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Activity className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-medium mb-1">No active high-conviction signals</p>
                  <p className="text-xs text-muted-foreground">Waiting for optimal alignment across all 8 models.</p>
                </div>
              )}
              {signals.map((sig) => (
                <SignalCard key={sig.id} signal={sig} onResolve={handleResolveSignal} />
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: ANALYTICS */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Technicals */}
            <div className="bg-card border border-border/50 rounded-xl p-5 shadow-md">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 border-b border-border pb-2">
                <BarChart2 className="w-4 h-4 text-cyan-500" /> Technicals
              </h3>
              {tech ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">RSI (14)</span>
                    <Badge variant="outline" className={cn(
                      "font-numeric",
                      tech.rsi > 70 ? "text-destructive border-destructive" : tech.rsi < 30 ? "text-success border-success" : "text-muted-foreground"
                    )}>{tech.rsi.toFixed(1)} - {tech.rsiSignal}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">EMA Trend</span>
                    <span className={cn("text-xs font-bold uppercase", tech.emaSignal.includes('bullish') ? "text-success" : "text-destructive")}>
                      {tech.emaSignal.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Volatility</span>
                    <span className="font-numeric text-sm">{tech.volatility.toFixed(4)}</span>
                  </div>
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase mb-2">Detected Patterns</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tech.priceActionPatterns.length > 0 ? tech.priceActionPatterns.map(p => (
                        <Badge key={p} variant="secondary" className="text-[10px] bg-accent/10 text-accent border-accent/20 rounded-sm">
                          {p.replace('_', ' ')}
                        </Badge>
                      )) : <span className="text-xs text-muted-foreground">None</span>}
                    </div>
                  </div>
                </div>
              ) : <div className="h-32 animate-pulse bg-muted rounded-md" />}
            </div>

            {/* Econophysics */}
            <div className="bg-card border border-border/50 rounded-xl p-5 shadow-md">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 border-b border-border pb-2">
                <BrainCircuit className="w-4 h-4 text-purple-500" /> Econophysics
              </h3>
              {econ ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Hurst Exponent</span>
                    <div className="flex flex-col items-end">
                      <span className="font-numeric text-sm">{econ.hurstExponent.toFixed(3)}</span>
                      <span className="text-[9px] text-muted-foreground uppercase">{econ.hurstInterpretation}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Market Entropy</span>
                    <span className="font-numeric text-sm">{econ.marketEntropy.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Vol Clustering</span>
                    <span className="font-numeric text-sm">{econ.volatilityClustering.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Z-Score</span>
                    <Badge variant="outline" className={cn(
                      "font-numeric",
                      Math.abs(econ.zScore) > 2 ? (econ.zScore > 0 ? "text-success border-success" : "text-destructive border-destructive") : ""
                    )}>{econ.zScore.toFixed(2)}</Badge>
                  </div>
                </div>
              ) : <div className="h-32 animate-pulse bg-muted rounded-md" />}
            </div>

            {/* Monte Carlo */}
            <div className="bg-card border border-border/50 rounded-xl p-5 shadow-md sm:col-span-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 border-b border-border pb-2">
                <Zap className="w-4 h-4 text-yellow-500" /> Stochastic Monte Carlo ({mc?.simulations || 0} Paths)
              </h3>
              {mc ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-2 rounded bg-background/50 border border-border/30">
                      <span className="text-xs text-muted-foreground">Expected 1H</span>
                      <span className="font-numeric text-primary font-bold">{formatPrice(mc.expectedPrice1h)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-background/50 border border-border/30">
                      <span className="text-xs text-muted-foreground">Expected 4H</span>
                      <span className="font-numeric text-primary font-bold">{formatPrice(mc.expectedPrice4h)}</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-[10px] text-muted-foreground uppercase mb-1 block">95% Confidence Interval</span>
                      <div className="flex items-center justify-between text-xs font-numeric bg-muted/30 p-2 rounded border border-border/30">
                        <span className="text-destructive/80">{formatPrice(mc.confidenceInterval95.low)}</span>
                        <span className="text-muted-foreground">↔</span>
                        <span className="text-success/80">{formatPrice(mc.confidenceInterval95.high)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-32 flex items-end gap-1 opacity-80">
                    {/* Fake histogram visual from the array data */}
                    {mc.priceDistribution.map((val, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-primary/40 hover:bg-primary/80 transition-colors rounded-t-sm"
                        style={{ height: `${(val / Math.max(...mc.priceDistribution)) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              ) : <div className="h-32 animate-pulse bg-muted rounded-md" />}
            </div>

          </div>
        </div>

        {/* History Table */}
        <div className="pt-8">
          <h2 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
            History Ledger
          </h2>
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Time</th>
                    <th className="px-4 py-3 font-semibold">Dir</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Entry</th>
                    <th className="px-4 py-3 font-semibold">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {history.length > 0 ? history.map(sig => (
                    <tr key={sig.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {format(new Date(sig.createdAt), 'MMM dd, HH:mm')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn("font-bold text-xs", sig.direction === 'long' ? "text-success" : "text-destructive")}>
                          {sig.direction.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-numeric">
                        {sig.score.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-numeric">
                        {formatPrice(sig.entry1)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className={cn(
                          "text-[10px] uppercase",
                          sig.status.includes('tp') ? "border-success/30 text-success bg-success/10" :
                          sig.status.includes('sl') ? "border-destructive/30 text-destructive bg-destructive/10" :
                          "border-border text-muted-foreground bg-muted"
                        )}>
                          {sig.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No historical data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
