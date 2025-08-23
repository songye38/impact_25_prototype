import React, { useState, useRef, useEffect } from 'react';
import OrderBox from './../components/OrderBox';

interface SerialPort extends EventTarget {
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
}

export default function Module1() {
    const [labels, setLabels] = useState<string[]>([]);
    const [newLabel, setNewLabel] = useState<string>('');
    const [selectedLabel, setSelectedLabel] = useState<string>('');
    const [hoveredStep, setHoveredStep] = useState<number | null>(null);

    const [buttonPressed, setButtonPressed] = useState(false);

    const [data, setData] = useState<{ [key: string]: number[] }>(() => {
        const initialData: { [key: string]: number[] } = {};
        ['친구1', '친구2', '친구3'].forEach(label => (initialData[label] = []));
        return initialData;
    });

    const [completed, setCompleted] = useState([false, false, false, false, false]);


    // ------------------- 단계 정의 -------------------
    const steps = [
        { label: '아두이노 코드 복사하기', completedLabel: '코드 복사 완료', content: '선생님 도움을 받아 부품을 연결한 뒤, 버튼을 눌러 아두이노 코드를 복사하고 아두이노 소프트웨어에 붙여넣으세요.' },
        { label: '아두이노에 코드 업로드하기', completedLabel: '업로드 완료', content: '부품 연결과 코드 붙여넣기가 끝났다면, 코드를 아두이노에 업로드하세요.' },
        { label: '레이블 입력하기', completedLabel: '레이블 입력 완료', content: '지금 입력하는 값의 특성을 하나 선택해 입력하세요.' },
        { label: '시리얼 연결하기', completedLabel: '시리얼 연결 완료', content: '버튼을 눌러 아두이노와 시리얼 연결을 시작하고 데이터를 받아오세요.' },
        { label: '시리얼 연결해제하기', completedLabel: '시리얼 연결 해제 완료', content: '작업이 끝나면 시리얼 연결을 안전하게 해제하세요.' },
        { label: '데이터 다운받기', completedLabel: '데이터 다운로드 완료', content: '지금까지 입력한 데이터를 버튼을 눌러 파일로 저장하세요.' },
    ];


    const lastCompletedStep = completed.lastIndexOf(true);

    // ------------------- 초기화 핸들러 -------------------
    const handleReset = async () => {
        try {
            if (isConnected) {
                await disconnectSerial();
            }
            setIsConnected(false);
            setCompleted(Array(steps.length).fill(false));
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
                // 아두이노 코드 복사
                try {
                    const response = await fetch('/materials/code/heartbeat_code.txt');
                    const text = await response.text();
                    await navigator.clipboard.writeText(text);
                    alert('코드가 클립보드에 복사되었어!');
                } catch (err) {
                    console.error(err);
                    alert('복사 실패 😢');
                }
            }
            else if (idx === 3) {
                // 시리얼 연결
                try {
                    if (isConnected) {
                        await disconnectSerial();
                        alert('시리얼 연결이 해제되었어!');
                        setCompleted(prev => {
                            const copy = [...prev];
                            copy[idx] = false;
                            return copy;
                        });
                    } else {
                        await connectSerial();
                        alert('시리얼이 연결되었어!');
                        setCompleted(prev => {
                            const copy = [...prev];
                            copy[idx] = true;
                            return copy;
                        });
                    }
                } catch (err: any) {
                    if (err?.message !== 'USER_CANCELLED') {
                        console.error(err);
                        alert('시리얼 연결/해제 실패 😢');
                    }
                }
                return; // 완료 토글 중복 방지
            }
            else if (idx === 5) {
                // 데이터 다운로드 단계
                const allLabels = Object.keys(data);
                if (allLabels.length === 0) {
                    alert('저장할 데이터가 없어요 😢');
                    return;
                }

                const txtRows: string[] = [];

                allLabels.forEach(label => {
                    const values = data[label] || [];
                    values.forEach(val => {
                        txtRows.push(`${val},${label}`);
                    });
                });

                const txtContent = txtRows.join('\n');

                const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
                const url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = 'data.txt';
                link.click();
                URL.revokeObjectURL(url);

                alert('텍스트 파일이 다운로드되었어!');

                setCompleted(prev => {
                    const copy = [...prev];
                    copy[idx] = true;
                    return copy;
                });

                return;
            }




            // 공통 완료 토글
            setCompleted(prev => {
                const copy = [...prev];
                copy[idx] = !copy[idx];
                return copy;
            });
        }
    };





    const portRef = useRef<SerialPort | null>(null);
    const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const bufferRef = useRef<string>('');


    // ------------------- 레이블 추가 함수 -------------------
    function addLabel() {
        const trimmed = newLabel.trim();
        if (trimmed === '') return;
        if (labels.includes(trimmed)) {
            alert('이미 존재하는 레이블입니다.');
            return;
        }
        setLabels(prev => [...prev, trimmed]);
        setData(prev => ({ ...prev, [trimmed]: [] }));
        setSelectedLabel(trimmed);
        setNewLabel('');
    }

    const connectingRef = useRef(false);
    const selectedLabelRef = useRef(selectedLabel);
    useEffect(() => {
        selectedLabelRef.current = selectedLabel;
    }, [selectedLabel]);

    // ------------------- 시리얼 연결 및 데이터 받기 -------------------
    async function connectSerial() {
        if (connectingRef.current) return;
        connectingRef.current = true;
        try {
            const port = await (navigator as any).serial.requestPort();
            await port.open({ baudRate: 9600 });
            portRef.current = port;
            setIsConnected(true);

            const decoder = new TextDecoderStream();
            port.readable!.pipeTo(decoder.writable).catch(() => { });
            const reader = decoder.readable.getReader();
            readerRef.current = reader;

            (async function readLoop() {
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        if (!value) continue;

                        if (value.includes("BUTTON_PRESSED")) {
                            setButtonPressed(true);
                            setTimeout(() => setButtonPressed(false), 3000);
                        }

                        bufferRef.current += value;
                        const lines = bufferRef.current.split('\n');
                        bufferRef.current = lines.pop() || '';
                        for (const line of lines) {
                            const num = parseInt(line.trim());
                            if (!Number.isNaN(num) && selectedLabelRef.current) {
                                // 🔑 항상 최신 레이블 참조
                                setData(prev => {
                                    const label = selectedLabelRef.current;
                                    if (!label) return prev;
                                    return {
                                        ...prev,
                                        [label]: [...(prev[label] || []), num],
                                    };
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error('read loop error:', e);
                }
            })();

            return;
        } catch (error: any) {
            if (error?.name === 'NotFoundError') {
                throw new Error('USER_CANCELLED');
            }
            throw error;
        } finally {
            connectingRef.current = false;
        }
    }

    // ------------------- 시리얼 연결 해제 -------------------
    async function disconnectSerial() {
        try {
            const reader = readerRef.current;
            if (reader) {
                try { await reader.cancel(); } catch { }
                try { reader.releaseLock(); } catch { }
                readerRef.current = null;
            }
            const port = portRef.current;
            if (port) {
                try { await port.close(); } catch { }
                portRef.current = null;
            }
        } finally {
            setIsConnected(false);
        }
    }


    // 모달 스타일 (중앙 고정 + 배경 어둡게)
    const modalStyle: React.CSSProperties = {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        zIndex: 1001,
        fontSize: 24,
        textAlign: 'center',
        minWidth: 280,
    };

    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 1000,
    };

    return (
        <div style={{ padding: 30, fontFamily: "'Noto Sans KR', sans-serif", color: '#222',display:'flex',flexDirection:'column',gap: '20px' }}>
            <h1>프로젝트 1</h1>


            {/*  1️⃣ 과정(Process) 단계 */}
            <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <h2 style={{ margin: 0 }}>실습 단계 안내</h2>
                    <p>단계별로 진행하며 완료된 단계는 체크 표시로 확인할 수 있어요.</p>

                    <button
                        style={{
                            fontSize: 16,
                            fontWeight: '600',
                            padding: '10px 20px',
                            borderRadius: 8,
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: '#f0ad4e', // 주황 계열로 경고 느낌
                            color: 'white',
                            display: 'flex',        // 버튼 안에 flex 적용
                            alignItems: 'center',   // 세로 중앙 정렬
                            gap: 8,                 // 아이콘과 텍스트 간격
                            transition: 'background-color 0.3s ease', // hover 부드럽게
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e59400')} // hover 진한 주황
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#f0ad4e')}   // 원래 색으로 복원
                        onClick={handleReset}
                    >
                        <img
                            src="/icons/alert.svg"
                            alt="reset icon"
                            style={{ width: 20, height: 20 }}
                        />
                        처음부터 시작하기 (<strong>초기화</strong>)
                    </button>

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
                        {steps.map((btn, i) => (
                            <OrderBox
                                step={i + 1}
                                label={completed[i] ? btn.completedLabel : btn.label} // 여기 수정
                                content={btn.content}
                                completed={completed[i]}
                                onClick={() => handleClick(i)}
                                disabled={!(i <= lastCompletedStep + 1)}
                            />
                        ))}
                    </div>

                    {/* 전체 폭으로 hover 내용 표시 */}
                    {hoveredStep !== null && (
                        <div style={{
                            width: '100%',
                            marginTop: 12,
                            padding: 16,
                            backgroundColor: '#f5f5f5',
                            borderRadius: 8,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            minHeight: 50,
                            transition: 'all 0.3s ease',
                            fontSize: 18,
                            fontFamily: "Pretendard, sans-serif",
                            fontWeight: '500',
                        }}>
                            {steps[hoveredStep].content}
                        </div>
                    )}
                </div>
            </div>

            {/* 2️⃣ 모듈 1 레이블 선택 및 추가 */}
            <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                <h2 style={{ marginBottom: 16 }}>레이블 선택 및 추가</h2>
                <p>선택된 레이블은 체크 표시로 확인할 수 있어요.</p>
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
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                addLabel();
                            }
                        }}
                    />
                    <button
                        onClick={addLabel}
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
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',   // 👉 여러 줄 허용 (자동 줄바꿈)
                    alignItems: 'center',
                    marginBottom: '30px',
                }}>
                    {labels.length === 0 && (
                        <p style={{ fontSize: 20, color: 'black' }}>레이블이 없습니다. 새 레이블을 추가하세요.</p>
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
                                display: 'flex',           // 👉 아이콘 + 텍스트 배치 위해 flex 추가
                                alignItems: 'center',
                                gap: '8px',                // 아이콘과 텍스트 간격
                            }}
                            onClick={() => setSelectedLabel(label)}
                        >
                            {label}
                            {/* 선택된 경우 체크 아이콘 표시 */}
                            {selectedLabel === label && (
                                <img
                                    src="/icons/colored-check.svg"   // 👉 다운받은 이미지 경로
                                    alt="선택됨"
                                    style={{ width: 20, height: 20 }}
                                />
                            )}
                        </button>
                    ))}

                </div>

            </div>

            {/* 3️⃣ 선택한 레이블과 값 받기 */}
            <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                <h2>라벨 선택 및 데이터 수집</h2>
                <p>시리얼 연결 버튼을 누르면, 아래 창에서 수집된 데이터를 확인할 수 있어요.</p>
                <h3 style={{ marginBottom: 14 }}>
                    선택된 레이블: <span style={{ color: '#153F76' }}>{selectedLabel || '없음'}</span>
                </h3>

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
                    {data[selectedLabel]?.map((val, i) => (
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
                    ))}
                    {!data[selectedLabel]?.length && (
                        <p style={{ fontSize: 24, color: 'black', fontWeight: 700, textAlign: 'center', marginTop: 20 }}>
                            아직은 연결되지 않아 데이터가 없습니다.
                        </p>
                    )}
                </div>

                {buttonPressed && (
                    <>
                        <div style={overlayStyle} />
                        <div style={modalStyle}>
                            <p>🔔 아두이노 버튼이 눌렸어요!</p>
                            <button
                                onClick={() => setButtonPressed(false)}
                                style={{
                                    marginTop: 24,
                                    fontSize: 20,
                                    padding: '8px 18px',
                                    borderRadius: 8,
                                    border: 'none',
                                    backgroundColor: '#153F76',
                                    color: 'white',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 8px rgba(25, 118, 210, 0.5)',
                                }}
                            >
                                닫기
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}