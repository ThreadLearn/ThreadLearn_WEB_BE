/**
 * Presenter: đảm bảo response shape giữ nguyên cho FE.
 * top = [{rank, userId, name, avatarUrl, level, xp}]
 * me  = {rank, xp}
 */
export class LeaderboardPresenter {
  static toTopResponse(entries: { rank?: number; userId: string; name: string; avatarUrl?: string; level: number; xp: number }[]) {
    return entries.map((e) => ({
      rank: e.rank,
      userId: e.userId,
      name: e.name,
      avatarUrl: e.avatarUrl,
      level: e.level,
      xp: e.xp,
    }));
  }

  static toMyRankResponse(data: { rank: number | null; xp: number }) {
    return {
      rank: data.rank,
      xp: data.xp,
    };
  }
}
