"use client";
import { AppSidebar } from "../components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";
import { Separator } from "./separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "./sidebar";
import { useSellerStore } from "../../../app/provider/Sellerstore";
import { ProductRegister } from "../components/ProductRegister";
import { ProductRetriever } from "../components/ProductRetriever";
import { ProductModify } from "../components/ProductModify";
import { ProductDelete } from "../components/ProductDelete";
import { Pageable, ProductData } from "../../../../app/seller/page";
import { ProductBatch } from "../components/ProductBatch";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export interface SellerContainerProps {
  productRes: {
    pageable: Pageable;
    data: ProductData[];
  };
}

export default function SellerContainer({ productRes }: SellerContainerProps) {
  const { currentView } = useSellerStore();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("상품 조회"); // 기본값

  useEffect(() => {
    // URL 쿼리 파라미터에서 탭 정보 가져오기
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      console.log(activeTab);
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const viewComponents = {
    "상품 삭제": <ProductDelete />,
    "상품 수정": <ProductModify productRes={productRes} />,
    "상품 조회": <ProductRetriever productRes={productRes} />,
    "상품 등록": <ProductRegister />,
    "상품 일괄 등록": <ProductBatch />,
    // '상품 파일 등록': <뭐어쩌구저꺼구/>,
    기본: <ProductRetriever productRes={productRes} />,
  };

  const renderContent = () =>
    viewComponents[currentView as keyof typeof viewComponents] ||
    viewComponents.기본;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">상품관리</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentView}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {renderContent()}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
