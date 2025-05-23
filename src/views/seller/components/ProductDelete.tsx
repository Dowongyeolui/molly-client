'use client';

import {useState} from 'react';
import {Trash2} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import {deleteProduct} from '../api/deleteProduct';

export const ProductDelete = () => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (productId: number) => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      await deleteProduct(productId);
      setIsDeleting(false);
    } catch (error) {
      console.error(error);
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
        <Table>
          <TableCaption>등록된 판매 상품</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">상품 ID</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>브랜드</TableHead>
              <TableHead>사이즈</TableHead>
              <TableHead>가격</TableHead>
              <TableHead>재고</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">33</TableCell>
              <TableCell>멋진옷</TableCell>
              <TableCell>멋진</TableCell>
              <TableCell>XL</TableCell>
              <TableCell>$250.00</TableCell>
              <TableCell>2</TableCell>
              <TableCell
                className="flex justify-center cursor-pointer"
                onClick={() => {
                  handleDelete(33);
                }}
              >
                <Trash2 />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
