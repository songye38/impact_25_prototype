import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Method1 from './../methods/Method1';
import Method2 from './../methods/Method2';
import Method3 from './../methods/Method3';
import Method4 from './../methods/Method4';

export default function Explore() {
    const methods = [
        { id: 'method1',label: '방법_1',title : '범주화' },
        { id: 'method2',label: '방법_2',title : '통계 / 평균' },
        { id: 'method3',label: '방법_3',title : '변화량' },
        { id: 'method4',label: '방법_4',title : '정규화' },
    ];

    return (
        <div>
            {/* 상단 슬라이더 */}
            <div style={{ display: 'flex', overflowX: 'auto', padding: 12, borderBottom: '2px solid #ccc' }}>
                {methods.map(mod => (
                    <NavLink
                        key={mod.id}
                        to={`/explore/${mod.id}`} // 절대 경로로 변경!
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
                <Route index element={<Navigate to="method1" replace />} />
                <Route path="method1" element={<Method1 />} />
                <Route path="method2" element={<Method2 />} />
                <Route path="method3" element={<Method3 />} />
                <Route path="method4" element={<Method4 />} />
            </Routes>
        </div>
    );
}


