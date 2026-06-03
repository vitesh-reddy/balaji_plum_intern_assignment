import React from 'react';

interface ConfidenceGaugeProps {
  score: number; // 0 to 1
  size?: number;
}

const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({ score, size = 100 }) => {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - score * circumference;

  const getColor = (s: number) => {
    if (s >= 0.9) return 'var(--success)';
    if (s >= 0.7) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="confidence-gauge">
      <div className="gauge-circle" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            className="gauge-bg"
            cx={size / 2}
            cy={size / 2}
            r={radius}
          />
          <circle
            className="gauge-fill"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getColor(score)}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="gauge-value">
          {Math.round(score * 100)}%
        </div>
      </div>
      <span className="gauge-label">Confidence</span>
    </div>
  );
};

export default ConfidenceGauge;
