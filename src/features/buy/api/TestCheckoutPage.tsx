'use client';

import {loadTossPayments, ANONYMOUS} from '@tosspayments/tosspayments-sdk';
import {TossPaymentsWidgets} from '@tosspayments/tosspayments-sdk';
import {useEffect, useState} from 'react';
import {useOrderStore} from '@/app/provider/OrderStore';

//env 환경변수 처리 필요
const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT as string;
const customerKey = process.env.NEXT_PUBLIC_TOSS_CUSTOMER as string;

export function TestCheckoutPage() {
  const {orders} = useOrderStore();
  const [amount, setAmount] = useState({
    currency: 'KRW',
    value: 0,
  });
  const [ready, setReady] = useState(false);
  const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null);

  const orderNumber = orders.length - 1;

  useEffect(() => {
    async function fetchPaymentWidgets() {
      // ------  결제위젯 초기화 ------
      const tossPayments = await loadTossPayments(clientKey);
      // 회원 결제
      const widgets = tossPayments.widgets({
        customerKey,
      });
      // 비회원 결제
      // const widgets = tossPayments.widgets({customerKey: ANONYMOUS});

      setWidgets(widgets);
    }

    fetchPaymentWidgets();
  }, [clientKey, customerKey]);

  useEffect(() => {
    async function renderPaymentWidgets() {
      if (widgets == null) {
        return;
      }
      // ------ 주문의 결제 금액 설정 ------
      const totalAmount = orders[orderNumber].totalAmount;
      setAmount({
        currency: 'KRW',
        value: totalAmount,
      });
      await widgets.setAmount({
        currency: 'KRW',
        value: totalAmount,
      });

      console.log('주문의 결제 금액:', totalAmount);

      await Promise.all([
        // ------  결제 UI 렌더링 ------
        widgets.renderPaymentMethods({
          selector: '#payment-method',
          variantKey: 'DEFAULT',
        }),
        // ------  이용약관 UI 렌더링 ------
        widgets.renderAgreement({
          selector: '#agreement',
          variantKey: 'AGREEMENT',
        }),
      ]);

      setReady(true);
    }

    renderPaymentWidgets();
  }, [widgets, orders]);

  useEffect(() => {
    if (widgets == null) {
      return;
    }

    widgets.setAmount(amount);
  }, [widgets, amount]);

  return (
    <div className="wrapper">
      <div className="box_section">
        {/* 결제 UI */}
        <div id="payment-method" />
        {/* 이용약관 UI */}
        <div id="agreement" />
        {/* 쿠폰 체크박스 */}
        <div className="w-full flex justify-between">
          <div className="">
            <label htmlFor="coupon-box">
              <input
                id="coupon-box"
                type="checkbox"
                aria-checked="true"
                disabled={!ready}
                onChange={(event) => {
                  // ------  주문서의 결제 금액이 변경되었을 경우 결제 금액 업데이트 ------
                  setAmount((prev) => ({
                    ...prev,
                    value: event.target.checked
                      ? prev.value - 5_000
                      : prev.value + 5_000,
                  }));
                }}
              />
              <span>포인트 사용</span>
              {/* 결제하기 버튼 */}

              <button
                className="button"
                disabled={!ready}
                onClick={async () => {
                  try {
                    if (!widgets) {
                      return null;
                    }
                    // ------ '결제하기' 버튼 누르면 결제창 띄우기 ------
                    // 결제를 요청하기 전에 orderId, amount를 서버에 저장하세요.
                    // 결제 과정에서 악의적으로 결제 금액이 바뀌는 것을 확인하는 용도입니다.
                    await widgets.requestPayment({
                      orderId: orders[orderNumber].tossOrderId,
                      orderName:
                        orders[orderNumber].orderDetails[0].productName,
                      successUrl: window.location.origin + '/buy/success',
                      failUrl: window.location.origin + '/fail',
                    });
                  } catch (error) {
                    // 에러 처리하기
                    console.error(error);
                  }
                }}
              >
                결제하기
              </button>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
