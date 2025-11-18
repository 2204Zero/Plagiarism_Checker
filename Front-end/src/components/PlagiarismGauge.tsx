import { useEffect, useState } from "react";

interface PlagiarismGaugeProps {
  score: number;
}

const PlagiarismGauge = ({ score }: PlagiarismGaugeProps) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const target = Math.max(0, Math.round(score));
    setAnimatedScore(0);
    if (target === 0) {
      setAnimatedScore(0);
      return;
    }
    const timer = setTimeout(() => {
      let current = 0;
      const interval = setInterval(() => {
        current += 1;
        setAnimatedScore(current);
        if (current >= target) {
          clearInterval(interval);
        }
      }, 20);
      return () => clearInterval(interval);
    }, 300);
    return () => clearTimeout(timer);
  }, [score]);

  const getColor = () => {
    if (score < 20) return "hsl(var(--success))";
    if (score < 50) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  const strokeDasharray = 2 * Math.PI * 90;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * animatedScore) / 100;

  return (
    <div className="relative w-64 h-64">
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background circle */}
        <circle
          cx="128"
          cy="128"
          r="90"
          stroke="hsl(var(--muted))"
          strokeWidth="16"
          fill="none"
          opacity="0.2"
        />
        {/* Animated progress circle */}
        <circle
          cx="128"
          cy="128"
          r="90"
          stroke={getColor()}
          strokeWidth="16"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-6xl font-bold">{animatedScore}%</span>
        <span className="text-sm text-muted-foreground mt-2">Plagiarism Score</span>
      </div>
    </div>
  );
};

export default PlagiarismGauge;
