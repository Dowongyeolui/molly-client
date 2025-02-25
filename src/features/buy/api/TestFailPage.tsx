'use client';

import {useSearchParams} from 'next/navigation';

// 결제 실패 페이지
export function TestFailPage() {
  const searchParams = useSearchParams();

  return (
    <div className="result wrapper">
      <div className="box_section">
        <h2>결제 실패</h2>
        <p>{`에러 코드: ${searchParams.get('code')}`}</p>
        <p>{`실패 사유: ${searchParams.get('message')}`}</p>
      </div>
    </div>
  );
}
