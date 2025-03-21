"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Heart, Share2 } from "lucide-react";
// import ReviewModal from '../../public/images/review.jpg';
import { buyNow, addToCart } from "@/features/detail/api/action";
import ReviewModal from "@/views/detail/ui/ReviewModal";
import { useEncryptStore } from "@/app/provider/EncryptStore";
import { OrderItem } from "@/app/provider/OrderStore";
import getProduct from "@/shared/api/getProduct";
interface Product {
  id: number;
  categories: string[];
  brandName: string;
  productName: string;
  price: number;
  description: string;
  thumbnail: { path: string; filename: string };
  productImages: { path: string; filename: string }[];
  productDescriptionImages: { path: string; filename: string }[];
  items: {
    id: number;
    color: string;
    colorCode: string;
    size: string;
    quantity: number;
  }[];
}
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

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
const imageUrl = process.env.NEXT_PUBLIC_IMAGE_URL;
const productApiUrl = `${baseUrl}/product`;

export default function ProductDetail({
  productId,
  initialReviews,
}: ProductDetailProps) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true); // 초기값을 true로 설정 (초기 렌더링 시 무조건 로딩 UI 보장)
  const [selectedOption, setSelectedOption] = useState<
    Product["items"][0] | null
  >(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [showDetails, setShowDetails] = useState(false); // 상품 정보 더보기
  const [visibleReviews, setVisibleReviews] = useState(6); // 처음엔 리뷰 6개만 표시
  const [reviewExpanded, setreviewExpanded] = useState(false); // 리뷰 펼침 여부
  const [selectedReview, setSelectedReview] = useState<Review | null>(null); // 선택한 리뷰 정보 저장
  const [isreviewModalOpen, setIsreviewModalOpen] = useState(false); // 모달 열림 상태

  const [isPending, startTransition] = useTransition();

  // 초기값을 initialReview로 설정(서버에서 받은 데이터)
  const [reviews] = useState<Review[]>(initialReviews || []);
  //바로 구매 api 성공 응답을 주스탠드 스토어에 저장
  const { setOrders } = useEncryptStore();
  //추천 상품 저장
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);

  //추천 상품 api 요청
  const fetchRecommendedProducts = async () => {
    if (!product?.brandName) return; // 브랜드 이름이 없으면 요청 안 함

    try {
      // const response = await fetch(`${productApiUrl}?brand=${product.brandName}&page=0&size=12`);
      const paramsString = `${productApiUrl}?brand=${product.brandName}&page=0&size=12`; 
      const response = await getProduct(paramsString);

      const data = await response;
      setRecommendedProducts(data.data); // API 응답이 리스트라면 .content 사용
    } catch (error) {
      console.error("추천 상품 API 요청 실패:", error);
    }
  };

  useEffect(() => {
    if (product) fetchRecommendedProducts();
  }, [product]); // product가 변경될 때만 요청 실행
  //원래 의존성배열에 product만 있었음

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

        // 여기서 orderData 사용 가능
        // 예: 상태에 저장
        setOrders([orderData, formattedOrder]);

        // 구매 성공 후 /buy 페이지로 이동
        router.push("/buy");
      } catch (error) {
        console.error("order api 요청 중 오류 발생:", error);
        // router.push("/login");
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

        // 구매 성공 후 /buy 페이지로 이동
        router.push("/cart");
        // alert(message);
      } catch (error) {
        console.error("장바구니 api 오류 발생:", error);
        // router.push("/login");
      }
    });
  };

  //api 요청
  useEffect(() => {
    if (!productId) return;
    fetchProduct();
  }, [productId]);

  //상품 상세 api 요청
  const fetchProduct = async () => {
    // setLoading(true);
    // setError(null);

    try {
      // const response = await fetch(`${baseUrl}/product/${productId}`);
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

      console.log("API 요청 성공:", data);
      console.log("첫번째 상품의 url:", data.thumbnail.path);
      setProduct(data);
    } catch (error) {
      // setError(error instanceof Error ? error.message : "알 수 없는 에러 발생");
      console.error("API 요청 에러:", error);
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
      <p className="text-center text-gray-500">
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
  const reviewOopenModal = (review: Review) => {
    setSelectedReview(review); // 선택한 리뷰 데이터 저장
    setIsreviewModalOpen(true); // 모달 열기
  };
  const reviewCloseModal = () => {
    setIsreviewModalOpen(false); // 모달 닫기
    setSelectedReview(null); // 선택한 리뷰 데이터 초기화
  };
  //선택한 옵션이 렌더링
  const handleOptionSelect = (option: Product["items"][0]) => {
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
            src={`${imageUrl}${product.thumbnail.path}`}
            // src={"/images/noImage.svg"}
            alt={product?.productName || "상품 이미지"}
            width={600}
            height={600}
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
              <button className="text-gray-500 hover:text-red-500">
                <Heart className="w-6 h-6" fill="none" />
              </button>
              {/* 공유 아이콘 */}
              <button className="text-gray-500 hover:text-gray-700">
                <Share2 className="w-6 h-6" />
              </button>
            </div>
          </div>
          <p className="text-gray-500">{product.productName}</p>
          {/* 가격 정보 */}
          <div className="text-lg">
            <span className="text-gray-400 line-through block">
              {product.price.toLocaleString()}원
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-red-500 font-bold text-2xl">
                {product.price.toLocaleString()}원
              </span>
              <span className="text-red-500 text-lg">30%</span>
              {/* <span className="text-black-500 font-bold text-2xl">
                {product.price}원
              </span> */}
            </div>
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
                <span className="text-blue-500 underline cursor-pointer">
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
                <span className="text-gray-500">
                  70,000원 이상 구매 시 무료배송
                </span>
                <br />
                <span className="text-gray-500">
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

                <p className="text-red-500 font-semibold">
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
      <section className="max-w-screen-lg mx-auto mt-16 px-4 border-t">
        {/* 상세 설명 (이미지보다 위에 위치) */}
        <div className="mt-12">
          {product?.description && (
            <div className="max-w-screen-lg mx-auto text-center mt-8 px-4">
              {product.description.split("\n").map((line, index) => (
                <p key={index} className="mb-4">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* 상품 이미지 및 그라데이션 */}
        <div
          className={`${
            showDetails ? "h-auto" : "h-[3300px] overflow-hidden"
          } relative`}
        >
          <div className="flex flex-col gap-6">
            {product?.productDescriptionImages.map((img, index) => (
              <Image
                key={index}
                // src={`${imageUrl}${img.path}`}
                src={
                  img.path ? `${imageUrl}${img.path}` : "/images/noImage.svg"
                }
                // src={"/images/noImage.svg"}
                alt={`Product Description Image ${index + 1}`}
                width={800}
                height={600}
                className="w-full object-cover"
              />
            ))}
          </div>

          {/* 그라데이션 효과 추가 (showDetails가 false일 때만 보이도록) */}
          {!showDetails && (
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent"></div>
          )}
        </div>

        {/* 상품 정보 더보기 버튼 */}
        {!showDetails && (
          <div className="text-center mt-8 relative z-10">
            <button
              className="px-6 py-3 border border-gray-400 text-lg font-medium hover:bg-gray-100 transition"
              onClick={() => setShowDetails(true)}
            >
              상품 정보 더보기
            </button>
          </div>
        )}

        {/* 접기 버튼 */}
        {showDetails && (
          <div className="text-center mt-6">
            <button
              className="px-6 py-3 border border-gray-400 text-lg font-medium hover:bg-gray-100 transition"
              onClick={() => setShowDetails(false)}
            >
              접기
            </button>
          </div>
        )}
      </section>

      {/* 추천 상품 섹션 */}
      <section className="max-w-screen-lg mx-auto mt-40 px-4">
        <h3 className="text-2xl font-semibold mb-3">추천 상품</h3>

        {/* 가로 스크롤 가능한 상품 리스트 */}
        <div className="flex overflow-x-auto space-x-6 scrollbar-hide">
          {recommendedProducts.length > 0 ? (
            recommendedProducts.map((item) => (
              <div
                key={item.id}
                className="w-[200px] flex flex-col items-center"
              >
                {/* 이미지 고정 크기 지정 */}
                <div className="w-[200px] h-[240px] flex items-center justify-center overflow-hidden">
                  <Image
                    src={`${imageUrl}${item.thumbnail.path}`}
                    alt={item.productName}
                    width={200}
                    height={240}
                    className="object-contain"
                    onClick={() => router.push(`/detail/${item.id}`)}
                  />
                </div>

                {/* 텍스트 영역 */}
                <button
                  className="flex flex-col items-start w-full overflow-hidden "
                  onClick={() => router.push(`/product/${item.id}`)}
                >
                  {/* 브랜드명 */}
                  <p className="text-left text-sm font-semibold truncate w-full">
                    {item.brandName}
                  </p>

                  {/* 상품명 (최대 2줄) */}
                  <p className="text-left text-sm text-gray-500 truncate w-full line-clamp-2">
                    {item.productName}
                  </p>

                  {/* 가격 */}
                  <p className="text-left text-black font-semibold">
                    {item.price.toLocaleString()}원
                  </p>
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500">추천 상품이 없습니다.</p>
          )}
        </div>
      </section>

      {/* 리뷰 섹션 */}
      <section className="max-w-screen-lg mx-auto mt-32 px-4">
        {/* 리뷰 헤더 */}
        <h3 className="text-2xl font-semibold mb-7">리뷰 {reviews.length}</h3>

        {/* 리뷰 리스트 */}
        {reviews.length === 0 ? (
          <p className="text-center text-gray-500">작성된 리뷰가 없습니다.</p>
        ) : (
          <>
            <div
              className={`${
                reviewExpanded ? "h-auto" : "h-[600px] overflow-hidden relative"
              } grid grid-cols-3 gap-6`}
            >
              {reviews.slice(0, visibleReviews).map((review, index) => (
                <div key={index} className="flex flex-col items-center">
                  {review.images.length > 0 && (
                    <Image
                      // src={review.images[0]} // images 배열의 첫 번째 이미지 사용
                      src={
                        review.images[0]
                          ? `${imageUrl}${review.images[0]}`
                          : "/images/noImage.svg"
                      }
                      // src={"/images/noImage.svg"}
                      alt={`리뷰 이미지 ${index + 1}`}
                      width={300}
                      height={300}
                      className="rounded-lg w-full h-full object-cover"
                      onClick={() => reviewOopenModal(review)}
                      // onClick={() => setSelectedReview(review)} ??
                      //   onError={(e) => (e.currentTarget.src = "/images/noImage.svg")} // 이미지 로드 실패 시 기본 이미지 사용
                    />
                  )}

                  {/* 날짜 표시 */}
                  {/* <span className="text-xs text-gray-500">{review.date}</span> */}

                  {/* 사용자 정보 및 좋아요 버튼 */}
                  <div className="flex justify-between items-center w-full mt-2 text-sm text-gray-700">
                    <div
                      className="flex items-center"
                      onClick={() => reviewOopenModal(review)}
                    >
                      <Image
                        src={"/icons/profile.svg"}
                        alt="User Profile"
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                      <span className="ml-2 font-semibold">
                        {review.user.name}
                      </span>
                    </div>
                    <button className="text-gray-500 hover:bg-gray-200 rounded-full transition px-1 py-1">
                      <Heart
                        className="w-5 h-5"
                        fill={review.isLike ? "red" : "none"}
                      />
                    </button>
                  </div>

                  {/* 리뷰 내용 */}
                  <span
                    className="text-gray-600 mt-1 text-left w-full"
                    onClick={() => reviewOopenModal(review)}
                  >
                    {review.comment}
                  </span>
                </div>
              ))}
              {/* 그라데이션 효과 */}
              {!reviewExpanded && (
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent"></div>
              )}
            </div>

            {/* 리뷰 더보기 버튼 */}
            <div className="text-center mt-8">
              <button
                className="px-6 py-3 border border-gray-400 text-lg font-medium hover:bg-gray-100 transition"
                onClick={toggleReviews}
              >
                {reviewExpanded ? "접기" : "리뷰 더보기"}
              </button>
            </div>
          </>
        )}
      </section>

      {/* 배송정보 및 교환/환불 안내 섹션 */}
      <section className="max-w-screen-lg mx-auto mt-32 px-4">
        {/* 배송정보 */}
        <div className="border-t pt-8">
          <h3 className="text-2xl font-semibold mb-4">배송정보</h3>
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
          <h3 className="text-2xl font-semibold mb-4">교환, 환불, A/S 안내</h3>
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

      {/* 이 브랜드의 다른 상품 섹션 */}
    </>
  );
}
