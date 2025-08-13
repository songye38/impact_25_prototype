import React from 'react';

type LabelSelectorProps = {
  labels: string[];
  currentLabel: string;
  onSelect: (label: string) => void;
};

export function LabelSelector({ labels, currentLabel, onSelect }: LabelSelectorProps) {
  return (
    <div>
      {labels.map(label => (
        <button
          key={label}
          onClick={() => onSelect(label)}
          style={{ fontWeight: label === currentLabel ? 'bold' : 'normal', fontSize: '1.5rem', margin: '0.5rem' }}
          aria-pressed={label === currentLabel}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
