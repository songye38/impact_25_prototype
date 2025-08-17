import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Train1 from './../trains/Train1';
import Train2 from './../trains/Train2';
import Train3 from './../trains/Train3';
import Train4 from './../trains/Train4';
import Train5 from './../trains/Train5';

export default function Train() {
    const methods = [
        { id: 'learning1',label: '학습방법_1',title : '분류' },
        { id: 'learning2',label: '학습방법_2',title : '회귀' },
        { id: 'learning3',label: '학습방법_3',title : '미정' },
        { id: 'learning4',label: '학습방법_4',title : '미정' },
        { id: 'learning5',label: '학습방법_5',title : '미정' },
    ];

    return (
        <div>
            {/* 상단 슬라이더 */}
            <div style={{ display: 'flex', overflowX: 'auto', padding: 12, borderBottom: '2px solid #ccc' }}>
                {methods.map(mod => (
                    <NavLink
                        key={mod.id}
                        to={`/train/${mod.id}`} // 절대 경로로 변경!
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
                <Route index element={<Navigate to="learning1" replace />} />
                <Route path="learning1" element={<Train1 />} />
                <Route path="learning2" element={<Train2 />} />
                <Route path="learning3" element={<Train3 />} />
                <Route path="learning4" element={<Train4 />} />
                <Route path="learning5" element={<Train5 />} />
            </Routes>
        </div>
    );
}


