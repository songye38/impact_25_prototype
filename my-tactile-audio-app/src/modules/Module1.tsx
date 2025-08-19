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

    const [buttonPressed, setButtonPressed] = useState(false);

    const [data, setData] = useState<{ [key: string]: number[] }>(() => {
        const initialData: { [key: string]: number[] } = {};
        ['친구1', '친구2', '친구3'].forEach(label => (initialData[label] = []));
        return initialData;
    });

    const [completed, setCompleted] = useState([false, false, false, false, false]);

    const steps = [
        { label: '부품 연결관계 복사하기', content: '부품 연결관계 텍스트...' },
        { label: '아두이노 코드 복사하기', content: '아두이노 코드 텍스트...' },
        { label: '아두이노로 코드 업로드', content: '업로드 내용...' },
        { label: '시리얼 연결하기', content: '시리얼 연결 명령어...' },
        { label: '데이터 저장하기', content: '저장할 데이터...' },
    ];

    // 가장 마지막으로 완료된 단계 인덱스 찾기 (예: 0부터 시작)
    const lastCompletedStep = completed.lastIndexOf(true);

    // const handleClick = (idx: number) => {
    //     // 현재 단계가 활성화 가능한 단계인지 체크
    //     if (idx <= lastCompletedStep + 1) {
    //         setCompleted(prev => {
    //             const copy = [...prev];
    //             copy[idx] = !copy[idx]; // 토글
    //             return copy;
    //         });
    //     }
    // };

    const handleClick = async (idx: number) => {
        if (idx <= lastCompletedStep + 1) {
            // 1,2단계는 복사 기능 추가
            if (idx === 0) {
                try {
                    const response = await fetch('/materials/connection/heartbeat_connection.txt'); // public/files/parts.txt
                    const text = await response.text();
                    console.log("connection text",text);
                    await navigator.clipboard.writeText(text);
                    alert('부품 연결관계가 클립보드에 복사되었어!');
                } catch (err) {
                    console.error(err);
                    alert('복사 실패 😢');
                }
            } else if (idx === 1) {
                try {
                    const response = await fetch('/materials/code/heartbeat_code.txt'); // public/files/arduino.txt
                    const text = await response.text();
                    console.log("code text",text);
                    await navigator.clipboard.writeText(text);
                    alert('아두이노 코드가 클립보드에 복사되었어!');
                } catch (err) {
                    console.error(err);
                    alert('복사 실패 😢');
                }
            }

            // 토글 처리 (공통)
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

    async function connectSerial() {
        try {
            const port = await (navigator as any).serial.requestPort();
            await port.open({ baudRate: 9600 });
            portRef.current = port;
            setIsConnected(true);

            const decoder = new TextDecoderStream();
            port.readable!.pipeTo(decoder.writable);
            const reader = decoder.readable.getReader();
            readerRef.current = reader;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                if (value) {
                    if (value.includes("BUTTON_PRESSED")) {
                        setButtonPressed(true);
                        setTimeout(() => setButtonPressed(false), 3000);
                    }

                    bufferRef.current += value;
                    const lines = bufferRef.current.split('\n');
                    bufferRef.current = lines.pop() || '';

                    lines.forEach(line => {
                        const num = parseInt(line.trim());
                        if (!isNaN(num)) {
                            setData(prev => {
                                if (!selectedLabel) return prev;
                                return {
                                    ...prev,
                                    [selectedLabel]: [...(prev[selectedLabel] || []), num],
                                };
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.error('시리얼 연결 중 오류:', error);
            setIsConnected(false);
        }
    }

    async function disconnectSerial() {
        setIsConnected(false);

        if (readerRef.current) {
            const reader = readerRef.current as any;

            try {
                // 잠겨있으면 cancel 가능, 아니면 그냥 releaseLock
                if (reader.locked) {
                    await reader.cancel();
                }
            } catch (e) {
                console.warn('cancel() 실패:', e);
            }

            try {
                reader.releaseLock();
            } catch (e) {
                console.warn('releaseLock() 실패:', e);
            }

            readerRef.current = null;
        }

        if (portRef.current) {
            try {
                await portRef.current.close();
            } catch (e) {
                console.warn('포트 닫기 실패:', e);
            }
            portRef.current = null;
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
            <h1>프로젝트 1(처음부터 다시 시작 버튼 추가)</h1>
            {/* 순서도 부분 */}
            <h2>과정</h2>
            <div style={{
                display: 'flex',
                gap: 16,
                overflowX: 'auto',
                padding: 12,
                flexWrap: 'nowrap'
            }}>
                {steps.map((btn, i) => (
                    <OrderBox
                        key={btn.label}
                        step={i + 1}
                        label={btn.label}
                        content={btn.content}
                        completed={completed[i]}
                        onClick={() => handleClick(i)}
                        disabled={!(i <= lastCompletedStep + 1)}  // 비활성화 조건
                    />
                ))}
            </div>

            <h2 style={{ fontSize: 28, marginBottom: 16 }}>모듈 1레이블 선택 및 추가</h2>
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


            <h2 style={{ fontSize: 26, marginBottom: 14 }}>
                선택된 레이블: <span style={{ color: '#153F76' }}>{selectedLabel || '없음'}</span>
            </h2>

            <h2 style={{ fontSize: 26, marginBottom: 10 }}>
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