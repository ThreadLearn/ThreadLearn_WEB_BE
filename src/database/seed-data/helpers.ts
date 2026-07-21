export const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
export const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
export const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000);
export const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
export const thumb = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

export function sumEstimatedMinutes(sections: { lessons: { estimatedTime: number }[] }[]): number {
  return sections.reduce(
    (sum, s) => sum + s.lessons.reduce((a, l) => a + (l.estimatedTime || 0), 0),
    0,
  );
}
