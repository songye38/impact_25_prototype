// Collect.tsx
import React from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import Module1 from './../modules/Module1';
import Module2 from './../modules/Module2';
import Module3 from './../modules/Module3';
import Module4 from './../modules/Module4';
import Module5 from './../modules/Module5';

export default function Collect() {
    const modules = [
        { id: 'module1', label: '프로젝트 1', title: '심박 센서로 심장 박동 기록하기' },
        { id: 'module2', label: '프로젝트 2', title: '조도 센서로 빛 세기 기록하기' },
        { id: 'module3', label: '프로젝트 3', title: '컬러 센서로 색상 값 측정하기' },
        { id: 'module4', label: '프로젝트 4', title: '소리 센서로 소리 크기 측정하기' },
        { id: 'module5', label: '프로젝트 5', title: '업데이트 버전 테스트' },
    ];

    const location = useLocation();
    const activeModuleId =
        modules.find(m => location.pathname.startsWith(`/collect/${m.id}`))?.id || 'module1';

    return (
        <div>
            {/* 접근성 고려: 탭 네비게이션 */}
            <nav
                role="tablist"
                aria-label="프로젝트 선택"
                style={{
                    display: 'flex',
                    gap: 12,
                    padding: '30px',
                    overflowX: 'auto',
                    marginTop:12,
                }}
            >
                {modules.map(mod => {
                    const isActive = activeModuleId === mod.id;
                    return (
                        <NavLink
                            key={mod.id}
                            id={`tab-${mod.id}`}
                            to={`/collect/${mod.id}`}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`panel-${mod.id}`}
                            aria-label={`${mod.label}, ${mod.title}${isActive ? ' (선택됨)' : ''}`}
                            style={{
                                minWidth: 200,
                                padding: '16px 20px',
                                borderRadius: 10,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'flex-start',
                                backgroundColor: isActive ? '#e3f2fd' : '#f8f8f8',
                                border: isActive ? '2px solid #153F76' : '1px solid #ccc',
                                fontSize: 18,
                                fontWeight: 500,
                                color: '#111',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <div style={{ fontWeight: 700, fontSize: 18 }}>{mod.label}</div>
                                {isActive && (
                                    <img
                                        src="/icons/colored-check.svg"
                                        alt="선택됨"
                                        style={{ width: 20, height: 20 }} // marginTop 제거
                                    />
                                )}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 400, marginTop: 4 }}>{mod.title}</div>

                        </NavLink>
                    );
                })}
            </nav>

            {/* 탭 패널 */}
            <div
                role="tabpanel"
                id={`panel-${activeModuleId}`}
                aria-labelledby={`tab-${activeModuleId}`}
                aria-live="polite"
                style={{
                    padding: 20,
                    marginTop: 12,
                    border: '1px solid #e5e5e5',
                    borderRadius: 12,
                    backgroundColor: 'white',
                    minHeight: 400,
                }}
            >
                <Routes>
                    <Route index element={<Navigate to="module1" replace />} />
                    <Route path="module1" element={<Module1 />} />
                    <Route path="module2" element={<Module2 />} />
                    <Route path="module3" element={<Module3 />} />
                    <Route path="module4" element={<Module4 />} />
                    <Route path="module5" element={<Module5 />} />
                </Routes>
            </div>
        </div >
    );
}
