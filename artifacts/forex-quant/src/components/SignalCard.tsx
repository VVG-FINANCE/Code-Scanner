import React from 'react';
import { TradingSignal, TradingSignalDirection } from '@workspace/api-client-react';
import { ScoreCircle } from './Gauges';
import { ScoreBreakdown } from './ScoreBreakdown';
import { formatPrice, cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Target, ShieldAlert, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SignalCardProps {
  signal: TradingSignal;
  onResolve?: (id: number, outcome: string) => void;
}

export function SignalCard({ signal, onResolve }: SignalCardProps) {
  const isLong = signal.direction === TradingSignalDirection.long;
  
  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-primary/30 transition-colors">
      {/* Background ambient glow based on direction */}
      <div className={`absolute -inset-24 opacity-[0.03] blur-2xl pointer-events-none transition-opacity group-hover:opacity-[0.06] ${isLong ? 'bg-success' : 'bg-destructive'}`} />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
            isLong 
              ? 'bg-success/15 text-success border border-success/30' 
              : 'bg-destructive/15 text-destructive border border-destructive/30'
          }`}>
            {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {signal.direction}
          </div>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border">
            ID: {signal.id}
          </span>
        </div>
        <ScoreCircle score={signal.score} size={56} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5 relative z-10 text-sm">
        <div className="space-y-1 bg-background/50 p-2.5 rounded-lg border border-border/50">
          <div className="flex justify-between text-muted-foreground text-xs font-semibold mb-1">
            <span className="flex items-center gap-1"><Target className="w-3 h-3"/> Entries</span>
          </div>
          <div className="flex justify-between items-center font-numeric">
            <span className="text-foreground">{formatPrice(signal.entry1)}</span>
            {signal.entry2 && <span className="text-muted-foreground/70">{formatPrice(signal.entry2)}</span>}
          </div>
        </div>

        <div className="space-y-1 bg-background/50 p-2.5 rounded-lg border border-border/50">
          <div className="flex justify-between text-muted-foreground text-xs font-semibold mb-1">
            <span className="flex items-center gap-1 text-destructive/80"><ShieldAlert className="w-3 h-3"/> Stops</span>
          </div>
          <div className="flex justify-between items-center font-numeric">
            <span className="text-destructive/90">{formatPrice(signal.stopLoss1)}</span>
            {signal.stopLoss2 && <span className="text-destructive/50">{formatPrice(signal.stopLoss2)}</span>}
          </div>
        </div>

        <div className="col-span-2 space-y-1 bg-background/50 p-2.5 rounded-lg border border-border/50">
          <div className="flex justify-between text-muted-foreground text-xs font-semibold mb-1">
            <span className="flex items-center gap-1 text-primary/80"><CheckCircle2 className="w-3 h-3"/> Targets</span>
          </div>
          <div className="flex justify-between items-center font-numeric">
            <span className="text-primary/90">{formatPrice(signal.takeProfit1)}</span>
            {signal.takeProfit2 && <span className="text-primary/70">{formatPrice(signal.takeProfit2)}</span>}
          </div>
        </div>
      </div>

      <div className="mb-4 relative z-10">
        <div className="text-xs font-semibold text-muted-foreground mb-1.5 flex justify-between">
          <span>Analysis Alignment</span>
          <span className="text-[10px]">8 models</span>
        </div>
        <ScoreBreakdown breakdown={signal.scoreBreakdown} />
      </div>

      <div className="mb-5 relative z-10">
        <p className="text-xs text-muted-foreground leading-relaxed italic border-l-2 border-primary/40 pl-3">
          "{signal.rationale}"
        </p>
      </div>

      {signal.status === 'active' && onResolve && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50 relative z-10">
          <Button size="sm" variant="outline" className="flex-1 text-xs h-8 bg-success/5 hover:bg-success/15 hover:text-success border-success/20" onClick={() => onResolve(signal.id, 'tp1_hit')}>
            Hit TP1
          </Button>
          {signal.takeProfit2 && (
            <Button size="sm" variant="outline" className="flex-1 text-xs h-8 bg-success/5 hover:bg-success/15 hover:text-success border-success/20" onClick={() => onResolve(signal.id, 'tp2_hit')}>
              Hit TP2
            </Button>
          )}
          <Button size="sm" variant="outline" className="flex-1 text-xs h-8 bg-destructive/5 hover:bg-destructive/15 hover:text-destructive border-destructive/20" onClick={() => onResolve(signal.id, 'sl1_hit')}>
            Hit SL
          </Button>
          <Button size="sm" variant="ghost" className="text-xs h-8 hover:bg-muted" onClick={() => onResolve(signal.id, 'expired')}>
            <Clock className="w-3 h-3 mr-1" /> Expire
          </Button>
        </div>
      )}
      
      {signal.status !== 'active' && (
        <div className="pt-3 border-t border-border/50 flex justify-between items-center relative z-10">
          <span className="text-xs text-muted-foreground">Status</span>
          <span className={cn(
            "text-xs font-bold uppercase",
            signal.status.includes('tp') ? "text-success" : signal.status.includes('sl') ? "text-destructive" : "text-muted-foreground"
          )}>
            {signal.status.replace('_', ' ')}
          </span>
        </div>
      )}
    </div>
  );
}
