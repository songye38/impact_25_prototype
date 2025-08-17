import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Main from './pages/Main';
import Collect from './pages/Collect';
import Explore from './pages/Explore';
import Train from './pages/Train';

export default function App() {
  return (
    <Router>
      <Header />
      {/* 헤더가 fixed라서 본문에 paddingTop 줘야 함 */}
      <div style={{ paddingTop: 70 }}>
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/collect/*" element={<Collect />} />
          <Route path="/explore/*" element={<Explore />} />
          <Route path="/train/*" element={<Train />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}
