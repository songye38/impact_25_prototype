import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Train1 from './../trains/Train1';
import Train2 from './../trains/Train2';

export default function Train() {
    const methods = [
        { id: 'learning1',label: '학습방법_1',title : '분류' },
        { id: 'learning2',label: '학습방법_2',title : '회귀' },
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
            </Routes>
        </div>
    );
}


