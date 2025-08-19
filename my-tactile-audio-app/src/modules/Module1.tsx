import React, { useState, useRef } from 'react';
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


    // 순서도 관련 내용
    const steps = [
        { label: '아두이노 코드 복사하기', content: '부품 연결은 선생님의 도움을 받아 진행해주세요. 이 버튼을 클릭해 아두이노 코드를 복사해 아두이노 소프트웨어 창에 복사 붙여넣기해주세요.' },
        { label: '아두이노에 코드 업로드하기', content: '부품 연결과 코드넣기까지 완료했다면 해당 코드를 아두이노로 업로드 해주세요.' },
        { label: '레이블 입력하기', content: '지금 입력받는 값은 어떤 특성을 가지고 있는지 특성을 하나 정해 입력해주세요.' },
        { label: '시리얼 연결하기', content: '시리얼 연결하기를 눌러 아두이노로부터 값을 입력받으세요.' },
        { label: '시리얼 연결해제하기', content: '시리얼 연결을 안전하게 해제하여 연결을 마무리 지으세요.' },
        { label: '데이터 저장하기', content: '버튼을 눌러 지금까지 입력 받은 값을 파일로 저장하세요.' },
    ];

    // 가장 마지막으로 완료된 단계 인덱스 찾기 (예: 0부터 시작)
    const lastCompletedStep = completed.lastIndexOf(true);

    // 단계 클릭 핸들러
    // const handleClick = async (idx: number) => {
    //     if (idx <= lastCompletedStep + 1) {
    //         // 1,2단계는 복사 기능 추가
    //         if (idx === 0) {
    //             try {
    //                 const response = await fetch('/materials/connection/heartbeat_connection.txt'); // public/files/parts.txt
    //                 const text = await response.text();
    //                 console.log("connection text",text);
    //                 await navigator.clipboard.writeText(text);
    //                 alert('부품 연결관계가 클립보드에 복사되었어!');
    //             } catch (err) {
    //                 console.error(err);
    //                 alert('복사 실패 😢');
    //             }
    //         } else if (idx === 1) {
    //             try {
    //                 const response = await fetch('/materials/code/heartbeat_code.txt'); // public/files/arduino.txt
    //                 const text = await response.text();
    //                 console.log("code text",text);
    //                 await navigator.clipboard.writeText(text);
    //                 alert('아두이노 코드가 클립보드에 복사되었어!');
    //             } catch (err) {
    //                 console.error(err);
    //                 alert('복사 실패 😢');
    //             }
    //         }

    //         // 토글 처리 (공통)
    //         setCompleted(prev => {
    //             const copy = [...prev];
    //             copy[idx] = !copy[idx];
    //             return copy;
    //         });
    //     }
    // };

    // 초기화 핸들러
    const handleReset = async () => {
        try {
            // 시리얼 연결 해제
            if (isConnected) {
                await disconnectSerial();
            }
            setIsConnected(false);

            // steps 완료 상태 초기화
            setCompleted(Array(steps.length).fill(false));

            alert('모든 단계를 초기화했어. 처음부터 다시 시작할 수 있어!');
        } catch (err) {
            console.error(err);
            alert('초기화 중 오류가 발생했어 😢');
        }
    };
    // 단계 클릭 핸들러
    const handleClick = async (idx: number) => {
        if (idx <= lastCompletedStep + 1) {
            if (idx === 0) {
                try {
                    const response = await fetch('/materials/code/heartbeat_code.txt');
                    const text = await response.text();
                    await navigator.clipboard.writeText(text);
                    alert('코드가 클립보드에 복사되었어!');
                } catch (err) {
                    console.error(err);
                    alert('복사 실패 😢');
                }
            } else if (idx === 3) {
                try {
                    if (isConnected) {
                        await disconnectSerial();
                        alert('시리얼 연결이 해제되었어!');
                        // 성공했을 때만 완료 토글/해제
                        setCompleted(prev => {
                            const copy = [...prev];
                            copy[idx] = false; // 해제 시 완료도 해제하고 싶다면
                            return copy;
                        });
                    } else {
                        await connectSerial(); // ✅ 이제 즉시 반환됨
                        alert('시리얼이 연결되었어!');
                        setCompleted(prev => {
                            const copy = [...prev];
                            copy[idx] = true; // 연결 성공 시 완료 체크
                            return copy;
                        });
                    }
                } catch (err: any) {
                    if (err?.message === 'USER_CANCELLED') {
                        // 사용자 취소 → 완료 상태 변경하지 않음
                        console.log('포트 선택 취소');
                    } else {
                        console.error(err);
                        alert('시리얼 연결/해제 실패 😢');
                    }
                }
                // ✅ 공통 완료 토글 로직이 아래에 있다면, 여기서 return으로 빠져 중복 토글 방지
                return;
            }


            // ✅ 공통 완료 토글 처리
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


    // 레이블 추가 함수
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


    // async function connectSerial() {
    //     try {
    //         const port = await (navigator as any).serial.requestPort();
    //         await port.open({ baudRate: 9600 });
    //         portRef.current = port;
    //         setIsConnected(true);

    //         const decoder = new TextDecoderStream();
    //         port.readable!.pipeTo(decoder.writable);
    //         const reader = decoder.readable.getReader();
    //         readerRef.current = reader;

    //         while (true) {
    //             const { value, done } = await reader.read();
    //             if (done) break;

    //             if (value) {
    //                 if (value.includes("BUTTON_PRESSED")) {
    //                     setButtonPressed(true);
    //                     setTimeout(() => setButtonPressed(false), 3000);
    //                 }

    //                 bufferRef.current += value;
    //                 const lines = bufferRef.current.split('\n');
    //                 bufferRef.current = lines.pop() || '';

    //                 lines.forEach(line => {
    //                     const num = parseInt(line.trim());
    //                     if (!isNaN(num)) {
    //                         setData(prev => {
    //                             if (!selectedLabel) return prev;
    //                             return {
    //                                 ...prev,
    //                                 [selectedLabel]: [...(prev[selectedLabel] || []), num],
    //                             };
    //                         });
    //                     }
    //                 });
    //             }
    //         }
    //     } catch (error: any) {
    //         if (error.name === 'NotFoundError') {
    //             // 사용자가 포트 선택 창에서 취소 눌렀을 때
    //             console.log('시리얼 포트 선택이 취소되었어.');
    //             alert('시리얼 포트 선택을 취소했어.');
    //         } else {
    //             console.error('시리얼 연결 중 오류:', error);
    //             alert('시리얼 연결 중 오류가 발생했어 😢');
    //         }
    //         setIsConnected(false);
    //     }
    // }


    // async function disconnectSerial() {
    //     setIsConnected(false);

    //     if (readerRef.current) {
    //         const reader = readerRef.current as any;

    //         try {
    //             // 잠겨있으면 cancel 가능, 아니면 그냥 releaseLock
    //             if (reader.locked) {
    //                 await reader.cancel();
    //             }
    //         } catch (e) {
    //             console.warn('cancel() 실패:', e);
    //         }

    //         try {
    //             reader.releaseLock();
    //         } catch (e) {
    //             console.warn('releaseLock() 실패:', e);
    //         }

    //         readerRef.current = null;
    //     }

    //     if (portRef.current) {
    //         try {
    //             await portRef.current.close();
    //         } catch (e) {
    //             console.warn('포트 닫기 실패:', e);
    //         }
    //         portRef.current = null;
    //     }
    // }




    const connectingRef = useRef(false);

    async function connectSerial() {
        if (connectingRef.current) return;
        connectingRef.current = true;
        try {
            const port = await (navigator as any).serial.requestPort(); // 사용자 제스처 내에서 호출
            await port.open({ baudRate: 9600 });
            portRef.current = port;
            setIsConnected(true);

            const decoder = new TextDecoderStream();
            // pipeTo는 기다리지 말고 걸어두기만
            port.readable!.pipeTo(decoder.writable).catch(() => { });
            const reader = decoder.readable.getReader();
            readerRef.current = reader;

            // 🔄 읽기 루프는 'fire-and-forget'
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
                            if (!Number.isNaN(num)) {
                                setData(prev => {
                                    if (!selectedLabel) return prev;
                                    return {
                                        ...prev,
                                        [selectedLabel]: [...(prev[selectedLabel] || []), num],
                                    };
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error('read loop error:', e);
                }
            })();

            // ✅ 여기서 바로 반환되므로 handleClick이 이어서 실행됨
            return;
        } catch (error: any) {
            if (error?.name === 'NotFoundError') {
                // 사용자 포트 선택 취소 → 호출부에서 구분할 수 있게 throw
                throw new Error('USER_CANCELLED');
            }
            throw error;
        } finally {
            connectingRef.current = false;
        }
    }

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
        <div style={{ padding: 30, fontFamily: "'Noto Sans KR', sans-serif", color: '#222' }}>
            {/* TODO 1. 시리얼 연결 부분 함수로 만들어서 버튼과 연결해야 한다 */}
            {/* <button
                style={{
                    fontSize: 26,
                    fontWeight: '600',
                    padding: '12px 24px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: isConnected ? '#ff4d4d' : '#4caf50',
                    color: 'white',
                    marginBottom: 30,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                    transition: 'background-color 0.3s ease',
                }}
                onClick={isConnected ? disconnectSerial : connectSerial}
            >
                {isConnected ? '시리얼 연결 해제' : '시리얼 연결'}
            </button> */}
            <h1>프로젝트 1</h1>
            {/* 순서도 부분 */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <h2 style={{ margin: 0 }}>과정</h2>
                <h3>총 6단계로 진행됩니다.</h3>

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
                            label={btn.label}
                            content={btn.content}
                            completed={completed[i]}
                            onClick={() => handleClick(i)}
                            disabled={!(i <= lastCompletedStep + 1)}
                            onHover={() => setHoveredStep(i)} //추가
                            onLeave={() => setHoveredStep(null)} //추가
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

            <h2 style={{ marginBottom: 16 }}>모듈 1레이블 선택 및 추가</h2>
            <div style={{ marginBottom: 20 }}>
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
                        }}
                        onClick={() => setSelectedLabel(label)}
                    >
                        {label}
                    </button>
                ))}
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
                        boxShadow: '0 4px 8px rgba(25, 118, 210, 0.4)',
                        transition: 'background-color 0.3s ease',
                    }}
                >
                    추가
                </button>
            </div>


            <h2 style={{ marginBottom: 14 }}>
                선택된 레이블: <span style={{ color: '#153F76' }}>{selectedLabel || '없음'}</span>
            </h2>

            <h2 style={{ marginBottom: 10 }}>
                실시간 센서 데이터 {selectedLabel ? `(${selectedLabel})` : ''}
            </h2>
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
    );
}