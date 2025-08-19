// Collect.tsx
import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
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


