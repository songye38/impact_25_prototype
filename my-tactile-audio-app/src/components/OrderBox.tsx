import React from 'react';

type OrderBoxProps = {
  step: number;                 // 단계 번호 (1, 2, 3 ...)
  label: string;                // 버튼 텍스트
  content: string;              // 복사할 내용 or 표시할 내용 (ex: 부품 연결관계)
  completed?: boolean;          // 완료 상태 여부
  onClick?: () => void;         // 버튼 클릭 콜백
  disabled?: boolean;
};

export default function OrderBox({
  step, label, completed, onClick, disabled,content
}: OrderBoxProps & { disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: 16,
        margin: '12px 0',
        borderRadius: 8,
        border: completed ? '2px solid #4CAF50' : '2px solid #ccc',
        backgroundColor: disabled
          ? '#f0f0f0'
          : completed
            ? '#e6f4ea'
            : '#fff',
        color: disabled ? '#999' : completed ? '#4CAF50' : '#333',
        fontWeight: '600',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: completed ? '0 0 10px rgba(76,175,80,0.5)' : 'none',
        transition: 'all 0.3s ease',
        width: '100%',
        flex: 1,
        minWidth: 240, // 최소 너비 확보 (안그러면 너무 찌그러짐)
      }}
      aria-pressed={completed}
      title={content}
      type="button"
    >
      {/* 단계 번호 */}
      <div
        style={{
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: completed ? '#4CAF50' : disabled ? '#ccc' : '#999',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          fontWeight: '700',
          userSelect: 'none',
          fontSize: 20,
        }}
      >
        {step}
      </div>

      {/* 버튼 텍스트 */}
      <span style={{ fontSize: 18, flexGrow: 2, textAlign: 'left' }}>{label}</span>

      {/* 완료 체크 표시 */}
      {completed && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          fill="#4CAF50"
          viewBox="0 0 24 24"
          style={{ flexShrink: 0 }}
        >
          <path d="M20.285 6.708l-11.39 11.39-5.68-5.68 1.415-1.415 4.265 4.265 9.974-9.974z" />
        </svg>
      )}
    </button>
  );
}
