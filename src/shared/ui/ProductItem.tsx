import { memo } from "react";
import Image from "next/image";

interface Thumbnail {
  path: string;
  filename: string;
}

export interface ProductType  {
  id: number;
  url: string;
  brandName: string;
  productName: string;
  price: number;
  thumbnail: Thumbnail;
}

interface ProductItemProps {
  item: ProductType ;
  index: number;
  isRankingPage: boolean;
  imageUrl: string | undefined;
  onProductClick: (id: number) => void;
}

const ProductItem = memo(function ProductItem({
  item,
  index,
  isRankingPage,
  imageUrl,
  onProductClick
}: ProductItemProps) {
  console.log(`ProductItem ${item.id} 렌더링`);

  return (
    <div className="flex flex-col items-center mt-10">
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
          onClick={() => onProductClick(item.id)}
          unoptimized={true}
        />
      </div>
      <button
        className="flex flex-col items-start w-full overflow-hidden"
        onClick={() => onProductClick(item.id)}
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
  );
});


export default ProductItem;