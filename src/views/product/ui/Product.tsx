"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

export default function Product() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const imageUrl = process.env.NEXT_PUBLIC_IMAGE_URL;
  const productApiUrl = `${baseUrl}/product`;

  const [selectedSort, setSelectedSort] = useState("신상품순");
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const offsetIdRef = useRef(0); //리렌더없이 최신값 유지하기
  const [isLast, setIsLast] = useState(false);
  const [productList, setProductList] = useState<Product[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const triggerRef = useRef<HTMLDivElement | null>(null);

  const isRankingPage = searchParams.has("rank"); //랭킹페이지 구별하기 위한 변수

  // 정렬 옵션 매핑 (한글 → API 값)
  const sortOptions: Record<string, string> = {
    조회순: "VIEW_COUNT",
    신상품순: "CREATED_AT",
    판매순: "PURCHASE_COUNT",
    높은가격순: "PRICE_DESC",
    낮은가격순: "PRICE_ASC",
  };
  //품절 제외 체크박스 클릭 핸들러
  const handleExcludeSoldOutChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const checked = e.target.checked;
    const params = new URLSearchParams(window.location.search); // 현재 URL 파라미터 가져오기
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
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set("orderBy", orderBy); // orderBy 값을 params 객체에 추가 혹은 업데이트
    setSelectedSort(
      Object.keys(sortOptions).find((key) => sortOptions[key] === orderBy) || ""
    ); // UI에 표시할 한글 값 업데이트
    router.push(`/product?${params.toString()}`);
  };

  //특정 상품 클릭 시 url 변경
  const handleProductClick = (id: number) => {
    router.push(`/detail/${id}`);
  };

  //상품 api
  const fetchProductList = async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams(window.location.search);
      params.append("offsetId", offsetIdRef.current.toString()); //최신값 직접 접근
      console.log("요청 시 offsetId 값", offsetIdRef.current.toString());
      params.append("size", "48");

      const paramsString = `${productApiUrl}?${params.toString()}`;
      console.log("요청 시 ParamsString", paramsString);
      const response = await getProduct(paramsString);

      if (!response) throw new Error("상품 목록 API 요청 실패");

      const data = await response;
      console.log("상품 목록 api 응답 데이터:", data);

      const formattedData = data.data.map((item: Product) => ({
        id: item.id,
        url: item.thumbnail?.path,
        brandName: item.brandName,
        productName: item.productName,
        price: item.price,
      }));
      console.log("매핑된 데이터:", formattedData);

      if (offsetIdRef.current === 0) {
        // console.log("offsetId가 0일 때 productList 데이터 저장 로직");
        // const uniqueProductsMap = new Map<number, Product>();
        // formattedData.forEach((item: Product) => {
        //   if (!uniqueProductsMap.has(item.id)) {
        //     uniqueProductsMap.set(item.id, item);
        //   }
        // });

        // const uniqueProducts = Array.from(uniqueProductsMap.values());
        // console.log("중복된 productid 제거", uniqueProducts);

        setProductList(formattedData);
        // setProductList(uniqueProducts);
      } else {
        setProductList((prev) => [
          ...(prev ?? []),
          ...formattedData.filter(
            (newItem: Product) =>
              !(prev ?? []).some((item) => item.id === newItem.id)
          ),
        ]);
      }

      // offsetId 갱신
      const lastElementId = data.pageable?.lastElementId;
      offsetIdRef.current = lastElementId;

      console.log("offsetId 업데이트 이후", offsetIdRef.current);

      // if (offsetIdRef.current === 0) {

      //   console.log("offsetId가 0일 때 productList 데이터 저장 로직");
      //   const uniqueProductsMap = new Map<number, Product>();
      //   formattedData.forEach((item: Product) => {
      //     if (!uniqueProductsMap.has(item.id)) {
      //       uniqueProductsMap.set(item.id, item);
      //     }
      //   });

      //   const uniqueProducts = Array.from(uniqueProductsMap.values());
      //   console.log("중복된 productid 제거", uniqueProducts);

      //   // setProductList(formattedData);
      //   setProductList(uniqueProducts);
      // } else {
      //   setProductList((prev) => [
      //     ...(prev ?? []),
      //     ...formattedData.filter(
      //       (newItem: Product) =>
      //         !(prev ?? []).some((item) => item.id === newItem.id)
      //     ),
      //   ]);
      // }

      setIsLast(data.pageable.isLast);
      setIsLoading(false);
      console.log("3. 로딩 상태", isLoading);
      console.log("상품 목록 api 호출 완료");
    } catch (error) {
      console.error("상품 목록 API 요청 에러:", error);
    }
  };

  //파마리터가 바뀌면 api 호출
  useEffect(() => {
    console.log("searchParams 변경 시 api 호출");
    setProductList(null);
    offsetIdRef.current = 0;
    fetchProductList();
  }, [searchParams]); //window.local.search

  useEffect(() => {
    console.log("무한스크롤 useEffect 동작");
    if (!triggerRef.current || isLast || isLoading) return; //정환님이 수정하면 풀거임 지금 isLast가 true로 옴

    //콜백
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          console.log("트리거 요소가 화면에 보여짐");
          fetchProductList();
        }
      },
      { threshold: 0.1 }
    );

    const trgRef = triggerRef.current;
    if (trgRef) {
      observer.observe(trgRef); //감시 대상 등록
    }

    console.log("감시 대상 등록", trgRef);

    return () => {
      if (triggerRef.current) observer.unobserve(triggerRef.current);
    };
  }, [productList]); //수정 전 : 왜 의존성 배열에 page, isLoading, isLast 넣어야 무한스크롤 트리거 되는지 모르겠음.

  return (
    <>
      <div className="px-20 mt-10">
        {/* 카테고리 버튼 */}
        {!isRankingPage && (
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
        )}

        {/* 품절, 정렬 */}
        {!isRankingPage && (
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
                  onClick={() => handleSortChange(label)}
                >
                  {" "}
                  {label}
                </button>
              ))}
            </div>
            {/* 정렬 : 작은 화면에서는 단일 버튼으로 변경 */}
            <button
              className="md:hidden hover:underline"
              onClick={() => setIsSortModalOpen(true)}
            >
              {selectedSort || "조회순"}
            </button>
          </div>
        )}

        {/* 상품 리스트 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 md:grid-cols-2 sm:grid-cols-2 gap-2 mt-1">
          {productList && productList.length === 0 && !isLoading ? (
            <p className="text-center text-gray-500 mt-10">
              {" "}
              검색된 상품이 없습니다.{" "}
            </p>
          ) : (
            <>
              {/* 기존 상품 UI : productList가 null이 아니고 비어있지 않을 때*/}
              {productList &&
                productList.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex flex-col items-center mt-10"
                  >
                    <div className="aspect-square relative w-full">
                      {/* 랭킹 뱃지 */}
                      {isRankingPage && (
                        <div className="absolute top-0 left-0 bg-black text-white text-sm px-2 py-1 z-10 text-center">
                          {index + 1}
                        </div>
                      )}
                      <Image
                        src={
                          item.url
                            ? `${imageUrl}${item.url}?w=300&h=300&r=true`
                            : "/images/noImage.svg"
                        }
                        alt={item.productName}
                        fill
                        loading="eager"
                        fetchPriority="high"
                        priority={true}
                        className="h-full object-cover cursor-pointer"
                        onClick={() => handleProductClick(item.id)}
                        unoptimized={true}
                      />
                    </div>
                    <button
                      className="flex flex-col items-start w-full overflow-hidden"
                      onClick={() => handleProductClick(item.id)}
                    >
                      <p className="text-left mt-1 text-sm font-semibold">
                        {" "}
                        {item.brandName}{" "}
                      </p>
                      <p className="text-left text-sm text-gray-500 truncate w-full">
                        {" "}
                        {item.productName}{" "}
                      </p>
                      <p className="text -left text-black-500 font-semibold">
                        {" "}
                        {item.price.toLocaleString()}원
                      </p>
                    </button>
                  </div>
                ))}

              {/* 로딩 : isLoading이 true일 때만 렌더링*/}
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

              {/* 무한스크롤 트리거 :  */}
              {!isLast && !isLoading && (
                <div ref={triggerRef} className="h-20 w-full"></div>
              )}
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
