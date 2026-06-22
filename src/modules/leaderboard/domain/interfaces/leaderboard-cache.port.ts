/**
 * Port trừu tượng hóa lớp cache cho bảng xếp hạng.
 * Infrastructure adapter (Redis) sẽ implement interface này.
 */
export interface RankedEntry {
  rank?: number;
  userId: string;
  name: string;
  avatarUrl?: string;
  level: number;
  xp: number;
}

export interface ILeaderboardCachePort {
  /** Lấy top rankings từ cache. Trả null nếu cache miss/lỗi */
  getTopRankings(limit: number): Promise<RankedEntry[] | null>;
  /** Đồng bộ danh sách rankings vào cache */
  syncRankings(entries: RankedEntry[]): Promise<void>;
  /** Xóa cache */
  invalidate(): Promise<void>;
}

export const LEADERBOARD_CACHE_PORT = Symbol('LEADERBOARD_CACHE_PORT');
