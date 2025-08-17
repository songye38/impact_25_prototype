import React, { useState } from 'react';
import OrderBox from '../components/OrderBox';



export default function Train2() {
    const [completed, setCompleted] = useState([false, false, false, false, false]);
    const steps = [
        { label: '데이터 불러오기', content: '센서 값의 범위를 파악 (예: 심박수 40~160).' },
        { label: '데이터 확인', content: '사용할 전체 구간 설정.' },
        { label: '범위 정의 & 구간 분리', content: '구간을 몇 단계로 나눔 (낮음/보통/높음).' },
        { label: '패턴 설계', content: '구간에 이름 붙이고 소리·진동 대응 (예: 높음=빠른 진동).' },
        { label: '청각/촉각 출력', content: '입력값을 구간에 맞춰 출력 + 저장.' },
    ];


    //데이터 불러오기에서 내 데이터를 사용할수도 잇고 내가 예시로 제공하는 데이터를 사용할수도 잇음
    //붓꽃 데이터
    //1. 타이타닉 생존자 데이터
    // TODO 2. 기존 데이터셋 자체를 정제해서 간단하게 가져와야 한다. 

    // 가장 마지막으로 완료된 단계 인덱스 찾기 (예: 0부터 시작)
    const lastCompletedStep = completed.lastIndexOf(true);

    const handleClick = (idx: number) => {
        // 현재 단계가 활성화 가능한 단계인지 체크
        if (idx <= lastCompletedStep + 1) {
            setCompleted(prev => {
                const copy = [...prev];
                copy[idx] = !copy[idx]; // 토글
                return copy;
            });
        }
    };


    return (
        <div style={{ padding: 30, fontFamily: "'Noto Sans KR', sans-serif", color: '#222' }}>

            <h1>학습방법1 - 회귀</h1>
            {/* 순서도 부분 */}
            <div style={{
                display: 'flex',
                gap: 16,
                overflowX: 'auto',
                padding: 12,
                flexWrap: 'nowrap'
            }}>
                {steps.map((btn, i) => (
                    <OrderBox
                        key={btn.label}
                        step={i + 1}
                        label={btn.label}
                        content={btn.content}
                        completed={completed[i]}
                        onClick={() => handleClick(i)}
                        disabled={!(i <= lastCompletedStep + 1)}  // 비활성화 조건
                    />
                ))}
            </div>
        </div>
    );
}