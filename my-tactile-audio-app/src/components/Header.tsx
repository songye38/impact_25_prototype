import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Header() {
  const navItems = [
    { label: '홈', path: '/' },
    { label: '데이터 수집', path: '/collect' },
    { label: '데이터 탐색', path: '/explore' },
    { label: '데이터 학습', path: '/train' },
  ];

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '96vw',
        backgroundColor: 'white',
        color: 'black',
        display: 'flex',
        alignItems: 'center',
        padding: '24px 30px',
        // boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1100,
        fontFamily: "'Pretendard', sans-serif",
        paddingBottom: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '7px',
          alignItems: 'center',      // 세로 중앙
          justifyContent: 'center',  // 가로 중앙
        }}
      >
        <div
          style={{
            color: '#2F6EBF',
            fontSize: 52,
            fontWeight: '400',
            cursor: 'default',
            userSelect: 'none',
            fontFamily: "McLaren",
          }}
        >
          Tecky
        </div>
        <div
          style={{
            color: '#045ACB',
            fontSize: 20,
            fontWeight: '500',
            cursor: 'default',
            userSelect: 'none',
            fontFamily: "Outfit",
          }}
        >
          for student
        </div>
      </div>


      <nav style={{ marginLeft: 'auto', display: 'flex', gap: 24 }}>
        {navItems.map(({ label, path }) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              color: 'black',
              textDecoration: 'none',
              fontSize: 18,
              fontWeight: isActive ? '700' : '500',
              borderBottom: isActive ? '2px solid black' : 'none',
              paddingBottom: 4,
              transition: 'color 0.2s ease',
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header >
  );
}
