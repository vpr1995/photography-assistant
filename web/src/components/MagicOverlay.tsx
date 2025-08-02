import React from 'react';

const sparkles = [
  { className: 'sparkle-1', symbol: '✨' },
  { className: 'sparkle-2', symbol: '⭐' },
  { className: 'sparkle-3', symbol: '💫' },
  { className: 'sparkle-4', symbol: '🌟' },
  { className: 'sparkle-5', symbol: '✨' },
  { className: 'sparkle-6', symbol: '⭐' },
  { className: 'sparkle-7', symbol: '🌟' },
  { className: 'sparkle-8', symbol: '💫' },
];

const MagicOverlay: React.FC = () => (
  <div className="magic-overlay">
    {sparkles.map((s, i) => (
      <div key={i} className={`magic-sparkle ${s.className}`}>{s.symbol}</div>
    ))}
  </div>
);

export default MagicOverlay;
