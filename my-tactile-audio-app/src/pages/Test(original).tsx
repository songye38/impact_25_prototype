import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Accessible Data Exploration (React + TypeScript)
 * ------------------------------------------------
 * Goals
 * 1) Load data (sample provided) with labels (e.g., "평상시", "달리기", "친구 옆")
 * 2) Choose an exploration method (범주화, 라벨별 평균/최대/최소, 변화량, 추세, 빈도)
 * 3) Choose a sonification/haptification mapping and preview (Web Audio + Vibration API)
 * 4) Export mapping + results as JSON or Arduino-like sketch text
 *
 * Styling: Tailwind (assumed present). No external libs required.
 */

type SensorType = "heart" | "light" | "color" | "sound";

type DataPoint = {
  t: number; // timestamp (ms) or index
  value: number; // numeric value from Arduino sensors
  label: string; // user-provided context
  sensor: SensorType; // which sensor produced this value
};

type ExplorationKind =
  | "binning"
  | "labelMeans"
  | "extremes"
  | "delta"
  | "trend"
  | "frequency";

type MappingKind =
  | "audio_pitch"
  | "audio_timbre"
  | "audio_rhythm"
  | "haptic_strength"
  | "haptic_pattern"
  | "haptic_repeat";

// ---------- Sample data (mock) ----------
const sampleData: DataPoint[] = [
  // heart rate examples (bpm)
  { t: 0, value: 74, label: "평상시 심박수", sensor: "heart" },
  { t: 1, value: 76, label: "평상시 심박수", sensor: "heart" },
  { t: 2, value: 80, label: "친구가 옆에 있을 때", sensor: "heart" },
  { t: 3, value: 83, label: "친구가 옆에 있을 때", sensor: "heart" },
  { t: 4, value: 118, label: "달리기", sensor: "heart" },
  { t: 5, value: 125, label: "달리기", sensor: "heart" },
  // light examples (0~1023)
  { t: 0, value: 120, label: "실내", sensor: "light" },
  { t: 1, value: 260, label: "창가", sensor: "light" },
  { t: 2, value: 500, label: "야외", sensor: "light" },
  // sound level examples (0~100 arbitrary)
  { t: 0, value: 20, label: "조용함", sensor: "sound" },
  { t: 1, value: 35, label: "보통", sensor: "sound" },
  { t: 2, value: 70, label: "시끄러움", sensor: "sound" },
];

// ---------- Utility helpers ----------
const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

const minMax = (arr: number[]) => {
  if (!arr.length) return { min: 0, max: 0 };
  let mn = arr[0];
  let mx = arr[0];
  for (let v of arr) {
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  return { min: mn, max: mx };
};

// simple linear regression y = a + b x, returns slope b
const slope = (xs: number[], ys: number[]) => {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const meanX = mean(xs.slice(0, n));
  const meanY = mean(ys.slice(0, n));
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    den += dx * dx;
  }
  return den === 0 ? 0 : num / den;
};

// equal-width binning into k bins
const binning = (values: number[], k = 3) => {
  if (!values.length) return { edges: [], bins: [] as number[] };
  const { min, max } = minMax(values);
  const width = (max - min) / k || 1;
  const edges = Array.from({ length: k + 1 }, (_, i) => min + i * width);
  const bins = values.map((v) => {
    const idx = Math.min(k - 1, Math.max(0, Math.floor((v - min) / width)));
    return idx;
  });
  return { edges, bins };
};

// frequency count by label
const countBy = <T extends string | number>(arr: T[]) =>
  arr.reduce<Record<string, number>>((acc, v) => {
    acc[String(v)] = (acc[String(v)] || 0) + 1;
    return acc;
  }, {});

// ---------- Web Audio (sonification) ----------
class Tone {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  async ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (!this.gain) {
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.0001; // start silent
      this.gain.connect(this.ctx.destination);
    }
    if (!this.osc) {
      this.osc = this.ctx.createOscillator();
      this.osc.type = "sine";
      this.osc.connect(this.gain);
      this.osc.start();
    }
  }

  async set(type: OscillatorType, freq: number, vol = 0.1) {
    await this.ensure();
    if (!this.ctx || !this.osc || !this.gain) return;
    this.osc.type = type;
    this.osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    this.gain.gain.setValueAtTime(vol, this.ctx.currentTime);
  }

  async ramp(freqFrom: number, freqTo: number, durationMs = 800, vol = 0.12) {
    await this.ensure();
    if (!this.ctx || !this.osc || !this.gain) return;
    const t0 = this.ctx.currentTime;
    this.osc.frequency.setValueAtTime(freqFrom, t0);
    this.osc.frequency.linearRampToValueAtTime(freqTo, t0 + durationMs / 1000);
    this.gain.gain.setValueAtTime(vol, t0);
    this.gain.gain.linearRampToValueAtTime(0.0001, t0 + durationMs / 1000);
  }

  async beep(freq = 440, ms = 200, type: OscillatorType = "sine", vol = 0.12) {
    await this.ensure();
    if (!this.ctx || !this.osc || !this.gain) return;
    const t0 = this.ctx.currentTime;
    this.osc.type = type;
    this.osc.frequency.setValueAtTime(freq, t0);
    this.gain.gain.setValueAtTime(vol, t0);
    this.gain.gain.linearRampToValueAtTime(0.0001, t0 + ms / 1000);
  }

  async silence() {
    await this.ensure();
    if (!this.ctx || !this.gain) return;
    this.gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
  }
}

const tone = new Tone();

// ---------- Arduino code generator ----------
function generateArduinoSketch(opts: {
  name: string;
  mapping: MappingKind;
  thresholds?: number[]; // for binning/patterns
  min?: number;
  max?: number;
  sensorVar?: string; // runtime value variable name
}) {
  const {
    name,
    mapping,
    thresholds = [/* e.g., 3-bin edges */],
    min = 0,
    max = 100,
    sensorVar = "value",
  } = opts;

  // generic vibration and tone mapping on Arduino (UNO-style)
  const code = `// Auto-generated by Accessible Data Exploration Tool\n// Sketch: ${name}\n// Mapping: ${mapping}\n\n// --- Pins (adjust for your board) ---\nconst int VIB_PIN = 5;      // PWM pin for vibration motor driver\nconst int BUZZER_PIN = 8;   // digital pin for piezo buzzer (tone())\n\n// --- Runtime sensor value (replace with your sensor read) ---\nint ${sensorVar} = 0;\n\nvoid setup() {\n  pinMode(VIB_PIN, OUTPUT);\n  pinMode(BUZZER_PIN, OUTPUT);\n}\n\nvoid hapticStrength(int v, int vmin, int vmax){\n  v = constrain(v, vmin, vmax);\n  int pwm = map(v, vmin, vmax, 0, 255);\n  analogWrite(VIB_PIN, pwm);\n}\n\nvoid hapticPattern(int bin){\n  // 0: short, 1: medium, 2: long\n  int d = 150 + 150 * bin;\n  analogWrite(VIB_PIN, 200); delay(d); analogWrite(VIB_PIN, 0); delay(120);\n}\n\nvoid hapticRepeat(int count){\n  for(int i=0;i<count;i++){ analogWrite(VIB_PIN, 220); delay(120); analogWrite(VIB_PIN,0); delay(100);} \n}\n\nvoid tonePitch(int v, int vmin, int vmax){\n  v = constrain(v, vmin, vmax);\n  int freq = map(v, vmin, vmax, 220, 880);\n  tone(BUZZER_PIN, freq, 180);\n}\n\nvoid toneRhythm(int count){\n  for(int i=0;i<count;i++){ tone(BUZZER_PIN, 660, 120); delay(200);}\n}\n\nint toBin(int v, int vmin, int vmax){\n  // equal width bins using 3 thresholds\n  int w = max(1, (vmax - vmin) / 3);\n  int idx = (v - vmin) / w;\n  if(idx < 0) idx = 0; if(idx > 2) idx = 2;\n  return idx;\n}\n\nvoid loop(){\n  // TODO: replace the next line with real sensor read\n  ${sensorVar} = analogRead(A0);\n\n  // --- Apply mapping ---\n  // Choose only one of the following blocks or switch by a mode variable\n\n  // AUDIO_PITCH\n  // tonePitch(${sensorVar}, ${min}, ${max});\n\n  // AUDIO_RHYTHM (e.g., repeat per threshold crossings or frequency bucket)\n  // toneRhythm(toBin(${sensorVar}, ${min}, ${max}) + 1);\n\n  // HAPTIC_STRENGTH\n  // hapticStrength(${sensorVar}, ${min}, ${max});\n\n  // HAPTIC_PATTERN\n  // hapticPattern(toBin(${sensorVar}, ${min}, ${max}));\n\n  // HAPTIC_REPEAT\n  // hapticRepeat(toBin(${sensorVar}, ${min}, ${max}) + 1);\n\n  delay(50);\n}\n`;
  return code;
}

// ---------- Main Component ----------
export default function Test() {
  const [data, setData] = useState<DataPoint[]>(sampleData);
  const [sensorFilter, setSensorFilter] = useState<SensorType | "all">("all");
  const [exploration, setExploration] = useState<ExplorationKind | null>(null);
  const [mapping, setMapping] = useState<MappingKind | null>(null);
  const [message, setMessage] = useState<string>(""); // aria-live summaries

  const filtered = useMemo(() => {
    return sensorFilter === "all" ? data : data.filter((d) => d.sensor === sensorFilter);
  }, [data, sensorFilter]);

  const values = useMemo(() => filtered.map((d) => d.value), [filtered]);
  const times = useMemo(() => filtered.map((d) => d.t), [filtered]);

  const labels = useMemo(() => Array.from(new Set(filtered.map((d) => d.label))), [filtered]);

  // --- Exploration computations ---
  const result = useMemo(() => {
    if (!exploration) return null;
    if (!filtered.length) return null;

    switch (exploration) {
      case "binning": {
        const { edges, bins } = binning(values, 3);
        const counts = countBy(bins);
        return { kind: exploration, edges, counts };
      }
      case "labelMeans": {
        const byLabel: Record<string, number[]> = {};
        filtered.forEach((d) => {
          byLabel[d.label] = byLabel[d.label] || [];
          byLabel[d.label].push(d.value);
        });
        const means = Object.fromEntries(
          Object.entries(byLabel).map(([k, arr]) => [k, Number(mean(arr).toFixed(2))])
        );
        return { kind: exploration, means };
      }
      case "extremes": {
        const { min, max } = minMax(values);
        const minIndex = values.indexOf(min);
        const maxIndex = values.indexOf(max);
        return {
          kind: exploration,
          min: { value: min, label: filtered[minIndex]?.label, t: filtered[minIndex]?.t },
          max: { value: max, label: filtered[maxIndex]?.label, t: filtered[maxIndex]?.t },
        };
      }
      case "delta": {
        const deltas = values.slice(1).map((v, i) => v - values[i]);
        const avgDelta = Number(mean(deltas).toFixed(2));
        return { kind: exploration, deltas, avgDelta };
      }
      case "trend": {
        const b = slope(times, values);
        return { kind: exploration, slope: Number(b.toFixed(4)) };
      }
      case "frequency": {
        const counts = countBy(filtered.map((d) => d.label));
        return { kind: exploration, counts };
      }
      default:
        return null;
    }
  }, [exploration, filtered, times, values]);

  // --- Natural language summary for screen reader & export ---
  const summary = useMemo(() => {
    if (!result) return "";
    switch (result.kind) {
      case "binning": {
        const edges = (result as any).edges as number[];
        const counts = (result as any).counts as Record<string, number>;
        const c0 = counts["0"] || 0;
        const c1 = counts["1"] || 0;
        const c2 = counts["2"] || 0;
        return `3개 구간으로 범주화했습니다. 구간1(${edges[0]?.toFixed(1)}~${edges[1]?.toFixed(1)}) ${c0}개, 구간2(${edges[1]?.toFixed(1)}~${edges[2]?.toFixed(1)}) ${c1}개, 구간3(${edges[2]?.toFixed(1)}~${edges[3]?.toFixed(1)}) ${c2}개.`;
      }
      case "labelMeans": {
        const means = (result as any).means as Record<string, number>;
        const parts = Object.entries(means).map(([k, v]) => `${k} 평균 ${v}`);
        return `라벨별 평균입니다: ${parts.join(", ")}.`;
      }
      case "extremes": {
        const r = result as any;
        return `최솟값 ${r.min.value} (라벨: ${r.min.label}), 최댓값 ${r.max.value} (라벨: ${r.max.label}).`;
      }
      case "delta": {
        const r = result as any;
        return `연속 변화량 평균은 ${r.avgDelta} 입니다.`;
      }
      case "trend": {
        const r = result as any;
        const dir = r.slope > 0 ? "상승 추세" : r.slope < 0 ? "하강 추세" : "변화 없음";
        return `추세 기울기 ${r.slope} (${dir}).`;
      }
      case "frequency": {
        const counts = (result as any).counts as Record<string, number>;
        const parts = Object.entries(counts).map(([k, v]) => `${k} ${v}회`);
        return `라벨 빈도입니다: ${parts.join(", ")}.`;
      }
      default:
        return "";
    }
  }, [result]);

  useEffect(() => {
    if (summary) setMessage(summary);
  }, [summary]);

  // --- Sonification / Haptification previews ---
  const preview = async () => {
    if (!result || !mapping) return;

    const { min, max } = minMax(values);
    const safeMin = min;
    const safeMax = max === min ? min + 1 : max;

    switch (mapping) {
      case "audio_pitch": {
        // map mean or instantaneous to frequency
        if (result.kind === "labelMeans") {
          const means = (result as any).means as Record<string, number>;
          for (const v of Object.values(means)) {
            const freq = 220 + ((v - safeMin) / (safeMax - safeMin)) * 660; // 220~880
            await tone.beep(freq, 260, "sine", 0.14);
            await wait(120);
          }
        } else if (result.kind === "delta") {
          const deltas = (result as any).deltas as number[];
          for (const d of deltas.slice(0, 12)) {
            const sign = d >= 0 ? 1 : -1;
            const mag = Math.min(Math.abs(d), safeMax - safeMin);
            const start = 330;
            const end = start + sign * (mag * 6);
            await tone.ramp(start, end, 200, 0.12);
            await wait(60);
          }
        } else if (result.kind === "trend") {
          const s = (result as any).slope as number;
          const base = 440;
          await tone.ramp(base, base + Math.max(-200, Math.min(200, s * 200)), 800, 0.12);
        } else if (result.kind === "binning") {
          const counts = (result as any).counts as Record<string, number>;
          const tones: number[] = [330, 550, 770];
          for (let i = 0; i < 3; i++) {
            const reps = (counts[String(i)] || 0);
            for (let r = 0; r < Math.min(5, reps); r++) {
              await tone.beep(tones[i], 160, "sine", 0.12);
              await wait(80);
            }
            await wait(150);
          }
        } else if (result.kind === "extremes") {
          const r = result as any;
          await tone.beep(300, 250, "sine", 0.14); // min
          await wait(200);
          await tone.beep(800, 250, "sine", 0.14); // max
        } else if (result.kind === "frequency") {
          const counts = (result as any).counts as Record<string, number>;
          for (const [label, c] of Object.entries(counts)) {
            const reps = Math.min(5, c);
            for (let i = 0; i < reps; i++) {
              await tone.beep(600, 140, "square", 0.12);
              await wait(90);
            }
            await wait(200);
          }
        }
        break;
      }
      case "audio_timbre": {
        // use oscillator type per label or bin
        if (result.kind === "labelMeans") {
          const wave: OscillatorType[] = ["sine", "square", "triangle", "sawtooth"];
          const means = Object.entries((result as any).means as Record<string, number>);
          for (let i = 0; i < means.length; i++) {
            const freq = 500;
            await tone.beep(freq, 260, wave[i % wave.length], 0.12);
            await wait(150);
          }
        } else {
          // fallback: cycle types
          const cycle: OscillatorType[] = ["sine", "square", "triangle"]; 
          for (let i = 0; i < 3; i++) {
            await tone.beep(500, 200, cycle[i], 0.12);
            await wait(120);
          }
        }
        break;
      }
      case "audio_rhythm": {
        if (result.kind === "frequency") {
          const counts = (result as any).counts as Record<string, number>;
          for (const [_, c] of Object.entries(counts)) {
            const reps = Math.min(7, c);
            for (let i = 0; i < reps; i++) {
              await tone.beep(660, 120, "sine", 0.14);
              await wait(120);
            }
            await wait(200);
          }
        } else if (result.kind === "delta") {
          const deltas = (result as any).deltas as number[];
          for (const d of deltas.slice(0, 10)) {
            const ms = 80 + Math.min(300, Math.abs(d) * 10);
            await tone.beep(520, ms, "sine", 0.12);
            await wait(80);
          }
        } else {
          // generic: 3 pulses for binning/trend/extremes
          for (let i = 0; i < 3; i++) {
            await tone.beep(600, 140, "sine", 0.12);
            await wait(120);
          }
        }
        break;
      }
      case "haptic_strength": {
        if (navigator.vibrate) {
          for (const v of values.slice(0, 10)) {
            const pwm = Math.floor(((v - safeMin) / (safeMax - safeMin)) * 255);
            navigator.vibrate([50 + (pwm % 200), 80]);
            await wait(100);
          }
          navigator.vibrate(0);
        }
        break;
      }
      case "haptic_pattern": {
        if (navigator.vibrate) {
          if (result.kind === "binning") {
            const counts = (result as any).counts as Record<string, number>;
            const patterns: number[][] = [
              [120, 100], // short
              [220, 120], // medium
              [360, 140], // long
            ];
            for (let i = 0; i < 3; i++) {
              const reps = Math.min(5, counts[String(i)] || 0);
              for (let r = 0; r < reps; r++) {
                navigator.vibrate(patterns[i]);
                await wait(patterns[i][0] + (patterns[i][1] || 0) + 120);
              }
              await wait(120);
            }
            navigator.vibrate(0);
          } else {
            // generic 3-step pattern
            navigator.vibrate([120, 80, 240, 120, 360]);
            await wait(1000);
            navigator.vibrate(0);
          }
        }
        break;
      }
      case "haptic_repeat": {
        if (navigator.vibrate) {
          if (result.kind === "frequency") {
            const counts = (result as any).counts as Record<string, number>;
            for (const [_, c] of Object.entries(counts)) {
              const reps = Math.min(7, c);
              for (let i = 0; i < reps; i++) {
                navigator.vibrate([120, 80]);
                await wait(180);
              }
              await wait(240);
            }
          } else {
            for (let i = 0; i < 3; i++) {
              navigator.vibrate([150, 100]);
              await wait(220);
            }
          }
          navigator.vibrate(0);
        }
        break;
      }
    }
  };

  const [exportText, setExportText] = useState<string>("");
  const doExport = () => {
    if (!result) return;
    const { min, max } = minMax(values);
    const sketch = generateArduinoSketch({
      name: "AccessibleMapping",
      mapping: mapping || "audio_pitch",
      min,
      max,
      sensorVar: "value",
    });

    const payload = {
      sensor: sensorFilter,
      exploration: result,
      mapping: mapping,
      range: { min, max },
      timestamp: Date.now(),
    };

    const blob = `// === SUMMARY (KOR) ===\n${summary}\n\n// === JSON (mapping + results) ===\n${JSON.stringify(payload, null, 2)}\n\n// === Arduino Sketch (editable) ===\n${sketch}`;
    setExportText(blob);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">접근 가능한 데이터 탐색 · 청각/촉각 변환</h1>
      <p className="text-sm opacity-80">데이터 → 탐색 → 감각화(소리/진동) → 내보내기</p>

      {/* Sensor filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl shadow bg-white">
          <label className="block text-sm font-semibold mb-2">센서 선택</label>
          <select
            className="w-full border rounded-xl p-2"
            value={sensorFilter}
            onChange={(e) => setSensorFilter(e.target.value as any)}
          >
            <option value="all">전체</option>
            <option value="heart">심박수</option>
            <option value="light">조도</option>
            <option value="color">컬러(값→숫자 맵 필요)</option>
            <option value="sound">소리 크기</option>
          </select>
        </div>

        <div className="p-3 rounded-2xl shadow bg-white">
          <label className="block text-sm font-semibold mb-2">탐색 방법</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["binning", "범주화(3구간)"],
              ["labelMeans", "라벨 평균"],
              ["extremes", "최대/최소"],
              ["delta", "변화량"],
              ["trend", "추세"],
              ["frequency", "라벨 빈도"],
            ] as [ExplorationKind, string][]).map(([k, lab]) => (
              <button
                key={k}
                className={`text-sm border rounded-xl px-2 py-1 ${
                  exploration === k ? "bg-black text-white" : "bg-gray-50"
                }`}
                onClick={() => setExploration(k)}
              >
                {lab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-2xl shadow bg-white">
          <label className="block text-sm font-semibold mb-2">감각화 방식</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["audio_pitch", "소리-높낮이"],
              ["audio_timbre", "소리-음색"],
              ["audio_rhythm", "소리-리듬"],
              ["haptic_strength", "진동-강도"],
              ["haptic_pattern", "진동-패턴"],
              ["haptic_repeat", "진동-반복"],
            ] as [MappingKind, string][]).map(([k, lab]) => (
              <button
                key={k}
                className={`text-sm border rounded-xl px-2 py-1 ${
                  mapping === k ? "bg-black text-white" : "bg-gray-50"
                }`}
                onClick={() => setMapping(k)}
              >
                {lab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary & Preview */}
      <div className="p-4 rounded-2xl shadow bg-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold">탐색 요약</span>
          <span className="text-xs opacity-60">(스크린리더 영역에 자동 낭독)</span>
        </div>
        <div aria-live="polite" className="text-base">{summary || "선택을 시작하세요."}</div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={preview}
            disabled={!result || !mapping}
            className="px-3 py-2 rounded-xl bg-black text-white disabled:opacity-40"
            aria-disabled={!result || !mapping}
          >
            미리듣기 / 미리느끼기
          </button>
          <button
            onClick={doExport}
            disabled={!result}
            className="px-3 py-2 rounded-xl border"
          >
            결과 내보내기
          </button>
        </div>
      </div>

      {/* Data table (minimal) */}
      <div className="p-4 rounded-2xl shadow bg-white">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">데이터 ({filtered.length}개)</span>
          <button
            className="text-xs underline"
            onClick={() => setData(sampleData)}
          >
            샘플 로드
          </button>
        </div>
        <div className="mt-2 max-h-56 overflow-auto text-sm">
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="py-1">t</th>
                <th>value</th>
                <th>label</th>
                <th>sensor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1">{d.t}</td>
                  <td>{d.value}</td>
                  <td>{d.label}</td>
                  <td>{d.sensor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick add row */}
        <QuickAdd onAdd={(dp) => setData((prev) => [...prev, dp])} />
      </div>

      {/* Exported text */}
      {exportText && (
        <div className="p-4 rounded-2xl shadow bg-white">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">내보내기 결과 (복사해서 사용)</span>
            <button
              className="text-xs border rounded-lg px-2 py-1"
              onClick={() => navigator.clipboard.writeText(exportText)}
            >
              클립보드 복사
            </button>
          </div>
          <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">{exportText}</pre>
        </div>
      )}

      {/* Status for screen readers */}
      <div className="sr-only" aria-live="polite">{message}</div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function QuickAdd({ onAdd }: { onAdd: (d: DataPoint) => void }) {
  const [t, setT] = useState<number>(Date.now());
  const [value, setValue] = useState<number>(0);
  const [label, setLabel] = useState<string>("");
  const [sensor, setSensor] = useState<SensorType>("heart");

  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
      <div>
        <label className="text-xs block">t</label>
        <input
          type="number"
          className="w-full border rounded-xl p-2"
          value={t}
          onChange={(e) => setT(Number(e.target.value))}
        />
      </div>
      <div>
        <label className="text-xs block">value</label>
        <input
          type="number"
          className="w-full border rounded-xl p-2"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
        />
      </div>
      <div>
        <label className="text-xs block">label</label>
        <input
          type="text"
          className="w-full border rounded-xl p-2"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="예: 평상시 심박수"
        />
      </div>
      <div>
        <label className="text-xs block">sensor</label>
        <select
          className="w-full border rounded-xl p-2"
          value={sensor}
          onChange={(e) => setSensor(e.target.value as SensorType)}
        >
          <option value="heart">심박수</option>
          <option value="light">조도</option>
          <option value="color">컬러</option>
          <option value="sound">소리</option>
        </select>
      </div>
      <button
        className="border rounded-xl px-3 py-2"
        onClick={() => {
          if (!label) return;
          onAdd({ t, value, label, sensor });
        }}
      >
        행 추가
      </button>
    </div>
  );
}
