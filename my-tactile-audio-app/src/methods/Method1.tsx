import React, { useEffect, useMemo, useRef, useState } from "react";
import { DataPoint, ExplorationKind, MappingKind } from "./../types/methodTypes";
import { options } from "./../types/methodContants";
import { binning, countBy, mean, minMax, slope } from "../utils/math";
import {Tone, tone} from "../audio/Tone";
import { generateArduinoSketch } from "../arduino/generator"


// ---------- Main Component ----------
export default function Method1() {
    const [data, setData] = useState<DataPoint[]>([]);
    const [labelFilter, setLabelFilter] = useState<string[]>([]);

    // 업로드하거나 데이터 추가될 때마다 라벨 목록 갱신
    const userLabels = useMemo(() => {
        return ["all", ...Array.from(new Set(data.map(d => d.label)))];
    }, [data]);
    const [exploration, setExploration] = useState<ExplorationKind | null>(null);
    const [mapping, setMapping] = useState<MappingKind | null>(null);
    // 상단에서 상태 선언

    // 오디오 관련
    const [audioPitch, setAudioPitch] = useState(440); // Hz
    const [audioVolume, setAudioVolume] = useState(50); // 0~100

    // 햅틱 관련
    const [hapticStrength, setHapticStrength] = useState(50); // 0~100
    const [hapticPattern, setHapticPattern] = useState("pulse"); // 기본 패턴
    const [message, setMessage] = useState<string>("");



    //파일 업로드 관련 함수
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                // 줄 단위로 나누고, 쉼표로 분리
                const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
                const parsed: DataPoint[] = lines.map((line, i) => {
                    const [valueStr, label] = line.split(",");
                    const value = Number(valueStr);
                    if (isNaN(value) || !label) throw new Error("잘못된 형식");
                    return { value, label };
                });
                setData(parsed);
            } catch (err) {
                alert("파일 형식이 올바르지 않거나 읽는 중 오류가 발생했습니다.");
            }
        };
        reader.readAsText(file);
    };


    // --- label 기준 필터 ---
    const filtered = useMemo(() => {
        // "all"이 포함되어 있으면 전체 데이터 반환
        if (labelFilter.includes("all")) return data;

        // 선택된 라벨 중 하나라도 맞으면 필터링
        return data.filter(d => labelFilter.includes(d.label));
    }, [data, labelFilter]);

    const values = useMemo(() => filtered.map((d) => d.value), [filtered]);
    const labels = useMemo(() => Array.from(new Set(data.map((d) => d.label))), [data]);
    const times = filtered.map((_, i) => i); // 0,1,2,3,... 





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
                    min: { value: min, label: filtered[minIndex]?.label, index: minIndex },
                    max: { value: max, label: filtered[maxIndex]?.label, index: maxIndex },
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
    }, [exploration, filtered, values, times]);




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
            //   sensor: sensorFilter,
            exploration: result,
            mapping: mapping,
            range: { min, max },
            timestamp: Date.now(),
        };

        const blob = `// === SUMMARY (KOR) ===\n${summary}\n\n// === JSON (mapping + results) ===\n${JSON.stringify(payload, null, 2)}\n\n// === Arduino Sketch (editable) ===\n${sketch}`;
        setExportText(blob);
    };

    return (
        <div className="container">
            <h1>접근 가능한 데이터 탐색 · 청각/촉각 변환</h1>

            {/* File upload & label filter */}
            <div className="grid-three">
                <div className="card">
                    <label>데이터 업로드 (.txt)</label>
                    <input
                        type="file"
                        accept=".txt,text/plain"
                        onChange={handleFileUpload}
                    />
                </div>

                {/* 라벨 선택 */}
                <div className="card">
                    <label>라벨 선택</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        {userLabels.map(label => (
                            <button
                                key={label}
                                onClick={() => {
                                    if (labelFilter.includes(label)) {
                                        setLabelFilter(labelFilter.filter(l => l !== label));
                                    } else {
                                        setLabelFilter([...labelFilter, label]);
                                    }
                                }}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    border: '1px solid #ccc',
                                    backgroundColor: labelFilter.includes(label) ? '#153F76' : 'white',
                                    color: labelFilter.includes(label) ? 'white' : '#333',
                                    cursor: 'pointer',
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 탐색 방법 선택 */}
                <div className="card">
                    <label>탐색 방법</label>
                    <div className="button-grid">
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
                                className={exploration === k ? "active" : ""}
                                onClick={() => setExploration(k)}
                            >
                                {lab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="grid-two">
                {/* 감각화 방식 선택 */}
                <div className="card">
                    <label>감각화 방식</label>
                    <div className="button-grid">
                        {options.map(([k, lab]) => (
                            <button
                                key={k}
                                className={mapping === k ? "active" : ""}
                                onClick={() => setMapping(k)}
                            >
                                {lab}
                            </button>
                        ))}
                    </div>

                    {mapping && (
                        <div className="custom-settings">
                            {mapping.startsWith('audio') && (
                                <>
                                    <label>Pitch</label>
                                    <input type="range" min={100} max={2000} value={audioPitch} onChange={e => setAudioPitch(+e.target.value)} />
                                    <label>Volume</label>
                                    <input type="range" min={0} max={100} value={audioVolume} onChange={e => setAudioVolume(+e.target.value)} />
                                </>
                            )}
                            {mapping.startsWith('haptic') && (
                                <>
                                    <label>Strength</label>
                                    <input type="range" min={0} max={100} value={hapticStrength} onChange={e => setHapticStrength(+e.target.value)} />
                                    <label>Pattern</label>
                                    <select value={hapticPattern} onChange={e => setHapticPattern(e.target.value)}>
                                        <option value="pulse">Pulse</option>
                                        <option value="buzz">Buzz</option>
                                        <option value="wave">Wave</option>
                                    </select>
                                </>
                            )}
                        </div>
                    )}
                </div>


                {/* Summary & Preview */}
                <div className="card">
                    <div className="summary-header">
                        <span>탐색 요약</span>
                        <span className="subtext">(스크린리더 영역에 자동 낭독)</span>
                    </div>
                    <div aria-live="polite">{summary || "선택을 시작하세요."}</div>
                    <div className="button-row">
                        <button onClick={preview} disabled={!result || !mapping}>미리듣기 / 미리느끼기</button>
                        <button onClick={doExport} disabled={!result}>결과 내보내기</button>
                    </div>
                </div>
            </div>

            {/* Data table */}
            <div className="card">
                <div className="table-header">
                    <span>데이터 ({filtered.length}개)</span>
                    <button onClick={() => setData([])}>초기화</button>
                </div>
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>value</th>
                                <th>label</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((d, i) => (
                                <tr key={i}>
                                    <td>{d.value}</td>
                                    <td>{d.label}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Exported text */}
            {exportText && (
                <div className="card">
                    <div className="table-header">
                        <span>내보내기 결과 (복사해서 사용)</span>
                        <button onClick={() => navigator.clipboard.writeText(exportText)}>클립보드 복사</button>
                    </div>
                    <pre>{exportText}</pre>
                </div>
            )}

            <div className="sr-only" aria-live="polite">{message}</div>

            <style>{`
        .container {
            // max-width: 1200px;
            margin: 20px auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            width : 90vw;
        }

        h1 {
            font-size: 24px;
            font-weight: bold;
        }

        .grid-three {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
        }
        .grid-two {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
        }

        .card {
            background: #fff;
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        label {
            font-weight: 600;
            margin-bottom: 4px;
        }

        input[type="file"], select {
            padding: 8px;
            border-radius: 12px;
            border: 1px solid #ccc;
            width: 100%;
        }

        .button-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }

        button {
            padding: 6px 12px;
            border-radius: 12px;
            border: 1px solid #ccc;
            background: #f5f5f5;
            cursor: pointer;
        }

        button.active {
            background: #000;
            color: #fff;
            border-color: #000;
        }

        button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        .summary-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
        }

        .subtext {
            font-size: 12px;
            color: #666;
        }

        .button-row {
            display: flex;
            gap: 8px;
            margin-top: 8px;
        }

        .table-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
        }

        .table-wrapper {
            max-height: 224px;
            overflow: auto;
            margin-top: 8px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }

        th, td {
            text-align: left;
            padding: 6px;
        }

        tr + tr {
            border-top: 1px solid #eee;
        }

        pre {
            font-size: 12px;
            overflow: auto;
            white-space: pre-wrap;
        }

        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0,0,0,0);
            border: 0;
        }
    `}</style>
        </div>


    );
}

function wait(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}



//렌더링을 다르게 하는 코드
//         <div className="container">
//             <h1>접근 가능한 데이터 탐색 · 청각/촉각 변환</h1>

//             <div className="main-layout">
//                 {/* 왼쪽 패널 */}
//                 <div className="left-panel">
//                     {/* File upload */}
//                     <div className="card">
//                         <label>데이터 업로드 (.txt)</label>
//                         <input
//                             type="file"
//                             accept=".txt,text/plain"
//                             onChange={handleFileUpload}
//                         />
//                     </div>

//                     {/* Label filter */}
//                     <div className="card">
//                         <label>라벨 선택</label>
//                         <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
//                             {userLabels.map(label => (
//                                 <button
//                                     key={label}
//                                     onClick={() => {
//                                         if (labelFilter.includes(label)) {
//                                             setLabelFilter(labelFilter.filter(l => l !== label));
//                                         } else {
//                                             setLabelFilter([...labelFilter, label]);
//                                         }
//                                     }}
//                                     style={{
//                                         padding: '6px 12px',
//                                         borderRadius: 6,
//                                         border: '1px solid #ccc',
//                                         backgroundColor: labelFilter.includes(label) ? '#153F76' : 'white',
//                                         color: labelFilter.includes(label) ? 'white' : '#333',
//                                         cursor: 'pointer',
//                                     }}
//                                 >
//                                     {label}
//                                 </button>
//                             ))}
//                         </div>
//                     </div>

//                     {/* Exploration method */}
//                     <div className="card">
//                         <label>탐색 방법</label>
//                         <div className="button-grid">
//                             {([
//                                 ["binning", "범주화(3구간)"],
//                                 ["labelMeans", "라벨 평균"],
//                                 ["extremes", "최대/최소"],
//                                 ["delta", "변화량"],
//                                 ["trend", "추세"],
//                                 ["frequency", "라벨 빈도"],
//                             ] as [ExplorationKind, string][]).map(([k, lab]) => (
//                                 <button
//                                     key={k}
//                                     className={exploration === k ? "active" : ""}
//                                     onClick={() => setExploration(k)}
//                                 >
//                                     {lab}
//                                 </button>
//                             ))}
//                         </div>
//                     </div>

//                     {/* Mapping selection */}
//                     <div className="card">
//                         <label>감각화 방식</label>
//                         <div className="button-grid">
//                             {options.map(([k, lab]) => (
//                                 <button
//                                     key={k}
//                                     className={mapping === k ? "active" : ""}
//                                     onClick={() => setMapping(k)}
//                                 >
//                                     {lab}
//                                 </button>
//                             ))}
//                         </div>

//                         {mapping && (
//                             <div className="custom-settings">
//                                 {mapping.startsWith('audio') && (
//                                     <>
//                                         <label>Pitch</label>
//                                         <input
//                                             type="range"
//                                             min={100}
//                                             max={2000}
//                                             value={audioPitch}
//                                             onChange={e => setAudioPitch(+e.target.value)}
//                                         />
//                                         <label>Volume</label>
//                                         <input
//                                             type="range"
//                                             min={0}
//                                             max={100}
//                                             value={audioVolume}
//                                             onChange={e => setAudioVolume(+e.target.value)}
//                                         />
//                                     </>
//                                 )}
//                                 {mapping.startsWith('haptic') && (
//                                     <>
//                                         <label>Strength</label>
//                                         <input
//                                             type="range"
//                                             min={0}
//                                             max={100}
//                                             value={hapticStrength}
//                                             onChange={e => setHapticStrength(+e.target.value)}
//                                         />
//                                         <label>Pattern</label>
//                                         <select
//                                             value={hapticPattern}
//                                             onChange={e => setHapticPattern(e.target.value)}
//                                         >
//                                             <option value="pulse">Pulse</option>
//                                             <option value="buzz">Buzz</option>
//                                             <option value="wave">Wave</option>
//                                         </select>
//                                     </>
//                                 )}
//                             </div>
//                         )}
//                     </div>

//                     {/* Summary */}
//                     <div className="card">
//                         <div className="summary-header">
//                             <span>탐색 요약</span>
//                             <span className="subtext">(스크린리더 영역에 자동 낭독)</span>
//                         </div>
//                         <div aria-live="polite">{summary || "선택을 시작하세요."}</div>
//                         <div className="button-row">
//                             <button onClick={preview} disabled={!result || !mapping}>미리듣기 / 미리느끼기</button>
//                             <button onClick={doExport} disabled={!result}>결과 내보내기</button>
//                         </div>
//                     </div>
//                 </div>

//                 {/* 오른쪽 패널 */}
//                 <div className="right-panel">
//                     {/* Data table */}
//                     <div className="card">
//                         <div className="table-header">
//                             <span>데이터 ({filtered.length}개)</span>
//                             <button onClick={() => setData([])}>초기화</button>
//                         </div>
//                         <div className="table-wrapper">
//                             <table>
//                                 <thead>
//                                     <tr>
//                                         <th>value</th>
//                                         <th>label</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {filtered.map((d, i) => (
//                                         <tr key={i}>
//                                             <td>{d.value}</td>
//                                             <td>{d.label}</td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </div>

//                     {/* Exported text */}
//                     {exportText && (
//                         <div className="card">
//                             <div className="table-header">
//                                 <span>내보내기 결과 (복사해서 사용)</span>
//                                 <button onClick={() => navigator.clipboard.writeText(exportText)}>클립보드 복사</button>
//                             </div>
//                             <pre>{exportText}</pre>
//                         </div>
//                     )}
//                 </div>
//             </div>

//             <div className="sr-only" aria-live="polite">{message}</div>

//             {/* CSS */}
//             <style>{`
//     .container {
//       max-width: 1200px;
//       margin: 0 auto;
//       padding: 16px;
//       display: flex;
//       flex-direction: column;
//       gap: 16px;
//     }

//     h1 {
//       font-size: 24px;
//       font-weight: bold;
//     }

//     .main-layout {
//       display: flex;
//       gap: 16px;
//     }

//     .left-panel {
//       flex: 1;
//       display: flex;
//       flex-direction: column;
//       gap: 16px;
//     }

//     .right-panel {
//       flex: 1.5;
//       display: flex;
//       flex-direction: column;
//       gap: 16px;
//     }

//     .card {
//       background: #fff;
//       border-radius: 16px;
//       padding: 16px;
//       box-shadow: 0 4px 12px rgba(0,0,0,0.05);
//       display: flex;
//       flex-direction: column;
//       gap: 8px;
//     }

//     label {
//       font-weight: 600;
//       margin-bottom: 4px;
//     }

//     input[type="file"], select, input[type="range"] {
//       padding: 8px;
//       border-radius: 12px;
//       border: 1px solid #ccc;
//       width: 100%;
//     }

//     .button-grid {
//       display: grid;
//       grid-template-columns: repeat(2, 1fr);
//       gap: 8px;
//     }

//     button {
//       padding: 6px 12px;
//       border-radius: 12px;
//       border: 1px solid #ccc;
//       background: #f5f5f5;
//       cursor: pointer;
//     }

//     button.active {
//       background: #000;
//       color: #fff;
//       border-color: #000;
//     }

//     button:disabled {
//       opacity: 0.4;
//       cursor: not-allowed;
//     }

//     .summary-header {
//       display: flex;
//       justify-content: space-between;
//       align-items: center;
//       font-weight: 600;
//     }

//     .subtext {
//       font-size: 12px;
//       color: #666;
//     }

//     .button-row {
//       display: flex;
//       gap: 8px;
//       margin-top: 8px;
//     }

//     .table-header {
//       display: flex;
//       justify-content: space-between;
//       align-items: center;
//       font-weight: 600;
//     }

//     .table-wrapper {
//       max-height: 400px;
//       overflow: auto;
//       margin-top: 8px;
//     }

//     table {
//       width: 100%;
//       border-collapse: collapse;
//       font-size: 14px;
//     }

//     th, td {
//       text-align: left;
//       padding: 6px;
//     }

//     tr + tr {
//       border-top: 1px solid #eee;
//     }

//     pre {
//       font-size: 12px;
//       overflow: auto;
//       white-space: pre-wrap;
//     }

//     .sr-only {
//       position: absolute;
//       width: 1px;
//       height: 1px;
//       padding: 0;
//       margin: -1px;
//       overflow: hidden;
//       clip: rect(0,0,0,0);
//       border: 0;
//     }
//   `}</style>
//         </div>