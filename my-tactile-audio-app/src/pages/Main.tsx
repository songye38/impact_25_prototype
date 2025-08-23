import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Main() {
  const navigate = useNavigate();

  const buttons = [
    {
      label: '데이터 수집',
      desc: '아두이노 시리얼 데이터를 수집하고 저장하는 기능',
      path: '/collect',
    },
    {
      label: '데이터 탐색',
      desc: '수집된 데이터를 시각화하고 분석하는 기능',
      path: '/explore',
    },
    {
      label: '데이터 학습',
      desc: '수집한 데이터를 기반으로 모델을 학습하는 기능',
      path: '/train',
    },
  ];

  return (
    <div style={{ padding: 40, fontFamily: "'Noto Sans KR', sans-serif", color: '#222',marginTop:60, }}>
      <h1 style={{ fontSize: 36, marginBottom: 30 }}>메인 페이지</h1>
      <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
        {buttons.map(({ label, desc, path }) => (
          <div
            key={label}
            style={{
              border: '2px solid #1976d2',
              borderRadius: 12,
              padding: 24,
              width: 280,
              boxShadow: '0 4px 10px rgba(25, 118, 210, 0.15)',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
            }}
            onClick={() => navigate(path)}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(path); }}
            role="button"
            tabIndex={0}
          >
            <h2 style={{ fontSize: 24, marginBottom: 12, color: '#1976d2' }}>{label}</h2>
            <p style={{ fontSize: 16, color: '#555' }}>{desc}</p>
            <button
              style={{
                marginTop: 20,
                padding: '10px 20px',
                fontSize: 16,
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#1976d2',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 8px rgba(25, 118, 210, 0.4)',
                transition: 'background-color 0.3s ease',
              }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(path);
              }}
            >
              이동하기
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
