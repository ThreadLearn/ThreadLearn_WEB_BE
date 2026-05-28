import { env } from '../../../configs/env';
import { logger } from '../../../configs/logger';

export type Judge0Language = 'javascript' | 'python';

// Judge0 Community Edition language IDs
const LANGUAGE_IDS: Record<Judge0Language, number> = {
  javascript: 63, // Node.js 12.14.0
  python: 71,     // Python 3.8.1
};

// Status ID → human-readable string mapping
// https://ce.judge0.com/statuses
function mapStatus(id: number): string {
  if (id === 1 || id === 2) return 'PENDING';
  if (id === 3) return 'ACCEPTED';
  if (id === 4) return 'WRONG_ANSWER';
  if (id === 5) return 'TIME_LIMIT_EXCEEDED';
  if (id === 6) return 'COMPILATION_ERROR';
  if (id === 11 || id === 12) return 'RUNTIME_ERROR';
  return 'ERROR';
}

export interface Judge0Result {
  stdout: string;
  stderr: string;
  status: string;       // e.g. "ACCEPTED", "COMPILATION_ERROR"
  statusId: number;     // raw Judge0 status ID
  time: string;         // seconds, e.g. "0.045"
  memory: number;       // KB
  compileOutput: string | null;
}

export class Judge0Service {
  static async execute(
    code: string,
    language: Judge0Language,
    stdin: string,
    timeLimitSec: number
  ): Promise<Judge0Result> {
    const languageId = LANGUAGE_IDS[language];

    // Mock mode when RapidAPI key is absent
    if (!env.JUDGE0_RAPIDAPI_KEY) {
      logger.info('Judge0 mock mode active — JUDGE0_RAPIDAPI_KEY not set.');
      return {
        stdout: stdin, // echo stdin so expected === actual in mock grading
        stderr: '',
        status: 'ACCEPTED',
        statusId: 3,
        time: '0.045',
        memory: 1240,
        compileOutput: null,
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.JUDGE0_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${env.JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': env.JUDGE0_RAPIDAPI_KEY,
            'X-RapidAPI-Host': env.JUDGE0_RAPIDAPI_HOST,
          },
          body: JSON.stringify({
            source_code: code,
            language_id: languageId,
            stdin: stdin ?? '',
            cpu_time_limit: timeLimitSec,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        logger.error(`Judge0 HTTP error: ${response.status} ${response.statusText}`);
        return {
          stdout: '',
          stderr: `Judge0 returned HTTP ${response.status}`,
          status: 'ERROR',
          statusId: 13,
          time: '0',
          memory: 0,
          compileOutput: null,
        };
      }

      const raw = await response.json();
      const statusId: number = raw.status?.id ?? 13;
      const status = mapStatus(statusId);

      return {
        stdout: raw.stdout ?? '',
        stderr: raw.stderr ?? '',
        status,
        statusId,
        time: raw.time ?? '0',
        memory: raw.memory ?? 0,
        compileOutput: statusId === 6 ? (raw.compile_output ?? null) : null,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        logger.warn(`Judge0 request timed out after ${env.JUDGE0_TIMEOUT_MS}ms.`);
        return {
          stdout: '',
          stderr: '',
          status: 'TIME_LIMIT_EXCEEDED',
          statusId: 5,
          time: String(env.JUDGE0_TIMEOUT_MS / 1000),
          memory: 0,
          compileOutput: null,
        };
      }
      logger.error('Judge0 network error', err);
      return {
        stdout: '',
        stderr: 'Code execution service unavailable.',
        status: 'ERROR',
        statusId: 13,
        time: '0',
        memory: 0,
        compileOutput: null,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

export default Judge0Service;

/*
  Raw Judge0 RapidAPI response example (base64_encoded=false&wait=true):
  {
    "stdout": "Hello, World!\n",
    "stderr": null,
    "compile_output": null,
    "message": null,
    "time": "0.045",
    "memory": 1240,
    "status": { "id": 3, "description": "Accepted" },
    "token": "d85cd024-1548-4165-aebc-5d9d8b1a0ebe"
  }

  Compilation error (status.id === 6):
  {
    "stdout": null,
    "stderr": null,
    "compile_output": "SyntaxError: ...\n",
    "status": { "id": 6, "description": "Compilation Error" },
    ...
  }
*/
