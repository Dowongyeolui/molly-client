"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProfileModal from "./ProfileModal";
import SearchModal from "./SearchModal";
import NotificationSidebar from "./NotificationSidebar";
import { Search, UserRound, ShoppingCart } from "lucide-react";

export default function Navbar({ nickname }: { nickname: string }) {
  const router = useRouter();
  const [isProfileOpen, setProfileIsOpen] = useState(false); //프로필 모달
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleCategoryClick = (category: string) => {
    router.push(`/product?categories=${encodeURIComponent(category)}`);
  };

  useEffect(() => {
    if (nickname) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  return (
    <>
      <nav className="flex items-center justify-between px-3 py-5 ">
        {/* 로고 */}
        <Link href="/" className="text-xl">
          <h1 className="text-3xl font-bold italic ml-8">MOLLY</h1>
        </Link>

        {/* 메인 메뉴 */}
        <div className="flex gap-6">
          {/* <Link href="/product/men" className="hover:text-gray-600">남성</Link> */}
          <button
            onClick={() => handleCategoryClick("남성")}
            className="hover:text-gray-600"
          >
            남성
          </button>
          <button
            onClick={() => handleCategoryClick("여성")}
            className="hover:text-gray-600"
          >
            여성
          </button>
        </div>

        {/* 우측 아이콘들 */}
        <div className="flex items-center gap-1">
          {/* 검색 */}
          <div
            className="flex items-center w-[150px] bg-[#F5F5F5] rounded-full px-3 py-1 border-none hover:bg-gray-200 mr-1"
            // onClick={() => setIsSearchOpen(true)}
            onClick={() => {
              setIsSearchOpen(true);
              // setIsExiting(false); // 모달을 다시 열 수 있도록 초기화
            }}
          >
            <Search size={20} className="text-black" />
            <span className="ml-2 text-[#707072]">검색</span>
          </div>
          {/* 프로필 */}
          <button
            onClick={() => {
              setProfileIsOpen(!isProfileOpen);
            }}
            className="relative p-2 rounded-[10px] hover:bg-gray-200 transition flex items-center justify-center"
          >
            {nickname ? (
              <div className="rounded-full overflow-hidden">{nickname} 님</div>
            ) : (
              <UserRound size={21} className="rounded-full overflow-hidden" />
            )}
          </button>

          {/* 장바구니 -> 링크? 버튼? */}
          <Link
            href="/cart"
            className="p-2 rounded-[10px] hover:bg-gray-200 transition flex items-center justify-center"
          >
            <ShoppingCart size={21} />
          </Link>
        </div>
      </nav>

      {/* 모달 */}
      {isProfileOpen && (
        <ProfileModal
          setIsOpen={setProfileIsOpen}
          setIsNotificationOpen={setIsNotificationOpen}
          setIsLoggedIn={setIsLoggedIn}
          isLoggedIn={isLoggedIn}
        />
      )}
      {isSearchOpen && <SearchModal setIsOpen={setIsSearchOpen} />}
      {isNotificationOpen && (
        <NotificationSidebar setIsOpen={setIsNotificationOpen} />
      )}
    </>
  );
}
