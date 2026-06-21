/** Tham số phân trang đã chuẩn hoá (an toàn biên). */
export interface PaginationParams {
  page: number;
  limit: number;
}

/** Kết quả phân trang dùng chung cho mọi list endpoint. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Ép page/limit về khoảng hợp lệ (page ≥ 1, 1 ≤ limit ≤ maxLimit). */
export function normalizePagination(page?: number, limit?: number, maxLimit = 100): PaginationParams {
  return {
    page: Math.max(1, Number(page) || 1),
    limit: Math.min(maxLimit, Math.max(1, Number(limit) || 10)),
  };
}

/** Shape `meta` chuẩn để gắn vào ApiResponse. */
export function buildPaginationMeta(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) || 0 };
}
