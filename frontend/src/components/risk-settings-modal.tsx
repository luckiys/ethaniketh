'use client';

import { useState, useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';

export type RiskMode = 'low' | 'medium' | 'high' | 'custom';

export interface RiskSetting {
  mode: RiskMode;
  value: number; // 0–100
}

interface RiskSettingsModalProps {
  current: RiskSetting;
  onSave: (setting: RiskSetting) => void;
  onClose: () => void;
}

const PRESETS: { mode: RiskMode; label: string; range: string; defaultValue: number; color: string; bg: string; border: string; desc: string }[] = [
  {
    mode: 'low',
    label: 'Low',
    range: '0 – 35',
    defaultValue: 17,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    desc: 'Capital preservation. Conservative thresholds, early risk warnings.',
  },
  {
    mode: 'medium',
    label: 'Medium',
    range: '36 – 72',
    defaultValue: 54,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    desc: 'Balanced growth with moderate risk. Default strategy profile.',
  },
  {
    mode: 'high',
    label: 'High',
    range: '73 – 100',
    defaultValue: 85,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    desc: 'Aggressive exposure. Higher tolerance before risk warnings fire.',
  },
  {
    mode: 'custom',
    label: 'Custom',
    range: '0 – 100',
    defaultValue: 50,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    desc: 'Set your exact risk tolerance score.',
  },
];

export function riskLabel(setting: RiskSetting): string {
  if (setting.mode === 'custom') return `Custom (${setting.value})`;
  const preset = PRESETS.find((p) => p.mode === setting.mode);
  return preset ? `${preset.label} · ${setting.value}` : String(setting.value);
}

export function riskColor(mode: RiskMode): string {
  switch (mode) {
    case 'low': return 'text-emerald-400';
    case 'medium': return 'text-amber-400';
    case 'high': return 'text-red-400';
    case 'custom': return 'text-violet-400';
  }
}

export function RiskSettingsModal({ current, onSave, onClose }: RiskSettingsModalProps) {
  const [selectedMode, setSelectedMode] = useState<RiskMode>(current.mode);
  const [customValue, setCustomValue] = useState<number>(
    current.mode === 'custom' ? current.value : 50
  );
  const [sliderValue, setSliderValue] = useState<number>(current.value);

  // Update slider when mode changes to a preset
  useEffect(() => {
    if (selectedMode !== 'custom') {
      const preset = PRESETS.find((p) => p.mode === selectedMode);
      if (preset) setSliderValue(preset.defaultValue);
    } else {
      setSliderValue(customValue);
    }
  }, [selectedMode, customValue]);

  const effectiveValue = selectedMode === 'custom' ? customValue : sliderValue;

  const handleSave = () => {
    onSave({ mode: selectedMode, value: effectiveValue });
    onClose();
  };

  const getRangeForMode = (mode: RiskMode): [number, number] => {
    switch (mode) {
      case 'low': return [0, 35];
      case 'medium': return [36, 72];
      case 'high': return [73, 100];
      case 'custom': return [0, 100];
    }
  };

  const [min, max] = getRangeForMode(selectedMode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-100">Risk Tolerance</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-zinc-500">
            Your risk tolerance guides how aggressively the Strategist acts. Lower scores = more conservative recommendations.
          </p>

          {/* Preset buttons */}
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.mode}
                onClick={() => setSelectedMode(preset.mode)}
                className={`relative flex flex-col gap-1 rounded-lg border p-3 text-left transition-all ${
                  selectedMode === preset.mode
                    ? `${preset.bg} ${preset.border}`
                    : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${selectedMode === preset.mode ? preset.color : 'text-zinc-300'}`}>
                    {preset.label}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">{preset.range}</span>
                </div>
                <p className="text-xs text-zinc-500 leading-snug">{preset.desc}</p>
              </button>
            ))}
          </div>

          {/* Slider / custom input */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
            {selectedMode === 'custom' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Custom risk score</span>
                  <span className={`text-sm font-bold font-mono ${riskColor(selectedMode)}`}>{customValue}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={customValue}
                  onChange={(e) => setCustomValue(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-zinc-500 shrink-0">Or type a value:</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={customValue}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                      setCustomValue(v);
                    }}
                    className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100 text-xs font-mono outline-none focus:border-zinc-600"
                  />
                  <span className="text-xs text-zinc-600">/ 100</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">
                    {PRESETS.find((p) => p.mode === selectedMode)?.label} range
                  </span>
                  <span className={`text-sm font-bold font-mono ${riskColor(selectedMode)}`}>{sliderValue}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={sliderValue}
                  onChange={(e) => setSliderValue(Number(e.target.value))}
                  className={`w-full ${
                    selectedMode === 'low'
                      ? 'accent-emerald-500'
                      : selectedMode === 'medium'
                      ? 'accent-amber-500'
                      : 'accent-red-500'
                  }`}
                />
                <div className="flex justify-between text-xs text-zinc-600 font-mono">
                  <span>{min}</span>
                  <span>{max}</span>
                </div>
              </div>
            )}
          </div>

          {/* Current effective value summary */}
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Effective risk score</span>
            <span className={`font-bold font-mono text-sm ${riskColor(selectedMode)}`}>{effectiveValue} / 100</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-md bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
