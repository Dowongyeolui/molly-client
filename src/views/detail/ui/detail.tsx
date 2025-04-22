"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";

import { Heart, Share2 } from "lucide-react";
import { buyNow, addToCart } from "@/features/detail/api/action";
import ReviewModal from "@/views/detail/ui/ReviewModal";
import { useEncryptStore } from "@/app/provider/EncryptStore";
import { OrderItem } from "@/app/provider/OrderStore";
import getProduct from "@/shared/api/getProduct";
import CartToast from "./CartToast";
import { DetailProduct } from "@/shared/types/product";
//응답 데이터 매핑
interface Review {
  reviewId: number;
  comment: string;
  user: {
    name: string;
    profileImage: string;
  };
  isLike: boolean;
  date: string;
  images: string[];
}
interface ProductDetailProps {
  productId: number;
  initialReviews: Review[]; // 서버에서 받은 초기 데이터
}

const ProductDescription = dynamic(
  () => import("@/views/detail/ui/ProductDescription"),
  {
    ssr: false,
    loading: () => <p className="mb=50"></p>,
  }
);
const ProductRecommend = dynamic(
  () => import("@/views/detail/ui/ProductRecommend"),
  {
    ssr: false,
  }
);
const ProductReview = dynamic(() => import("@/views/detail/ui/ProductReview"), {
  ssr: false,
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
const imageUrl = process.env.NEXT_PUBLIC_IMAGE_URL;
const productApiUrl = `${baseUrl}/product`;

export default function ProductDetail({
  productId,
  initialReviews,
}: ProductDetailProps) {
  const router = useRouter();
  const [product, setProduct] = useState<DetailProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true); // 초기값을 true로 설정 (초기 렌더링 시 무조건 로딩 UI 보장)
  const [selectedOption, setSelectedOption] = useState<
    DetailProduct["items"][0] | null
  >(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [showDetails, setShowDetails] = useState(false); // 상품 정보 더보기
  const [visibleReviews, setVisibleReviews] = useState(6); // 처음엔 리뷰 6개만 표시
  const [reviewExpanded, setreviewExpanded] = useState(false); // 리뷰 펼침 여부
  const [selectedReview, setSelectedReview] = useState<Review | null>(null); // 선택한 리뷰 정보 저장
  const [isreviewModalOpen, setIsreviewModalOpen] = useState(false); // 모달 열림 상태
  const [showToast, setShowToast] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [reviews] = useState<Review[]>(initialReviews || []); // 초기값을 initialReview로 설정(서버에서 받은 데이터)
  const { setOrders } = useEncryptStore(); //바로 구매 api 성공 응답을 주스탠드 스토어에 저장
  const [recommendedProducts, setRecommendedProducts] = useState<
    DetailProduct[]
  >([]); //추천 상품 저장

  const [showDescription, setShowDescription] = useState(false);
  const [showRecommended, setShowRecommended] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const recommendedRef = useRef<HTMLDivElement | null>(null);
  const reviewRef = useRef<HTMLDivElement | null>(null);

  //동적 임포트  useEffect
  useEffect(() => {
    console.log("동적 임포트 useEffect 시작");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === descriptionRef.current) {
              setShowDescription(true);
              observer.unobserve(entry.target); // 한 번만 관찰
            }
            if (entry.target === recommendedRef.current) {
              setShowRecommended(true);
              observer.unobserve(entry.target);
            }
            if (entry.target === reviewRef.current) {
              setShowReview(true);
              observer.unobserve(entry.target);
            }
          }
        });
      },
      {
        threshold: 0.1, // 10% 보이면 로딩 시작
      }
    );

    if (descriptionRef.current) {
      observer.observe(descriptionRef.current);
      console.log("descriptionRef 감지 대상 값:", descriptionRef.current);
    }
    if (recommendedRef.current) observer.observe(recommendedRef.current);
    if (reviewRef.current) observer.observe(reviewRef.current);

    return () => {
      observer.disconnect(); // 클린업
    };
  }, [product]);

  //추천 상품 api 요청
  const fetchRecommendedProducts = async () => {
    if (!product?.brandName) return; // 브랜드 이름이 없으면 요청 안 함

    try {
      const paramsString = `${productApiUrl}?brandName=${product.brandName}&offsetId=0&size=12`;
      const response = await getProduct(paramsString);

      const data = await response;
      setRecommendedProducts(data.data); // API 응답이 리스트라면 .content 사용
      console.log("추천 상품 응답 데이터:", data.data);
    } catch (error) {
      console.error("추천 상품 API 요청 실패:", error);
    }
  };

  //바로 구매
  const handleBuyNow = () => {
    if (!selectedOption) {
      alert("상품 옵션을 선택해주세요.");
      return;
    }
    if (!productId) {
      alert("상품 ID가 없습니다.");
      return;
    }
    const parsedProductId = productId; // 문자열을 숫자로 변환

    startTransition(async () => {
      try {
        const orderData = await buyNow(
          parsedProductId,
          selectedOption.id,
          quantity
        );
        console.log("바로 구매 api 요청 성공");
        console.log("바로 구매 api 응답 데이터", orderData);

        const formattedOrder: OrderItem = {
          ...orderData,
          pointUsage: orderData.pointUsage || null,
          pointSave: orderData.pointSave || null,
          payment: orderData.payment || [],
          delivery: orderData.delivery || [],
        };

        setOrders([orderData, formattedOrder]);

        // 구매 성공 후 /buy 페이지로 이동
        router.push("/buy");
      } catch (error) {
        console.error("order api 요청 중 오류 발생:", error);
        router.push("/login");
      }
    });
  };

  //장바구니 담기
  const handleCartButton = () => {
    if (!selectedOption) {
      alert("상품 옵션을 선택해주세요.");
      return;
    }

    console.log("장바구니 요청 시작");
    console.log("선택한 옵션 id", selectedOption.id);
    console.log("수량", quantity);

    startTransition(async () => {
      try {
        const message = await addToCart(selectedOption.id, quantity);
        console.log("api 응답:", message); //응답 값 확인

        // 구매 성공 후 모달 띄우기
        setShowToast(true);
      } catch (error) {
        console.error("장바구니 api 오류 발생:", error);

        const currentPath = window.location.pathname;
        const itemId = selectedOption.id;
        const itemQuantity = quantity;

        router.push(
          `/login?returnUrl=${encodeURIComponent(
            currentPath
          )}&action=addToCart&itemId=${itemId}&quantity=${itemQuantity}`
        );
      }
    });
  };
  //장바구니 담을 시 알람
  const handleToastClose = () => {
    setShowToast(false);
  };

  //상품 id 바뀌면 api 요청
  useEffect(() => {
    if (!productId) return;
    fetchProduct();
  }, [productId]);
  //추천 상품 api 요청
  useEffect(() => {
    if (product) fetchRecommendedProducts();
  }, [product]);

  //상품 상세 api 요청
  const fetchProduct = async () => {
    try {
      const paramsString = `${baseUrl}/product/${productId}`;
      const response = await getProduct(paramsString);

      const data = await response;

      // 이미지 서버 연결 안될 때 기본 이미지로 대체(504 떠도 페이지 렌더링하기)
      if (!data.thumbnail || !data.thumbnail.path) {
        data.thumbnail = {
          path: "/images/noImage.svg",
          filename: "default.jpg",
        };
      }

      console.log("상품 상세 API 요청 성공:", data);
      setProduct(data);
    } catch (error) {
      console.error("상품 상세 API 요청 에러:", error);
    } finally {
      setIsLoading(false); // API 응답 완료 후 isLoading = false
    }
  };

  // 로딩 중일 때 스켈레톤 UI 표시 (isLoading이 true면 무조건 표시됨)
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }
  // product가 null이면 오류 메시지 표시
  if (!product) {
    return (
      <p className="text-center text-gray-600">
        상품 정보를 불러오지 못했습니다.
      </p>
    );
  }

  //수량 추가
  const handleIncrease = () => setQuantity((prev) => prev + 1);
  const handleDecrease = () => {
    if (quantity > 1) setQuantity((prev) => prev - 1);
  };
  //리뷰 더보기 클릭 토글 함수
  const toggleReviews = () => {
    if (reviewExpanded) setVisibleReviews(6); // 다시 6개만 보이도록 설정
    else setVisibleReviews(reviews.length); // 모든 리뷰 보이도록 설정

    setreviewExpanded(!reviewExpanded); // 상태 반전
  };
  //리뷰 모달창 상태
  const reviewOpenModal = (review: Review) => {
    setSelectedReview(review); // 선택한 리뷰 데이터 저장
    setIsreviewModalOpen(true); // 모달 열기
  };
  const reviewCloseModal = () => {
    setIsreviewModalOpen(false); // 모달 닫기
    setSelectedReview(null); // 선택한 리뷰 데이터 초기화
  };
  //선택한 옵션이 렌더링
  const handleOptionSelect = (option: DetailProduct["items"][0]) => {
    console.log("옵션 아이디", option.id);
    setSelectedOption(option);
    setIsDropdownOpen(false);
  };

  return (
    <>
      {/* 구매 섹션 */}
      <div className="max-w-screen-xl mx-auto p-6 flex gap-16">
        {/* 썸네일 이미지 */}
        <div className="w-1/2 px-8">
          <Image
            priority={true}
            src={`${imageUrl}${product.thumbnail.path}?w=600&h=600&r=true`}
            alt={product?.productName || "상품 이미지"}
            width={600}
            height={600}
            unoptimized={true}
          />
        </div>

        {/* 세로 구분선 */}
        <div className="border-l border-gray-300 h-auto"></div>

        {/* 오른쪽: 상품 정보 */}
        <div className="w-1/2 px-8 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{product?.brandName}</h1>
            {/* 아이콘 컨테이너 */}
            <div className="flex items-center gap-4">
              {/* 찜하기 아이콘 (하트) */}
              <button
                aria-label="찜하기"
                className="text-gray-600 hover:text-red-600"
              >
                <Heart className="w-6 h-6" fill="none" />
              </button>
              {/* 공유 아이콘 */}
              <button
                aria-label="공유하기"
                className="text-gray-600 hover:text-gray-700"
              >
                <Share2 className="w-6 h-6" />
              </button>
            </div>
          </div>
          <p className="text-gray-600">{product.productName}</p>
          {/* 가격 정보 */}
          <div className="text-lg">
            <span className="text-black font-bold text-2xl  block">
              {product.price.toLocaleString()}원
            </span>
          </div>
          {/* 포인트 및 혜택 */}
          <div className="border-t pt-4 space-y-1">
            <div className="flex gap-14">
              <span className="text-sm text-gray-600">구매 적립금</span>
              <span className="text-sm ml-2">
                최대 1,431 마일리지 적립 예정
              </span>
            </div>

            <div className="flex gap-12">
              <span className="text-sm text-gray-600">무이자 할부</span>
              <div className="text-sm ml-4">
                최대 7개월 무이자 할부 시 월 19,420원 결제
                <br />
                <span className="text-blue-700 underline cursor-pointer">
                  카드사별 할부 혜택 안내
                </span>
              </div>
            </div>

            <div className="flex gap-16">
              <span className="text-sm text-gray-600">배송 정보</span>
              <span className="text-sm ml-4">3일 이내 출고</span>
            </div>

            <div className="flex gap-20">
              <span className="text-sm text-gray-600">배송비</span>
              <div className="text-sm ml-4">
                <span className="">3,000원</span>
                <br />
                <span className="text-gray-600">
                  70,000원 이상 구매 시 무료배송
                </span>
                <br />
                <span className="text-gray-600">
                  제주/도서산간 3,000원 추가
                </span>
              </div>
            </div>
          </div>
          {/* 옵션 선택 */}
          <div className="mt-4 relative border-t">
            <p className="font-semibold mt-4">옵션 선택</p>
            <button
              className="w-full border px-4 py-3 mt-2 text-left "
              onClick={() => setIsDropdownOpen((prev) => !prev)}
            >
              {selectedOption
                ? `${selectedOption.color} / ${selectedOption.size}`
                : "색상/사이즈 선택"}
            </button>
            {/* 드롭다운 메뉴 */}
            {isDropdownOpen && (
              <ul className="absolute left-0 w-full border mt-2 bg-white shadow-md z-10">
                {product.items.map((item) => (
                  <li
                    key={item.id}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleOptionSelect(item)}
                  >
                    {item.color} / {item.size}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selectedOption && (
            <div className="border p-4 rounded-md flex flex-col justify-between items-start mt-2 bg-[#F6F6F6]">
              <div>
                <p>{`${selectedOption.color} / ${selectedOption.size}`}</p>
              </div>

              <div className="flex justify-between items-center w-full mt-2">
                <div className="flex items-center border rounded-md overflow-hidden bg-white">
                  <button
                    className="px-4 py-2 border-r bg-white"
                    onClick={handleDecrease}
                  >
                    -
                  </button>
                  <span className="px-6 py-2 text-center bg-white">
                    {quantity}
                  </span>
                  <button
                    className="px-4 py-2 border-l bg-white"
                    onClick={handleIncrease}
                  >
                    +
                  </button>
                </div>

                <p className="text-red-600 font-semibold">
                  {(product.price * quantity).toLocaleString()} 원
                </p>
              </div>
            </div>
          )}
          {/* 구매 버튼 */}
          <div className="flex gap-4 mt-4">
            <button
              className="w-1/2 bg-black text-white py-3 text-lg font-semibold hover:bg-orange-600"
              onClick={handleBuyNow}
            >
              {" "}
              바로 구매
            </button>
            <button
              className="w-1/2 border border-black py-3 text-lg font-semibold"
              onClick={handleCartButton}
              disabled={isPending}
            >
              {" "}
              장바구니 담기
            </button>
          </div>
        </div>
      </div>

      {/* 상세 섹션 */}
      <div ref={descriptionRef}>
        {showDescription && (
          <ProductDescription
            images={product.productDescriptionImages}
            description={product.description}
            showDetails={showDetails}
            setShowDetails={setShowDetails}
          />
        )}
      </div>

      {/* 추천 상품 섹션 */}
      <div ref={recommendedRef}>
        {showRecommended && <ProductRecommend products={recommendedProducts} />}
      </div>

      {/* 리뷰 섹션 */}
      <div ref={reviewRef}>
        {showReview && (
          <ProductReview
            reviews={reviews}
            reviewExpanded={reviewExpanded}
            visibleReviews={visibleReviews}
            toggleReviews={toggleReviews}
            reviewOpenModal={reviewOpenModal}
          />
        )}
      </div>

      {/* 배송정보 및 교환/환불 안내 섹션 */}
      <section className="max-w-screen-lg mx-auto mt-32 px-4">
        {/* 배송정보 */}
        <div className="border-t pt-8">
          <p className="text-2xl font-semibold mb-4">배송정보</p>
          <ul className="text-gray-700 space-y-2">
            <li>
              • Delivery 브랜드 업체발송은 상품설명에 별도로 기입된 브랜드 알림
              배송공지 기준으로 출고되고 브랜드마다 개별 배송비가 부여됩니다.
            </li>
            <li>
              • Delivery 29CM 자체발송은 오후 2시까지 결제확인된 주문은 확인
              출고되며 5만원 이상 주문은 무료배송, 5만원 미만은 3,000원의
              배송비가 추가됩니다.
            </li>
            <li>
              • SPECIAL ORDER, PT 등 예약주문은 상세설명의 출고일정을 확인하시기
              바랍니다.
            </li>
            <li>
              • 구두, 액세서리, 침구, 액자, 가구 등 상품설명의 제작기간을
              숙지해주시기 바랍니다.
            </li>
            <li>
              • 가구 및 일부 상품, 제주도를 포함한 도서산간 지역은 추가배송비
              입금요청이 있을 수 있습니다.
            </li>
          </ul>
        </div>
        {/* 교환, 환불, A/S 안내 */}
        <div className="border-t pt-8 mt-8">
          <p className="text-2xl font-semibold mb-4">교환, 환불, A/S 안내</p>
          <ul className="text-gray-700 space-y-2">
            <li>• 상품 수령일로부터 7일 이내 반품 / 환불 가능합니다.</li>
            <li>
              • 변심 반품의 경우 왕복배송비를 차감한 금액이 환불되며, 제품 및
              포장 상태가 재판매 가능하여야 합니다.
            </li>
            <li>
              • 동일상품 또는 동일상품 내 추가금액이 없는 옵션만 교환
              가능합니다.
            </li>
            <li>• 상품 불량인 경우는 배송비를 포함한 전액이 환불됩니다.</li>
            <li>• 출고 이후 환불요청 시 상품 회수 후 처리됩니다.</li>
            <li>
              • 알리 등 주문제작상품 / 카메라 / 밀봉포장상품 등은 변심에 따른
              반품 / 환불이 불가합니다.
            </li>
            <li>• 일부 완제품으로 수입된 상품의 경우 A/S가 불가합니다.</li>
            <li>
              • 특정브랜드의 상품설명에 별도로 기입된 교환 / 환불 / A/S 기준이
              우선합니다.
            </li>
            <li>
              • 구매자가 미성년자인 경우에는 상품 구입 시 법정대리인이 동의하지
              아니하면 법정대리인 본인 또는 법정대리인이 구매취소 할 수
              있습니다.
            </li>
            <li>
              • 상품의 색상과 이미지는 기기의 해상도에 따라 다르게 보일 수
              있습니다.
            </li>
          </ul>
        </div>
      </section>

      {/* 리뷰 모달 창 */}
      {isreviewModalOpen && selectedReview && (
        <ReviewModal review={selectedReview} onClose={reviewCloseModal} />
      )}

      {showToast && (
        <CartToast
          productImage={`${imageUrl}${product.thumbnail.path}?w=30&h=30&r=true`}
          onClose={handleToastClose}
        />
      )}
    </>
  );
}
