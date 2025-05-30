// import { useState } from "react";
// import Image from "next/image";
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";


export default function SearchModal({ setIsOpen }: { setIsOpen: (value: boolean) => void }) {
    const [searchTerm, setSearchTerm] = useState(""); // 입력된 검색어 상태
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null); // input 요소를 위한 ref 생성
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL; //api 서버 주소

    const [suggestions, setSuggestions] = useState<string[]>([]); // 자동 완성 목록
    // const [loading, setLoading] = useState(false); // API 요청 상태
    const [isExiting, setIsExiting] = useState(false); //애니메이션 종료 후 닫히도록 

    // 모달이 열리면 자동으로 input에 포커스
    useEffect(() => {
        inputRef.current?.focus();
        setIsExiting(false); // ✅ 모달이 다시 열릴 때 `isExiting`을 초기화
    }, []);

    //엔터 클릭 시 product
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // if (e.key === "Enter" && searchTerm.trim()) {
        //     if (!searchTerm.trim()) {
        //         console.log("검색");
        //     }
        //     router.push(`/product?keyword=${encodeURIComponent(searchTerm)}`);
        //     setIsOpen(false);
        // }
        if (e.key === "Enter" && searchTerm.trim()) {
            router.push(`/product?keyword=${encodeURIComponent(searchTerm)}`);
            closeModal();
        }
    };

    //디바운싱 적용된 API 호출 함수
    const fetchSuggestions = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSuggestions([]); // 검색어 없으면 자동 완성 목록 초기화
            return;
        }

        // setLoading(true);
        try {
            const response = await fetch(`${baseUrl}/search/auto?keyword=${encodeURIComponent(query)}`);
            if (!response.ok) console.log("자동 완성 API 요청 실패", response.status);

            const data = await response.json();
            console.log("자동완성 api 요청 성공", data.result);
            setSuggestions(data.result || []); // API 응답에서 추천 검색어 저장
        } catch (error) {
            console.error("자동 완성 API 오류:", error);
        } finally {
            // setLoading(false);
        }
    }, [baseUrl]);

    //디바운싱 구현
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchSuggestions(searchTerm);
        }, 300); // 300ms 이후 API 호출

        return () => clearTimeout(timer); // 이전 타이머 제거 (디바운싱)
    }, [searchTerm, fetchSuggestions]);

    //닫기 버튼 클릭 시 애니메이션 실행 후 setIsOpen(false)
    const closeModal = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsExiting(false);  //300ms 후 초기화하여 모달을 다시 열 수 있게 함
            setIsOpen(false);
        }, 300);  // 애니메이션 지속시간과 동일하게 설정
    };

    return (
        <>
            {/* 전체 모달 화면 */}
            <AnimatePresence>
                {!isExiting && (
                    <motion.div
                        key="search-modal"
                        className="fixed inset-0 z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* 블러 배경 오버레이 */}
                        <div
                            className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-md"
                            onClick={closeModal}>
                        </div>

                        {/* 상단 검색 바 (하얀색 배경) */}
                        <motion.div
                            initial={{ y: "-100%", opacity: 0 }} // 처음에는 위로 숨김
                            animate={{ y: 0, opacity: 1 }} // 나타날 때 아래로 이동
                            exit={{ y: "-100%", opacity: 0 }} // 사라질 때 위로 이동
                            transition={{ duration: 0.3, ease: "easeInOut" }} // 부드러운 애니메이션
                            className="relative w-full bg-white px-4 md:px-8 lg:px-12 shadow-md h-1/2 overflow-hidden"
                            onAnimationComplete={(definition) => {
                                if (definition === "exit") {
                                    setIsOpen(false); //애니메이션 종료 후 상태 변경
                                }
                            }}
                        >

                            <div className="flex items-center justify-between px-6 py-4 relative">
                                {/* 로고 */}
                                <h1 className="text-xl font-bold">MOLLY</h1>

                                {/* 검색 입력 필드 */}
                                <div className="flex items-center flex-1 mx-4">
                                    <div className="relative w-full">
                                        <Search size={23} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            ref={inputRef} // ref 추가
                                            type="text"
                                            placeholder="검색"
                                            className="text-[#707072] w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                        />
                                    </div>
                                </div>

                                {/* 취소 버튼 */}
                                <button className="text-black text-sm font-medium" onClick={closeModal}>
                                    취소
                                </button>
                            </div>

                            {/* 자동 완성 목록 */}
                            {searchTerm && suggestions.length > 0 && (
                                // <div className="overflow-hidden">
                                <div className="overflow-y-auto max-h-[50vh]"> {/*스크롤 가능 설정 */}
                                    <ul className="py-2">
                                        {suggestions.map((keyword, index) => (
                                            <li
                                                key={index}
                                                className="py-2 px-4 cursor-pointer hover:bg-gray-200 transition"
                                                onClick={() => {
                                                    setSearchTerm(keyword);
                                                    router.push(`/product?keyword=${encodeURIComponent(keyword)}`);
                                                    setIsOpen(false);
                                                }}
                                            >
                                                {keyword}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}




                            {/* 검색 추천 키워드 영역 */}
                            {/* <div className="bg-white px-6 py-4 shadow-md">
                <h2 className="text-gray-600 text-sm font-semibold">인기 검색어</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                    {["jordan 1", "에어포스", "코르테즈", "에어맥스", "acg", "보메로", "v2k", "삭스"].map((keyword) => (
                        <button key={keyword} className="px-4 py-1 text-sm bg-gray-200 rounded-full">
                            {keyword}
                        </button>
                    ))}
                </div>
            </div> */}
                        </motion.div >
                    </motion.div>
                )}
            </AnimatePresence >

        </>
    );
}