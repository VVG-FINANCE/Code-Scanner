import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HalfGaugeProps {
  value: number; // 0 to 100
  min?: number;
  max?: number;
  label: string;
  colorClass?: string;
  formatValue?: (v: number) => string;
}

export function HalfGauge({ 
  value, 
  min = 0, 
  max = 100, 
  label, 
  colorClass = "text-primary",
  formatValue = (v) => v.toFixed(1)
}: HalfGaugeProps) {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  
  // For a half circle, circumference is PI * r. We use a viewBox of 0 0 100 50
  const radius = 40;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-[160px] mx-auto">
      <svg viewBox="0 0 100 55" className="w-full overflow-visible drop-shadow-lg">
        {/* Background track */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          className="text-muted"
        />
        {/* Fill track */}
        <motion.path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          className={cn("transition-colors duration-500", colorClass)}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center translate-y-2">
        <span className="text-2xl font-numeric font-bold text-foreground drop-shadow-sm">
          {formatValue(value)}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
          {label}
        </span>
      </div>
    </div>
  );
}

interface ScoreCircleProps {
  score: number;
  size?: number;
}

export function ScoreCircle({ score, size = 64 }: ScoreCircleProps) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  let color = "text-success"; // Green
  if (score < 40) color = "text-destructive";
  else if (score < 70) color = "text-warning";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          className="text-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          strokeLinecap="round"
          className={color}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-numeric font-bold drop-shadow-md">{Math.round(score)}</span>
      </div>
    </div>
  );
}
