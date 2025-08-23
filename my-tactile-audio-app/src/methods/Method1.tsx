import React, { useEffect, useMemo, useRef, useState } from "react";
import { DataPoint, ExplorationKind, MappingKind } from "./../types/methodTypes";
import { options } from "./../types/methodContants";
import { binning, countBy, mean, minMax, slope } from "../utils/math";
import { Tone, tone } from "../audio/Tone";
import { generateArduinoSketch } from "../arduino/generator"
import OrderBox from "../components/OrderBox";
import "./../styles/method.css";


export default function Method1() {
    const [newLabel, setNewLabel] = useState<string>('');
    const [selectedLabel, setSelectedLabel] = useState<string>('');
    const [data, setData] = useState<DataPoint[]>([]);
    const [labelFilter, setLabelFilter] = useState<string[]>([]);
    const [exploration, setExploration] = useState<ExplorationKind | null>(null);
    const [mapping, setMapping] = useState<MappingKind | null>(null);
    const [completed, setCompleted] = useState([false, false, false, false, false]);
    const [fileName, setFileName] = useState<string>(""); // 파일 이름 상태

    // 오디오 관련
    const [audioPitch, setAudioPitch] = useState(440); // Hz
    const [audioVolume, setAudioVolume] = useState(50); // 0~100

    // 햅틱 관련
    const [hapticStrength, setHapticStrength] = useState(50); // 0~100
    const [hapticPattern, setHapticPattern] = useState("pulse"); // 기본 패턴
    const [message, setMessage] = useState<string>("");


    // ------------------- 단계 정의 -------------------
    const steps = [
        { label: '1단계 데이터 불러오기', completedLabel: '코드 불러오기 완료', content: '선생님 도움을 받아 부품을 연결한 뒤, 버튼을 눌러 아두이노 코드를 복사하고 아두이노 소프트웨어에 붙여넣으세요.' },
        { label: '2단계 라벨 선택하기', completedLabel: '라벨 선택 완료', content: '특정 라벨을 선택하지 않으면 모든 데이터가 보이고 라벨을 선택하면 선택한 라벨 데이터만 보입니다.' },
        { label: '3단계 탐색 방법 선택하기', completedLabel: '탐색 방법 선택 완료', content: '지금 입력하는 값의 특성을 하나 선택해 입력하세요.' },
        { label: '4단계 감각화 방법 선택하기', completedLabel: '감각화 방법 선택 완료', content: '버튼을 눌러 아두이노와 시리얼 연결을 시작하고 데이터를 받아오세요.' },
        { label: '5단계 아두이노 코드 만들기', completedLabel: '코드 만들기 완료', content: '작업이 끝나면 시리얼 연결을 안전하게 해제하세요.' },
    ];


    const lastCompletedStep = completed.lastIndexOf(true);

    // --- label 기준 필터 ---
    const filtered = useMemo(() => {
        return labelFilter.length === 0
            ? data       // 아무것도 선택 안 하면 전체
            : data.filter(d => labelFilter.includes(d.label));
    }, [data, labelFilter]);

    // 필터된 값만
    const values = useMemo(() => filtered.map(d => d.value), [filtered]);

    // 모든 라벨
    const labels = useMemo(() => Array.from(new Set(data.map(d => d.label))), [data]);

    // filtered 요소가 원본 data에서 몇 번째인지
    const times = useMemo(() => filtered.map(d => data.indexOf(d)), [filtered, data]);




    // ------------------- 초기화 핸들러 -------------------
    const handleReset = async () => {
        try {

            // 단계 완료 상태 초기화
            setCompleted(Array(steps.length).fill(false));

            // 레이블 초기화
            // setLabels([]);        // 지금까지 추가한 레이블 제거
            setSelectedLabel(''); // 선택된 레이블 초기화
            setNewLabel('');      // 입력창 초기화

            alert('모든 단계를 초기화했어. 처음부터 다시 시작할 수 있어!');
        } catch (err) {
            console.error(err);
            alert('초기화 중 오류가 발생했어 😢');
        }
    };


    // ------------------- 단계 클릭 핸들러 -------------------
    const handleClick = async (idx: number) => {
        if (idx <= lastCompletedStep + 1) {


            if (idx === 0) {
                // 1단계: 데이터 불러오기
                <input
                    type="file"
                    accept=".txt,text/plain"
                    onChange={handleFileUpload}
                />
            }
            else if (idx === 1) {
                // 2단계: 라벨 선택하기

            }
            else if (idx === 2) {
                // 3단계: 탐색 방법 선택하기

            }
            else if (idx === 3) {
                // 4단계: 감각화 방법 선택하기

            }
            else if (idx === 4) {
                // 5단계: 아두이노 코드 만들기

            }

            // 공통 완료 토글
            setCompleted(prev => {
                const copy = [...prev];
                copy[idx] = !copy[idx];
                return copy;
            });
        }
    };


    // ------------------- 레이블 추가 함수 -------------------
    // function addLabel() {
    //     const trimmed = newLabel.trim();
    //     if (trimmed === '') return;
    //     if (labels.includes(trimmed)) {
    //         alert('이미 존재하는 레이블입니다.');
    //         return;
    //     }
    //     setLabels(prev => [...prev, trimmed]);
    //     setData(prev => ({ ...prev, [trimmed]: [] }));
    //     setSelectedLabel(trimmed);
    //     setNewLabel('');
    // }


    const selectedLabelRef = useRef(selectedLabel);
    useEffect(() => {
        selectedLabelRef.current = selectedLabel;
    }, [selectedLabel]);

    //파일 업로드 관련 함수
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name); // 파일 이름 저장

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
                const parsed: DataPoint[] = lines.map(line => {
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




    return (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'column', gap: '20px', padding: 30, boxSizing: 'border-box',overflowY: "hidden" }}>
            <h1>데이터 탐색</h1>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row', gap: '20px',height: "500px" }}>
                {/* 왼쪽 - 설정 편 */}
                <div style={{ overflowY: "auto",fontFamily: "'Noto Sans KR', sans-serif", color: '#222', display: 'flex', flexDirection: 'column', gap: '20px', width: '50%' }}>

                    {/*  0️⃣ 과정(Process) 단계 */}
                    <div style={{ backgroundColor: '#F5F5F5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <h2 style={{ margin: 0 }}>프로젝트 안내</h2>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <p style={{ fontSize: 18, lineHeight: '1.5' }}>
                                    이 프로젝트는 총 6개의 단계로 구성되어 있으며, 순서대로 진행하면 됩니다.<br />
                                    각 단계별로 완료 상태가 표시되며, 중간에 문제가 생기면 아래 <strong>초기화 버튼</strong>을 눌러 처음부터 다시 시작할 수 있습니다.
                                </p>
                            </div>
                        </div>
                        <button
                            style={{
                                fontSize: 18,
                                fontWeight: '600',
                                padding: '16px 20px',
                                borderRadius: 8,
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: '#184175', // 파란 계열
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                transition: 'background-color 0.3s ease',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2F609F')} // hover 더 진한 파랑
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2F609F')}
                            onClick={handleReset}
                        >
                            <img
                                src="/icons/alert.svg"
                                alt="reset icon"
                                style={{ width: 24, height: 24 }}
                            />
                            모든 단계를 초기화하고 처음부터 시작하기
                        </button>

                        <div>
                        </div>
                    </div>

                    {/*  1️⃣ 과정(Process) 단계 */}
                    <div style={{ backgroundColor: '#F5F5F5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <h2 style={{ margin: 0 }}>{steps[0].label}</h2>
                            <p style={{ fontSize: 18, lineHeight: '1.5' }}>{steps[0].content}</p>
                        </div>
                        {/* <input
                            type="file"
                            accept=".txt,text/plain"
                            onChange={handleFileUpload}
                        /> */}
                        <input
                            type="file"
                            id="fileInput"
                            style={{ display: "none" }}
                            onChange={handleFileUpload}
                        />

                        <label htmlFor="fileInput" className="select-file">
                            <img
                                src={fileName ? "/icons/file-check.svg" : "/icons/file.svg"}
                                alt={fileName ? "파일 선택됨" : "파일 선택"}
                                style={{ width: 24, height: 24 }}
                            />
                            {fileName || "파일 선택"}
                        </label>


                    </div>

                    {/*  2️⃣ 과정(Process) 단계 */}
                    <div style={{ backgroundColor: '#F5F5F5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <h2 style={{ margin: 0 }}>{steps[1].label}</h2>
                            <p style={{ fontSize: 18, lineHeight: '1.5' }}>{steps[1].content}</p>
                        </div>
                        <div className="label-list">
                            {labels.map(label => (
                                <button
                                    key={label}
                                    onClick={() =>
                                        setLabelFilter(prev =>
                                            prev.includes(label)
                                                ? prev.filter(l => l !== label) // 선택 해제
                                                : [...prev, label]             // 선택 추가
                                        )
                                    }
                                    className={`label-item ${labelFilter.includes(label) ? "active" : ""}`}
                                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                                >
                                    {label}
                                    {labelFilter.includes(label) && (
                                        <img
                                            src="/icons/colored-check.svg"
                                            alt="선택됨"
                                            style={{ width: 24, height: 24 }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>




                    </div>

                    {/* 3️⃣ 레이블 선택 및 추가 */}
                    <div style={{ backgroundColor: '#F5F5F5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <h2 style={{ margin: 0 }}>{steps[2].label}</h2>
                            <p style={{ fontSize: 18, lineHeight: '1.5' }}>{steps[2].content}</p>
                        </div>
                        {/* 탐색 방법 선택 */}
                        <div className="card">
                            <div className="label-list">
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
                                        className={`label-item ${exploration === k ? "active" : ""}`}
                                        onClick={() => setExploration(k)}
                                        style={{ display: "flex", alignItems: "center", gap: "8px" }} // 텍스트 + 이미지 가로 배치
                                    >
                                        <span>{lab}</span>
                                        {exploration === k && (
                                            <img
                                                src="/icons/colored-check.svg"
                                                alt="선택됨"
                                                style={{ width: 24, height: 24 }}
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>


                    </div>


                    {/* 4️⃣ 선택한 레이블과 값 받기 */}
                    <div style={{ backgroundColor: '#F5F5F5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <h2 style={{ margin: 0 }}>{steps[3].label}</h2>
                            <p style={{ fontSize: 18, lineHeight: '1.5' }}>{steps[3].content}</p>
                        </div>
                        {/* 감각화 방식 선택 */}
                        <div className="card">
                            <div className="label-list">
                                {options.map(([k, lab]) => (
                                    <button
                                        key={k}
                                        onClick={() => setMapping(k)}
                                        className={`label-item ${mapping === k ? "active" : ""}`}
                                        style={{ display: "flex", alignItems: "center", gap: "8px" }} // 텍스트 + 이미지 가로 배치
                                    >
                                        <span>{lab}</span>
                                        {mapping === k && (
                                            <img
                                                src="/icons/colored-check.svg"
                                                alt="선택됨"
                                                style={{ width: 24, height: 24 }}
                                            />
                                        )}
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
                    </div>

                    {/*  5️⃣ 과정(Process) 단계 */}
                    <div style={{ backgroundColor: '#F5F5F5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <h2 style={{ margin: 0 }}>{steps[4].label}</h2>
                            <p style={{ fontSize: 18, lineHeight: '1.5' }}>{steps[4].content}</p>
                        </div>
                        <div>
                            {/* 버튼 영역 */}
                            <div style={{
                                display: 'flex',
                                gap: 16,
                                overflowX: 'auto',
                                padding: 12,
                                flexWrap: 'nowrap'
                            }}>
                                <OrderBox
                                    step={5}
                                    label={completed[4] ? steps[4].completedLabel : steps[4].label} // steps[4] 사용
                                    content={steps[4].content}
                                    completed={completed[4]}
                                    onClick={() => handleClick(4)}
                                    disabled={!(4 <= lastCompletedStep + 1)}
                                />


                            </div>
                        </div>
                    </div>
                </div>
                {/* 오른쪽 - 데이터가 들어오는 부분 */}
                <div
                    style={{
                        backgroundColor: '#F5F5F5',
                        padding: '20px',
                        borderRadius: '12px',
                        width: '50%',
                        height: '400px',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <div className="table-header">
                        <h2>
                            데이터 총 ({filtered.length}개) ｜
                            {labelFilter.length > 0
                                ? `선택된 레이블: ${labelFilter.join(", ")}`
                                : "전체 데이터셋"}
                        </h2>
                    </div>
                    <div
                        className="table-wrapper"
                        style={{
                            maxHeight: '380px', // 컨테이너 높이 제한
                            overflowY: 'auto',  // 세로 스크롤
                            overflowX: 'hidden', // 가로 스크롤 필요 없으면 hidden
                        }}
                    >
                        <table className="my-table">
                            <thead>
                                <tr>
                                    <th>값</th>
                                    <th>레이블</th>
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

            </div>
        </div>
    );
}