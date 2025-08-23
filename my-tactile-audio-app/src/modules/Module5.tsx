import React, { useState, useRef, useEffect } from 'react';
import OrderBox from '../components/OrderBox';

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
        { label: '시리얼 연결 해제하기', completedLabel: '시리얼 연결 해제 완료', content: '작업이 끝나면 시리얼 연결을 안전하게 해제하세요.' },
        { label: '데이터 다운받기', completedLabel: '데이터 다운로드 완료', content: '지금까지 입력한 데이터를 버튼을 눌러 파일로 저장하세요.' },
    ];


    const lastCompletedStep = completed.lastIndexOf(true);

    // ------------------- 초기화 핸들러 -------------------
    const handleReset = async () => {
        try {
            // 시리얼 연결 해제
            if (isConnected) {
                await disconnectSerial();
            }
            setIsConnected(false);

            // 단계 완료 상태 초기화
            setCompleted(Array(steps.length).fill(false));

            // 레이블 초기화
            setLabels([]);        // 지금까지 추가한 레이블 제거
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
        <div style={{ padding: 30, fontFamily: "'Noto Sans KR', sans-serif", color: '#222', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h1>프로젝트 1</h1>

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
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <h2 style={{ margin: 0 }}>1단계 아두이노 코드 복사하기</h2>
                    <p style={{ fontSize: 18, lineHeight: '1.5' }}>선생님 도움을 받아 부품을 연결한 뒤, 버튼을 눌러 아두이노 코드를 복사하고 아두이노 소프트웨어에 붙여넣으세요.</p>

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
                            onHover={() => setHoveredStep(0)}
                            onLeave={() => setHoveredStep(null)}
                        />
                    </div>
                </div>
            </div>

            {/*  2️⃣ 과정(Process) 단계 */}
            <div style={{ backgroundColor: '#F5F5F5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <h2 style={{ margin: 0 }}>2단계 코드내용을 아두이노에 업로드하기</h2>
                    <p style={{ fontSize: 18, lineHeight: '1.5' }}>부품 연결과 코드 붙여넣기가 끝났다면, 코드를 아두이노에 업로드하세요.</p>

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
                            onHover={() => setHoveredStep(1)}
                            onLeave={() => setHoveredStep(null)}
                        />

                    </div>
                </div>
            </div>

            {/* 3️⃣ 모듈 1 레이블 선택 및 추가 */}
            <div style={{ backgroundColor: '#F5F5F5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <h2 style={{ margin: 0 }}>3단계 레이블 추가하기</h2>
                    <p style={{ fontSize: 18, lineHeight: '1.5' }}>추가된 레이블은 아래에서 확인할 수 있어요.</p>
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
                        onHover={() => setHoveredStep(2)}
                        onLeave={() => setHoveredStep(null)}
                    />
                </div>

            </div>


            {/* 4️⃣ 선택한 레이블과 값 받기 */}
            <div style={{ backgroundColor: '#F5F5F5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <h2 style={{ margin: 0 }}>4단계 라벨 선택 및 시리얼 연결하기</h2>
                    <p style={{ fontSize: 18, lineHeight: '1.5' }}>시리얼 연결 버튼을 누르면, 아래 창에서 수집된 데이터를 확인할 수 있어요.</p>
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
                        onHover={() => setHoveredStep(3)}
                        onLeave={() => setHoveredStep(null)}
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


            {/*  5️⃣ 과정(Process) 단계 */}
            <div style={{ backgroundColor: '#F5F5F5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <h2 style={{ margin: 0 }}>5단계 시리얼 연결 해제하기</h2>
                    <p style={{ fontSize: 18, lineHeight: '1.5' }}>작업이 끝나면 시리얼 연결을 안전하게 해제하세요.</p>

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
                            onHover={() => setHoveredStep(4)}
                            onLeave={() => setHoveredStep(null)}
                        />


                    </div>
                </div>
            </div>

            {/*  6️⃣ 과정(Process) 단계 */}
            <div style={{ backgroundColor: '#F5F5F5', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <h2 style={{ margin: 0 }}>6단계 수집한 데이터 다운받기</h2>
                    <p style={{ fontSize: 18, lineHeight: '1.5' }}>지금까지 입력한 데이터를 버튼을 눌러 파일로 저장하세요.</p>

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
                            step={6}
                            label={completed[5] ? steps[5].completedLabel : steps[5].label} // steps[5] 사용
                            content={steps[5].content}
                            completed={completed[5]}
                            onClick={() => handleClick(5)}
                            disabled={!(5 <= lastCompletedStep + 1)}
                            onHover={() => setHoveredStep(5)}
                            onLeave={() => setHoveredStep(null)}
                        />

                    </div>
                </div>
            </div>
        </div>
    );
}