"use server";

import { getValidAuthToken } from "@/shared/util/lib/authTokenValue";

// 주문 정보를 서버로 전송하여 결제를 완료합니다.
export default async function TossRequest(
  userOrderId: number,
  tossOrderId: string,
  amount: number,
  point: string, // 암호화된 포인트
  paymentKey: string,
  paymentType: string,
  receiver_phone: string, // 암호화된 전화번호
  receiver_name: string, // 암호화된 수령인
  addr_detail: string, // 암호화된 상세주소
  number_address: string, // 암호화된 지번주소
  road_address: string // 암호화된 도로명주소
) {
  // 요청 데이터 로깅
  console.log("Request Data:", {
    orderId: userOrderId,
    tossOrderId,
    paymentKey,
    amount,
    point,
    paymentType,
    delivery: {
      receiver_name,
      receiver_phone,
      road_address,
      number_address,
      addr_detail,
    },
  });

  try {
    const authToken = await getValidAuthToken();
    console.log("인증 토큰 상태:", authToken ? "있음" : "없음");

    if (!authToken) {
      return {
        success: false,
        message: "인증 토큰이 없습니다. 다시 로그인해주세요.",
      };
    }

    const res = await fetch(
      `${process.env.NEXT_SERVER_URL}/orders/${userOrderId}/payment`,
      {
        method: "POST",
        headers: {
          Authorization: `${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: userOrderId,
          tossOrderId,
          paymentKey,
          amount: Number(amount), // 숫자로 변환
          paymentType,
          point, // 암호화된 상태 유지
          delivery: {
            receiver_name, // 암호화된 상태 유지
            receiver_phone, // 암호화된 상태 유지
            road_address, // 암호화된 상태 유지
            number_address, // 암호화된 상태 유지
            addr_detail, // 암호화된 상태 유지
          },
        }),
      }
    );

    // 응답 상태 및 데이터 로깅
    console.log("Response Status:", res.status);
    const responseText = await res.text();
    console.log("Response Text:", responseText);

    if (!res.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }

      console.error("결제 실패. 상태:", res.status, "응답:", errorData);
      return {
        success: false,
        message: errorData.message || "결제 실패",
      };
    }

    try {
      const data = JSON.parse(responseText);
      return {
        success: true,
        data,
        message: "결제가 성공적으로 완료되었습니다.",
      };
    } catch (parseError) {
      console.error("응답 파싱 실패:", parseError);
      return {
        success: false,
        message: "서버 응답을 처리할 수 없습니다.",
      };
    }
  } catch (error) {
    console.error("결제 요청 실패:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.",
    };
  }
}
