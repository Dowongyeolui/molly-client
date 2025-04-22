"use client";

import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useEncryptStore } from "@/app/provider/EncryptStore";
import { TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { BuyOrderButton } from "@/features/buy/ui/BuyOrderButton";
import { ChevronRight } from "lucide-react";
import { TestCheckoutPage } from "@/features/buy/api/TestCheckoutPage";
import { CartProductInfo } from "@/views/cart/ui/CartProductInfo";
import { BuyAddress } from "./BuyAddress";
import { PointUse } from "@/features/buy/ui/PointUse";
import { BuySkeleton } from "./BuySkeleton";
import buyCancel from "@/features/buy/api/buyCancel";
import { Order as BuyAddressOrder } from "./BuyAddress";


// 타입 정의
interface Order {
  orderId: number; // string에서 number로 변경
  tossOrderId: string; // 누락된 필드 추가
  defaultAddress?: {
    addrDetail: string;
    numberAddress: string;
    receiverName: string;
    receiverPhone: string;
    roadAddress: string;
  }; // 주소 정보 추가
  orderDetails: OrderDetail[];
  totalAmount: number;
  userPoint: number;
  pointUsage: number;
  // 추가 필드
  orderedAt?: string;
  status?: string;
}

interface OrderDetail {
  itemId: number;
  productId: number;
  brandName: string;
  productName: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
  image: string;
}

// 타입 가드 함수 수정
function isValidOrder(order: unknown): order is Order {
  return (
    order !== null &&
    typeof order === "object" &&
    "orderId" in order &&
    typeof (order as Record<string, unknown>).orderId === "number" &&
    "tossOrderId" in order &&
    typeof (order as Record<string, unknown>).tossOrderId === "string" &&
    "orderDetails" in order &&
    Array.isArray((order as Record<string, unknown>).orderDetails)
  );
}

// 컨텍스트 타입
interface BuyContextType {
  currentOrder: Order | null;
  widgets: TossPaymentsWidgets | null;
  ready: boolean;
  usedPoint: number;
  isLoading: boolean;
  totalItems: number;
  totalPrice: number;
  handlePointChange: (point: number) => void;
  contentHeight: number;
  handleWidgetsReady: ({
    widgets,
    ready,
  }: {
    widgets: TossPaymentsWidgets;
    ready: boolean;
  }) => void; // 누락된 함수 추가
}

// 컨텍스트 생성
const BuyContext = createContext<BuyContextType | null>(null);

// 컨텍스트 훅
const useBuy = () => {
  const context = useContext(BuyContext);
  if (!context) {
    throw new Error("useBuy must be used within a Buy.Root component");
  }
  return context;
};

// Root 컴포넌트
const BuyRoot = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { orders, getDecryptedOrders, setOrders } = useEncryptStore();
  const decryptedOrders = getDecryptedOrders();
  const orderNumber = decryptedOrders?.length - 1;
  const orderId = orders?.[orderNumber]?.orderId;

  const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [usedPoint, setUsedPoint] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // useEffect 수정
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // 현재 주문 정보
  const currentOrder = isValidOrder(decryptedOrders?.[orderNumber])
    ? decryptedOrders[orderNumber]
    : null;

  // 총 주문 건수
  const totalItems = currentOrder?.orderDetails?.length || 0;

  // 총 가격 계산
  const totalPrice =
    currentOrder?.orderDetails?.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    ) || 0;

  // 컨텐츠 높이 계산 (CLS 감소)
  const contentHeight = useMemo(() => {
    const itemCount = currentOrder?.orderDetails?.length || 0;
    return 80 + Math.min(itemCount, 3) * 100;
  }, [currentOrder]);

  // 주문이 없을 때 카트로 리다이렉트
  useEffect(() => {
    if (!orders?.length) {
      router.replace("/");
    }
  }, [orders, router]);

  // 뒤로가기 처리
  useEffect(() => {
    window.history.pushState({ fromBuy: true }, "", window.location.href);

    const handlePopState = async () => {
      const confirmed = window.confirm("결제를 취소하겠습니까?");

      if (confirmed && orderId) {
        try {
          await buyCancel(orderId);
          setOrders([]);
          window.location.href = "/cart";
        } catch (error) {
          console.error("결제 취소 실패:", error);
        }
      } else {
        window.history.pushState({ fromBuy: true }, "", window.location.href);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [orderId, setOrders, router]);

  // 토스 위젯 준비 완료 핸들러
  const handleWidgetsReady = ({
    widgets,
    ready,
  }: {
    widgets: TossPaymentsWidgets;
    ready: boolean;
  }) => {
    setWidgets(widgets);
    setReady(ready);
  };

  // 포인트 변경 핸들러
  const handlePointChange = (point: number) => {
    setUsedPoint(point);
  };

  // 컨텍스트 값 설정 시 타입 단언 사용
  const value: BuyContextType = {
    currentOrder: currentOrder as Order,
    widgets,
    ready,
    usedPoint,
    isLoading,
    totalItems,
    totalPrice,
    handlePointChange,
    contentHeight,
    handleWidgetsReady, // 누락된 함수 추가
  };

  return (
    <BuyContext.Provider value={value}>
      <div className="w-full flex items-center flex-col">{children}</div>
    </BuyContext.Provider>
  );
};

// Header 컴포넌트
const BuyHeader = () => {
  return (
    <div className="w-full h-[75px] flex justify-center items-center font-bold text-2xl border">
      배송/결제
    </div>
  );
};

// Content 컴포넌트 (전체 내용 컨테이너)
const BuyContent = ({ children }: { children: React.ReactNode }) => {
  const { isLoading, contentHeight } = useBuy();

  if (isLoading) {
    return <BuySkeleton />;
  }

  return (
    <div
      className="w-full h-full flex flex-col items-center bg-[#EFF2F1] pb-20"
      style={{ minHeight: `${contentHeight}px` }}
    >
      {children}
    </div>
  );
};

// Address 컴포넌트
const BuyAddressSection = () => {
  const { currentOrder } = useBuy();

  if (!currentOrder) return null;

  // 타입 단언으로 전달
  return <BuyAddress userInfo={currentOrder as unknown as BuyAddressOrder} />;
};

// Products 컴포넌트
const BuyProducts = () => {
  const { currentOrder, totalItems } = useBuy();

  if (!currentOrder) return null;

  return (
    <div className="mt-4 xs:w-[480px] sm:w-[700px] flex flex-col bg-white rounded-[10px] border p-4">
      <div className="flex justify-between mb-4">
        <h2 className="font-semibold">주문 상품 및 쿠폰</h2>
        <div>총 {totalItems}건</div>
      </div>

      <div className="flex flex-col divide-y">
        {currentOrder.orderDetails?.map((item, index) => (
          <CartProductInfo
            key={item.itemId}
            cartId={0}
            itemId={item.itemId}
            productId={item.productId}
            brandName={item.brandName}
            productName={item.productName}
            price={item.price}
            quantity={item.quantity}
            size={item.size}
            color={item.color}
            url={item.image}
            priority={index < 1}
            hideShippingInfo={true}
          />
        ))}
      </div>

      <div className="mt-4 w-full h-9 rounded-[10px] border flex justify-between items-center p-2">
        <div>요청사항 없음</div>
        <ChevronRight size={20} />
      </div>
    </div>
  );
};

// Point 컴포넌트
const BuyPointSection = () => {
  const { currentOrder, totalPrice, handlePointChange, ready } = useBuy();

  if (!currentOrder) return null;

  return (
    <PointUse
      userPoint={currentOrder.userPoint || 0}
      totalAmount={totalPrice}
      onPointChange={handlePointChange}
      ready={ready}
    />
  );
};

// Payment 컴포넌트 수정
const BuyPaymentWidget = () => {
  const { handleWidgetsReady } = useBuy();

  return (
    <div className="mt-4 xs:w-[480px] sm:w-[700px] min-h-64 flex flex-col bg-white rounded-[10px] border p-2">
      <TestCheckoutPage onWidgetsReady={handleWidgetsReady} />
    </div>
  );
};

// Summary 컴포넌트
const BuySummary = () => {
  const { totalPrice, currentOrder, usedPoint } = useBuy();

  return (
    <>
      <div className="mt-4 xs:w-[480px] sm:w-[700px] flex flex-col bg-white rounded-t-[10px] border p-4">
        <div className="font-bold mb-2">최종 주문 정보</div>
        <div className="w-full flex justify-between py-1">
          <div>구매가</div>
          <div>{totalPrice.toLocaleString()}원</div>
        </div>
        <div className="w-full flex justify-between py-1">
          <div>배송비</div>
          <div>무료</div>
        </div>
        <div className="w-full flex justify-between py-1">
          <div>쿠폰 사용</div>
          <div>-</div>
        </div>
        <div className="w-full flex justify-between py-1">
          <div>포인트 사용</div>
          <div>{usedPoint > 0 ? `-${usedPoint.toLocaleString()}원` : "-"}</div>
        </div>
      </div>

      <div className="flex flex-col bg-gray-300 xs:w-[480px] sm:w-[700px] rounded-b-[10px] px-4 py-2">
        <div className="font-bold text-lg">총 결제금액</div>
        <div className="text-right font-bold">
          {(totalPrice - (currentOrder?.pointUsage || 0)).toLocaleString()}원
        </div>
      </div>
    </>
  );
};

// OrderButton 컴포넌트
const BuyOrderSection = () => {
  const { widgets, ready, currentOrder } = useBuy();

  return (
    <div className="xs:w-[480px] sm:w-full mt-4">
      <BuyOrderButton
        widgets={widgets}
        ready={ready}
        currentOrder={currentOrder}
      />
    </div>
  );
};

// 컴파운드 컴포넌트 정의
const Buy = {
  Root: BuyRoot,
  Header: BuyHeader,
  Content: BuyContent,
  Address: BuyAddressSection,
  Products: BuyProducts,
  Point: BuyPointSection,
  Payment: BuyPaymentWidget,
  Summary: BuySummary,
  OrderButton: BuyOrderSection,
};

export default Buy;
