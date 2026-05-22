/**
 * IDE Module — Playground configuration management.
 *
 * This module is a scaffold for saving/loading user code playground sessions.
 * It can be expanded to persist IDE state (file trees, open tabs, themes)
 * and support collaborative editing via Socket.IO in the future.
 */

export interface IPlaygroundSession {
  userId: string;
  languageId: number;
  sourceCode: string;
  stdin?: string;
  savedAt: Date;
}

const playgroundStore = new Map<string, IPlaygroundSession>();

export class IDEService {
  /**
   * Saves a playground session in-memory (can be replaced with MongoDB persistence).
   */
  static saveSession(userId: string, data: Omit<IPlaygroundSession, 'userId' | 'savedAt'>) {
    const session: IPlaygroundSession = {
      userId,
      ...data,
      savedAt: new Date(),
    };
    playgroundStore.set(userId, session);
    return session;
  }

  /**
   * Loads the most recent playground session for a user.
   */
  static loadSession(userId: string): IPlaygroundSession | null {
    return playgroundStore.get(userId) || null;
  }
}
export default IDEService;
