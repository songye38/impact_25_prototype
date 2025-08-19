// import React, { useState, useRef } from 'react';

// interface SerialPort extends EventTarget {
//   open(options: { baudRate: number }): Promise<void>;
//   close(): Promise<void>;
//   readable: ReadableStream<Uint8Array> | null;
//   writable: WritableStream<Uint8Array> | null;
// }

// export default function Collect() {
//   const [labels, setLabels] = useState<string[]>([]);
//   const [newLabel, setNewLabel] = useState<string>('');
//   const [selectedLabel, setSelectedLabel] = useState<string>('');

//   const [buttonPressed, setButtonPressed] = useState(false);

//   const [data, setData] = useState<{ [key: string]: number[] }>(() => {
//     const initialData: { [key: string]: number[] } = {};
//     ['친구1', '친구2', '친구3'].forEach(label => (initialData[label] = []));
//     return initialData;
//   });

//   const portRef = useRef<SerialPort | null>(null);
//   const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const bufferRef = useRef<string>('');

//   function addLabel() {
//     const trimmed = newLabel.trim();
//     if (trimmed === '') return;
//     if (labels.includes(trimmed)) {
//       alert('이미 존재하는 레이블입니다.');
//       return;
//     }
//     setLabels(prev => [...prev, trimmed]);
//     setData(prev => ({ ...prev, [trimmed]: [] }));
//     setSelectedLabel(trimmed);
//     setNewLabel('');
//   }

//   async function connectSerial() {
//     try {
//       const port = await (navigator as any).serial.requestPort();
//       await port.open({ baudRate: 9600 });
//       portRef.current = port;
//       setIsConnected(true);

//       const decoder = new TextDecoderStream();
//       port.readable!.pipeTo(decoder.writable);
//       const reader = decoder.readable.getReader();
//       readerRef.current = reader;

//       while (true) {
//         const { value, done } = await reader.read();
//         if (done) break;

//         if (value) {
//           if (value.includes("BUTTON_PRESSED")) {
//             setButtonPressed(true);
//             setTimeout(() => setButtonPressed(false), 3000);
//           }

//           bufferRef.current += value;
//           const lines = bufferRef.current.split('\n');
//           bufferRef.current = lines.pop() || '';

//           lines.forEach(line => {
//             const num = parseInt(line.trim());
//             if (!isNaN(num)) {
//               setData(prev => {
//                 if (!selectedLabel) return prev;
//                 return {
//                   ...prev,
//                   [selectedLabel]: [...(prev[selectedLabel] || []), num],
//                 };
//               });
//             }
//           });
//         }
//       }
//     } catch (error) {
//       console.error('시리얼 연결 중 오류:', error);
//       setIsConnected(false);
//     }
//   }

// async function disconnectSerial() {
//   setIsConnected(false);

//   if (readerRef.current) {
//     const reader = readerRef.current as any;

//     try {
//       // 잠겨있으면 cancel 가능, 아니면 그냥 releaseLock
//       if (reader.locked) {
//         await reader.cancel();
//       }
//     } catch (e) {
//       console.warn('cancel() 실패:', e);
//     }

//     try {
//       reader.releaseLock();
//     } catch (e) {
//       console.warn('releaseLock() 실패:', e);
//     }

//     readerRef.current = null;
//   }

//   if (portRef.current) {
//     try {
//       await portRef.current.close();
//     } catch (e) {
//       console.warn('포트 닫기 실패:', e);
//     }
//     portRef.current = null;
//   }
// }





//   // 모달 스타일 (중앙 고정 + 배경 어둡게)
//   const modalStyle: React.CSSProperties = {
//     position: 'fixed',
//     top: '50%',
//     left: '50%',
//     transform: 'translate(-50%, -50%)',
//     backgroundColor: 'white',
//     padding: 30,
//     borderRadius: 12,
//     boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
//     zIndex: 1001,
//     fontSize: 24,
//     textAlign: 'center',
//     minWidth: 280,
//   };

//   const overlayStyle: React.CSSProperties = {
//     position: 'fixed',
//     top: 0,
//     left: 0,
//     width: '100vw',
//     height: '100vh',
//     backgroundColor: 'rgba(0,0,0,0.4)',
//     zIndex: 1000,
//   };

//   return (
//     <div style={{ padding: 30, fontFamily: "'Noto Sans KR', sans-serif", color: '#222' }}>
//       <button
//         style={{
//           fontSize: 26,
//           fontWeight: '600',
//           padding: '12px 24px',
//           borderRadius: 8,
//           border: 'none',
//           cursor: 'pointer',
//           backgroundColor: isConnected ? '#ff4d4d' : '#4caf50',
//           color: 'white',
//           marginBottom: 30,
//           boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
//           transition: 'background-color 0.3s ease',
//         }}
//         onClick={isConnected ? disconnectSerial : connectSerial}
//       >
//         {isConnected ? '시리얼 연결 해제' : '시리얼 연결'}
//       </button>
//       <h2 style={{ fontSize: 28, marginBottom: 16 }}>순서</h2>
//       <p style={{ fontSize: 18}}>1. 아두이노 소프트웨어에서 업로드 버튼 누름</p>
//       <p style={{ fontSize: 18}}>2. </p>
//       <p style={{ fontSize: 18 }}>3. </p>
//       <p style={{ fontSize: 18 }}>4. </p>
//       <p style={{ fontSize: 18 }}>5.</p>

//       <h2 style={{ fontSize: 28, marginBottom: 16 }}>레이블 선택 및 추가</h2>
//       <div style={{ marginBottom: 20 }}>
//         {labels.length === 0 && (
//           <p style={{ fontSize: 20, color: 'black' }}>레이블이 없습니다. 새 레이블을 추가하세요.</p>
//         )}
//         {labels.map(label => (
//           <button
//             key={label}
//             style={{
//               fontSize: 20,
//               marginRight: 12,
//               marginBottom: 12,
//               padding: '8px 16px',
//               borderRadius: 8,
//               border: selectedLabel === label ? '2.5px solid #153F76' : '2px solid #ccc',
//               backgroundColor: selectedLabel === label ? '#e3f2fd' : 'white',
//               cursor: 'pointer',
//               fontWeight: selectedLabel === label ? '700' : '500',
//               color: '#333',
//               transition: 'all 0.2s ease',
//             }}
//             onClick={() => setSelectedLabel(label)}
//           >
//             {label}
//           </button>
//         ))}
//       </div>

//       <div style={{ marginBottom: 30 }}>
//         <input
//           type="text"
//           placeholder="새 레이블 입력"
//           value={newLabel}
//           onChange={e => setNewLabel(e.target.value)}
//           style={{
//             fontSize: 20,
//             padding: '10px 14px',
//             borderRadius: 8,
//             border: '2px solid #153F76',
//             width: '250px',
//             outline: 'none',
//           }}
//           onKeyDown={e => {
//             if (e.key === 'Enter') {
//               addLabel();
//             }
//           }}
//         />
//         <button
//           onClick={addLabel}
//           style={{
//             fontSize: 20,
//             marginLeft: 14,
//             padding: '10px 20px',
//             borderRadius: 8,
//             backgroundColor: '#153F76',
//             color: 'white',
//             border: 'none',
//             cursor: 'pointer',
//             boxShadow: '0 4px 8px rgba(25, 118, 210, 0.4)',
//             transition: 'background-color 0.3s ease',
//           }}
//         >
//           추가
//         </button>
//       </div>

//       <h2 style={{ fontSize: 26, marginBottom: 14 }}>
//         선택된 레이블: <span style={{ color: '#153F76' }}>{selectedLabel || '없음'}</span>
//       </h2>

//       <h2 style={{ fontSize: 26, marginBottom: 10 }}>
//         실시간 센서 데이터 {selectedLabel ? `(${selectedLabel})` : ''}
//       </h2>
//       <div
//         style={{
//           maxHeight: 220,
//           overflowY: 'auto',
//           border: '2px solid #153F76',
//           borderRadius: 8,
//           padding: 15,
//           fontFamily: 'monospace',
//           backgroundColor: '#f9fafd',
//         }}
//       >
//         {data[selectedLabel]?.map((val, i) => (
//           <div
//             style={{
//               color: '#333',
//               fontSize: 26,
//               padding: '4px 0',
//               borderBottom: '1px solid #eee',
//             }}
//             key={i}
//           >
//             {val}
//           </div> 
//         ))}
//         {!data[selectedLabel]?.length && (
//           <p style={{ fontSize: 24, color: 'black', fontWeight:700, textAlign: 'center', marginTop: 20 }}>
//             아직은 연결되지 않아 데이터가 없습니다. 
//           </p>
//         )}
//       </div>

//       {buttonPressed && (
//         <>
//           <div style={overlayStyle} />
//           <div style={modalStyle}>
//             <p>🔔 아두이노 버튼이 눌렸어요!</p>
//             <button
//               onClick={() => setButtonPressed(false)}
//               style={{
//                 marginTop: 24,
//                 fontSize: 20,
//                 padding: '8px 18px',
//                 borderRadius: 8,
//                 border: 'none',
//                 backgroundColor: '#153F76',
//                 color: 'white',
//                 cursor: 'pointer',
//                 boxShadow: '0 4px 8px rgba(25, 118, 210, 0.5)',
//               }}
//             >
//               닫기
//             </button>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }



// Collect.tsx
import React from 'react';
import { Routes, Route, NavLink, Outlet, Navigate } from 'react-router-dom';
import Module1 from './../modules/Module1';
import Module2 from './../modules/Module2';
import Module3 from './../modules/Module3';
import Module4 from './../modules/Module4';

export default function Collect() {
    const modules = [
        { id: 'module1',label: '프로젝트_1',title : '심장박동 센서로 심장박동 기록 남기기' },
        { id: 'module2',label: '프로젝트_2',title : '조도 센서로 빛 세기 기록 남기기' },
        { id: 'module3',label: '프로젝트_3',title : '컬러값 찾기' },
        { id: 'module4',label: '프로젝트_4',title : '소리의 크기' },
    ];

    return (
        <div>
            {/* 상단 슬라이더 */}
            <div style={{ display: 'flex', overflowX: 'auto', padding: 12, borderBottom: '2px solid #ccc' }}>
                {modules.map(mod => (
                    <NavLink
                        key={mod.id}
                        to={`/collect/${mod.id}`} // 절대 경로로 변경!
                        style={({ isActive }) => ({
                            width: 240,
                            height : 120,
                            padding: 23,
                            marginRight: 12,
                            borderRadius: 8,
                            backgroundColor:'#f0f0f0',
                            color: 'black',
                            fontWeight: isActive ? '700' : '500',
                            textDecoration: 'none',
                            textAlign: 'center',
                            margin : 12,
                            fontSize:20,
                            outline: isActive ? '3.6px solid #153F76' : 'none',  // 골드색 아웃라인 예시
                        })}
                    >
                        {mod.title}
                    </NavLink>
                ))}
            </div>


            {/* 하위 라우트 렌더링 */}
            <Routes>
                {/* /collect 접속 시 기본 리다이렉트 혹은 모듈1 렌더 */}
                <Route index element={<Navigate to="module1" replace />} />
                <Route path="module1" element={<Module1 />} />
                <Route path="module2" element={<Module2 />} />
                <Route path="module3" element={<Module3 />} />
                <Route path="module4" element={<Module4 />} />
            </Routes>
        </div>
    );
}


