import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Method1 from './../methods/Method1';

export default function Explore() {


    return (
        <div>
            {/* 하위 라우트 렌더링 */}
            <Routes>
                {/* /collect 접속 시 기본 리다이렉트 혹은 모듈1 렌더 */}
                <Route index element={<Navigate to="method1" replace />} />
                <Route path="method1" element={<Method1 />} />
            </Routes>
        </div>
    );
}


