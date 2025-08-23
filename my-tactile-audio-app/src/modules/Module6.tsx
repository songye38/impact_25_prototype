import React, { useEffect, useMemo, useRef, useState } from "react";
import { DataPoint, ExplorationKind, MappingKind } from "./../types/methodTypes";
import { options } from "./../types/methodContants";
import { binning, countBy, mean, minMax, slope } from "../utils/math";
import { Tone, tone } from "../audio/Tone";
import { generateArduinoSketch } from "../arduino/generator"
import OrderBox from "../components/OrderBox";


export default function Module6() {
    const [newLabel, setNewLabel] = useState<string>('');
    const [selectedLabel, setSelectedLabel] = useState<string>('');
    const [data, setData] = useState<DataPoint[]>([]);
    const [labelFilter, setLabelFilter] = useState<string[]>([]);

    const [completed, setCompleted] = useState([false, false, false, false, false]);


    // ------------------- 단계 정의 -------------------
    const steps = [
        { label: '1단계 데이터 불러오기', completedLabel: '코드 불러오기 완료', content: '선생님 도움을 받아 부품을 연결한 뒤, 버튼을 눌러 아두이노 코드를 복사하고 아두이노 소프트웨어에 붙여넣으세요.' },
        { label: '2단계 라벨 선택하기', completedLabel: '라벨 선택 완료', content: '부품 연결과 코드 붙여넣기가 끝났다면, 코드를 아두이노에 업로드하세요.' },
        { label: '3단계 탐색 방법 선택하기', completedLabel: '탐색 방법 선택 완료', content: '지금 입력하는 값의 특성을 하나 선택해 입력하세요.' },
        { label: '4단계 감각화 방법 선택하기', completedLabel: '감각화 방법 선택 완료', content: '버튼을 눌러 아두이노와 시리얼 연결을 시작하고 데이터를 받아오세요.' },
        { label: '5단계 아두이노 코드 만들기', completedLabel: '코드 만들기 완료', content: '작업이 끝나면 시리얼 연결을 안전하게 해제하세요.' },
    ];


    const lastCompletedStep = completed.lastIndexOf(true);

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
            }
            else if (idx === 1) {
                // 3번 과정과 관련해서 해야할일은 여기에
            }
            else if (idx === 2) {
                // 3번 과정과 관련해서 해야할일은 여기에
            }
            else if (idx === 3) {
                // 3번 과정과 관련해서 해야할일은 여기에
            }
            else if (idx === 4) {
                // 3번 과정과 관련해서 해야할일은 여기에
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




    return (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'column', gap: '20px',padding:30, boxSizing: 'border-box' }}>
            <h1>데이터 탐색</h1>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row', gap: '20px' }}>
                {/* 순서도가 있는 부분 0 ~ 5단계까지 있음 */}
                <div style={{ fontFamily: "'Noto Sans KR', sans-serif", color: '#222', display: 'flex', flexDirection: 'column', gap: '20px', width: '50%' }}>

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
                                    step={1}
                                    label={completed[0] ? steps[0].completedLabel : steps[0].label} // steps[0] 사용
                                    content={steps[0].content}
                                    completed={completed[0]}
                                    onClick={() => handleClick(0)}
                                    disabled={!(0 <= lastCompletedStep + 1)}
                                />
                            </div>
                        </div>
                    </div>

                    {/*  2️⃣ 과정(Process) 단계 */}
                    <div style={{ backgroundColor: '#F5F5F5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <h2 style={{ margin: 0 }}>{steps[1].label}</h2>
                            <p style={{ fontSize: 18, lineHeight: '1.5' }}>{steps[1].content}</p>

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
                                    step={2}
                                    label={completed[1] ? steps[1].completedLabel : steps[1].label} // steps[1] 사용
                                    content={steps[1].content}
                                    completed={completed[1]}
                                    onClick={() => handleClick(1)}
                                    disabled={!(1 <= lastCompletedStep + 1)}
                                />

                            </div>
                        </div>
                    </div>

                    {/* 3️⃣ 모듈 1 레이블 선택 및 추가 */}
                    <div style={{ backgroundColor: '#F5F5F5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <h2 style={{ margin: 0 }}>{steps[2].label}</h2>
                            <p style={{ fontSize: 18, lineHeight: '1.5' }}>{steps[2].content}</p>
                        </div>
                        <div style={{ marginBottom: 30 }}>
                            <input
                                type="text"
                                placeholder="새 레이블 입력"
                                value={newLabel}
                                onChange={e => setNewLabel(e.target.value)}
                                style={{
                                    fontSize: 20,
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    border: '2px solid #153F76',
                                    width: '250px',
                                    outline: 'none',
                                }}
                            // onKeyDown={e => {
                            //     if (e.key === 'Enter') {
                            //         addLabel();
                            //     }
                            // }}
                            />
                            <button
                                // onClick={addLabel}
                                style={{
                                    fontSize: 20,
                                    marginLeft: 14,
                                    padding: '10px 20px',
                                    borderRadius: 8,
                                    backgroundColor: '#153F76',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.3s ease',
                                }}
                            >
                                추가
                            </button>

                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', marginBottom: '30px' }}>
                            {labels.length === 0 && (
                                <p style={{ fontSize: 18, color: 'black' }}>레이블이 없습니다. 새 레이블을 추가하세요.</p>
                            )}

                            {labels.map(label => (
                                <div
                                    key={label}
                                    style={{
                                        fontSize: 20,
                                        marginRight: 12,
                                        marginBottom: 12,
                                        padding: '8px 16px',
                                        borderRadius: 8,
                                        border: '2px solid #ccc',
                                        backgroundColor: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    {label}
                                </div>
                            ))}
                        </div>
                        {/* 버튼 영역 */}
                        <div style={{
                            display: 'flex',
                            gap: 16,
                            overflowX: 'auto',
                            padding: 12,
                            flexWrap: 'nowrap'
                        }}>
                            <OrderBox
                                step={3} // 화면에 표시될 단계 번호
                                label={completed[2] ? steps[2].completedLabel : steps[2].label} // steps[2] 사용
                                content={steps[2].content}                                        // 3단계 내용
                                completed={completed[2]}                                          // 3단계 완료 상태
                                onClick={() => handleClick(2)}
                                disabled={!(2 <= lastCompletedStep + 1)}                          // 접근 허용
                            />
                        </div>

                    </div>


                    {/* 4️⃣ 선택한 레이블과 값 받기 */}
                    <div style={{ backgroundColor: '#F5F5F5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <h2 style={{ margin: 0 }}>{steps[3].label}</h2>
                            <p style={{ fontSize: 18, lineHeight: '1.5' }}>{steps[3].content}</p>
                        </div>

                        {/* 레이블 선택 버튼 */}
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            marginBottom: '20px',
                        }}>
                            {labels.length === 0 && (
                                <p style={{ fontSize: 18, color: 'black' }}>레이블이 없습니다. 3단계에서 레이블을 추가하세요.</p>
                            )}
                            {labels.map(label => (
                                <button
                                    key={label}
                                    style={{
                                        fontSize: 20,
                                        marginRight: 12,
                                        marginBottom: 12,
                                        padding: '8px 16px',
                                        borderRadius: 8,
                                        border: selectedLabel === label ? '2.5px solid #153F76' : '2px solid #ccc',
                                        backgroundColor: selectedLabel === label ? '#e3f2fd' : 'white',
                                        cursor: 'pointer',
                                        fontWeight: selectedLabel === label ? '700' : '500',
                                        color: '#333',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}
                                    onClick={() => setSelectedLabel(label)}
                                >
                                    {label}
                                    {selectedLabel === label && (
                                        <img
                                            src="/icons/colored-check.svg" // 체크 이미지 경로
                                            alt="선택됨"
                                            style={{ width: 20, height: 20 }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* 버튼 영역 */}
                        <div style={{
                            display: 'flex',
                            gap: 16,
                            overflowX: 'auto',
                            padding: 12,
                            flexWrap: 'nowrap'
                        }}>
                            <OrderBox
                                step={4} // 화면에 표시될 단계 번호
                                label={completed[3] ? steps[3].completedLabel : steps[3].label} // steps[3] 사용
                                content={steps[3].content}                                        // 4단계 내용
                                completed={completed[3]}                                          // 4단계 완료 상태
                                onClick={() => handleClick(3)}
                                disabled={!(3 <= lastCompletedStep + 1)}                          // 접근 허용
                            />
                        </div>





                        <h3 style={{ marginBottom: 10 }}>
                            실시간 센서 데이터 {selectedLabel ? `(${selectedLabel})` : ''}
                        </h3>
                        <div
                            style={{
                                maxHeight: 220,
                                overflowY: 'auto',
                                border: '2px solid #153F76',
                                borderRadius: 8,
                                padding: 15,
                                fontFamily: 'monospace',
                                backgroundColor: '#f9fafd',
                            }}
                        >
                            {/* {data[selectedLabel]?.map((val, i) => (
                                <div
                                    style={{
                                        color: '#333',
                                        fontSize: 26,
                                        padding: '4px 0',
                                        borderBottom: '1px solid #eee',
                                    }}
                                    key={i}
                                >
                                    {val}
                                </div>
                            ))} */}
                            {/* {!data[selectedLabel]?.length && (
                                <p style={{ fontSize: 24, color: 'black', fontWeight: 700, textAlign: 'center', marginTop: 20 }}>
                                    아직은 연결되지 않아 데이터가 없습니다.
                                </p>
                            )} */}
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
                {/* 데이터가 들어오는 부분 */}
                    <div style={{ backgroundColor: '#F5F5F5', padding: '20px', borderRadius: '12px', width: '50%' }}>
                        <div className="table-header">
                            <h2>데이터 총 ({filtered.length}개)</h2>
                            {/* <button onClick={() => setData([])}>초기화</button> */}
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
                </div>
            </div>
    );
}