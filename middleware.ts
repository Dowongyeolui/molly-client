import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

// 보호할 경로 목록
const protectedPaths = ['/mypage', '/buy', '/cart', '/seller'];

export function middleware(request: NextRequest) {
  // 현재 경로가 보호된 경로인지 체크
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // 보호된 경로가 아니면 그냥 통과
  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // 요청 헤더의 쿠키 확인
  console.log('Request headers:', request.headers);
  console.log('Request cookies:', request.cookies.getAll());

  // 보호된 경로일 때만 인증 체크
  const authToken = request.cookies.get('Authorization');
  // console.log('Current path:', request.nextUrl.pathname);
  // console.log('Auth token:', authToken); // 이 값이 undefined가 아니어야 함
  if (!authToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 응답에 토큰 추가 및 쿠키 재설정
  const response = NextResponse.next();
  return response;
}

// 미들웨어를 적용할 경로 설정
export const config = {
  matcher: ['/mypage/:path*', '/buy/:path*', '/cart/:path*', '/seller/:path*'],
};
