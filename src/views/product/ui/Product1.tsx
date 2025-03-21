"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useScrollStore } from "@/app/provider/scrollStore";
import { useUrlStore } from "@/app/provider/UrlStore";
import Image from "next/image";
import FilterSidebar from "../FilterSidebar";
import SortModal from "../SortModal";
import getProduct from "@/shared/api/getProduct";
interface Thumbnail {
  path: string;
  filename: string;
}
interface Product {
  id: number;
  url: string;
  brandName: string;
  productName: string;
  price: number;
  thumbnail: Thumbnail;
}

const categories = ["카테고리", "성별", "색상", "가격", "사이즈", "브랜드"];

export default function Product1() {
  const router = useRouter();
  // const searchParams = useSearchParams(); //쿼리 파라미터 가져오기(현재url의 쿼리 파라미터 가져오기)
  const { searchParams } = useUrlStore(); // 전역 상태 사용

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL; //api 서버 주소
  const imageUrl = process.env.NEXT_PUBLIC_IMAGE_URL; //이미지 서버 주소
  const productApiUrl = `${baseUrl}/product`; // 상품 목록 API 엔드포인트

  const [selectedSort, setSelectedSort] = useState("조회순"); //현재 선택된 정렬 기준
  const [isSortModalOpen, setIsSortModalOpen] = useState(false); //정렬 모달창 열림 상태(반응형)
  const [isFilterOpen, setIsFilterOpen] = useState(false); //필터 모달창 열림 상태

  const [productList, setProductList] = useState<Product[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLast, setIsLast] = useState(false);
  // const [filters, setFilters] = useState({
  //   keyword: "", categories: "", colorCode: "", productSize: "",
  //   brandName: "", priceGoe: "", priceLt: "", excludeSoldOut: "",
  // });
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const { page, setPage } = useScrollStore();

  // 정렬 옵션 매핑 (한글 → API 값)
  const sortOptions: Record<string, string> = {
    조회순: "VIEW_COUNT",
    신상품순: "CREATED_AT",
    판매순: "PURCHASE_COUNT",
    낮은가격순: "PRICE_ASC",
    높은가격순: "PRICE_DESC",
  };
  //품절 제외 체크박스 클릭 핸들러
  const handleExcludeSoldOutChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const checked = e.target.checked;
    const params = new URLSearchParams(window.location.search); // 현재 URL 파라미터 가져오기
    // setExcludeSoldOut(checked);

    if (checked) {
      params.set("excludeSoldOut", "true");
    } else {
      params.delete("excludeSoldOut");
    }

    router.push(`/product?${params.toString()}`); // URL 변경
  };
  // 정렬 버튼 클릭 핸들러
  const handleSortChange = (sortLabel: string) => {
    const orderBy = sortOptions[sortLabel]; // 한글 → API 값 변환

    if (!orderBy) {
      console.log("정렬 값이 한글로 변환되지 않았음");
      return; // 만약 변환이 실패하면 실행하지 않음
    }

    const params = new URLSearchParams(window.location.search);

    params.set("orderBy", orderBy); // 선택한 정렬 기준 추가
    params.set("page", "0"); // 첫 페이지부터 요청
    params.set("size", "48");

    // setSelectedSort(sortLabel); // 선택된 정렬 상태 업데이트
    setSelectedSort(
      Object.keys(sortOptions).find((key) => sortOptions[key] === orderBy) ||
        "조회순"
    ); // UI에 표시할 한글 값 업데이트
    router.push(`/product?${params.toString()}`); // URL 변경 → useEffect 감지 후 API 요청됨
  };
  //특정 상품 클릭 시 url 변경
  const handleProductClick = (id: number) => {
    // router.push(`/detail?productId=${id}`);
    router.push(`/detail/${id}`);
  };

  useEffect(() => {
    const updatedFilters: Partial<typeof filters> = {};
    searchParams.forEach((value, key) => {
      if (value) {
        updatedFilters[key as keyof typeof filters] = value;
      }
    });
    setFilters(updatedFilters as typeof filters);

    setIsLast(false);
    setProductList([]); //기존 데이터를 초기화하는게 맞긴 한데 무한스크롤 시에는 초기화되면 안됨. 어떻게 하지
  }, [searchParams.toString()]);

  const fetchProductList = async (page: number) => {
    if (isLast) return;
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      console.log("api 호출 시 현재 페이지:", page);
      params.append("size", "48");

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const paramsString = `${productApiUrl}?${params.toString()}`;
      console.log(paramsString);
      const response = await getProduct(paramsString);

      if (!response) {
        throw new Error("상품 목록 API 요청 실패");
      }

      const data = await response;
      console.log(
        "상품 목록 api 응답 성공:",
        data,
        new Date().toLocaleString()
      );

      const formattedData = data.data.map((item: Product) => ({
        id: item.id,
        url: item.thumbnail?.path,
        brandName: item.brandName,
        productName: item.productName,
        price: item.price,
      }));

      setProductList((prev) => [
        ...(prev ?? []),
        ...formattedData.filter(
          (newItem: Product) =>
            !(prev ?? []).some((item) => item.id === newItem.id)
        ),
      ]);

      setIsLast(data.pageable.isLast);
      setIsLoading(false);
    } catch (error) {
      console.error("상품 목록 API 요청 에러:", error);
    } finally {
      setIsLoading(() => false);
    }
  };

  // filters 변경 시 API 요청 실행
  useEffect(() => {
    // return ()=>{fetchProductList(0);}
    fetchProductList(0);
  }, [searchParams]);

  useEffect(() => {
    const trgRef = triggerRef.current;
    // if (!triggerRef.current || isLast) return;
    if (!trgRef || isLast || isLoading) return; //로딩 중일 때 중복 호출 방지

    const observer = new IntersectionObserver( //새로운 IntersectionObserver 객체 생성: 특정 요소(triggerRef.current)가 뷰토트에 진입했는지 감지하기 위해 사용
      (entries) => {
        //감지된 요소임. 하나의 triggerRef만 감지
        if (entries[0].isIntersecting && !isLoading) {
          fetchProductList(page);
          console.log("페이지 증가 전", page);
          setPage(page + 1); //페이지 증가
          console.log("무한스크롤로 상품 목록 api 요청");
        }
      },
      { threshold: 1.0 } //감지된 요소가 100% 화면에 나타날 때만 실행
    );
    observer.observe(trgRef); //감지 대상 등록

    return () => {
      //useEffect 클린업 함수. 언마운트될때 실행됨
      if (trgRef) observer.unobserve(trgRef);
    };
  }, [page, isLoading, isLast]); //isLoading, fetchproductList, isLast를 넣으라는데
  //왜 의존성 배열에 이렇게 넣어야 무한스크롤 트리거 되는지 모르겠음.

  return (
    <>
      <div className="px-20 mt-10">
        {/* 카테고리 버튼 */}
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              className={
                "px-4 py-2 rounded-full text-sm bg-gray-100 hover:bg-gray-300 flex-shrink-0"
              }
              onClick={() => setIsFilterOpen(true)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* 품절 체크박스, 정렬 */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex itmes-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                id="exclude-sold-out"
                className="w-4 h-4"
                onChange={handleExcludeSoldOutChange}
                checked={!!searchParams.get("excludeSoldOut")} // URL의 파라미터 값에 따라 체크 여부 결정
              />{" "}
              품절 제외
            </label>
          </div>

          {/* 정렬 : 큰 화면에서 정렬 버튼 전체 표시 */}
          <div className="hidden md:flex gap-4">
            {Object.keys(sortOptions).map((label) => (
              <button
                key={label}
                className={`hover:underline hover:text-black ${
                  selectedSort === label
                    ? "text-black underline"
                    : "text-gray-500"
                }`}
                onClick={() => handleSortChange(label)} // 한글 → API 값 변환 후 요청
              >
                {label}
              </button>
            ))}
          </div>
          {/* 정렬 : 작은 화면에서는 단일 버튼으로 변경 */}
          <button
            className="md:hidden hover:underline"
            onClick={() => setIsSortModalOpen(true)}
          >
            {selectedSort}
          </button>
        </div>

        {/* 상품 리스트 */}
        <div className="grid grid-cols-1 lg:grid-cols-6 md:grid-cols-2 sm:grid-cols-2 gap-2 mt-1">
          {productList && productList.length === 0 && !isLoading ? (
            // 응답이 왔지만 상품이 없는 경우
            <p className="text-center text-gray-500 mt-10">
              검색된 상품이 없습니다.
            </p>
          ) : (
            <>
              {/* 기존 상품 UI */}
              {productList &&
                productList.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col items-center mt-10"
                  >
                    <Image
                      src={
                        item.url
                          ? `${imageUrl}${item.url}`
                          : "/images/noImage.svg"
                      }
                      alt={item.productName}
                      width={250}
                      height={300}
                      loading="eager"
                      priority={true}
                      className="w-full h-auto object-contain cursor-pointer"
                      onClick={() => handleProductClick(item.id)}
                    />
                    <button
                      className="flex flex-col items-start w-full overflow-hidden"
                      onClick={() => handleProductClick(item.id)}
                    >
                      <p className="text-left mt-1 text-sm font-semibold">
                        {item.brandName}
                      </p>
                      <p className="text-left text-sm text-gray-500 truncate w-full">
                        {item.productName}
                      </p>
                      <p className="text-left text-black-500 font-semibold">
                        {item.price.toLocaleString()}원
                      </p>
                    </button>
                  </div>
                ))}

              {/* 무한스크롤 트리거 */}
              {!isLast && <div ref={triggerRef} className="h-20 w-full"></div>}

              {/* 추가 로딩 중인 경우: 기존 UI는 그대로 유지하면서 하단에 스켈레톤 UI 추가 */}
              {isLoading &&
                Array.from({ length: 48 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-left mt-10 animate-pulse"
                  >
                    <div className="w-full aspect-[5/6] bg-gray-300 animate-pulse" />
                    <div className="w-32 h-4 bg-gray-300 mt-2" />
                    <div className="w-28 h-4 bg-gray-200 mt-1" />
                    <div className="w-24 h-4 bg-gray-200 mt-1" />
                  </div>
                ))}
            </>
          )}
        </div>

        {isFilterOpen && <FilterSidebar setIsOpen={setIsFilterOpen} />}
        <SortModal
          isOpen={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          onSortSelect={(sort) => handleSortChange(sort)}
          selectedSort={selectedSort}
        />
      </div>
    </>
  );
}
