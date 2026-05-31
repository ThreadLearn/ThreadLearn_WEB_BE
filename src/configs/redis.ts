// Compatibility shim — RedisService is injected via DI in NestJS modules.
// Old services that still use getRedisClient() fall back to no-op.
export function getRedisClient() {
  return {
    isOpen:          false,
    get:             async (_: string) => null as string | null,
    set:             async () => {},
    setEx:           async () => {},
    incr:            async () => 0,
    expire:          async () => {},
    zAdd:            async () => 0,
    zRangeWithScores: async () => [] as any[],
    zRange:          async () => [] as any[],
  };
}
export default getRedisClient;
