"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Pagination } from "@/components/pagination";

interface InvoicesPaginationProps {
  currentPage: number;
  totalPages: number;
}

export function InvoicesPagination({
  currentPage,
  totalPages,
}: InvoicesPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }
      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      router.push(url, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
    />
  );
}
