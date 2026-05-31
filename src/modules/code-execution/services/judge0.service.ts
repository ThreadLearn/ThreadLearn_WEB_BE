import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type Judge0Language = 'javascript' | 'python';

const LANGUAGE_IDS: Record<Judge0Language, number> = {
  javascript: 63,
  python:     71,
};

function mapStatus(id: number): string {
  if (id === 1 || id === 2) return 'PENDING';
  if (id === 3)  return 'ACCEPTED';
  if (id === 4)  return 'WRONG_ANSWER';
  if (id === 5)  return 'TIME_LIMIT_EXCEEDED';
  if (id === 6)  return 'COMPILATION_ERROR';
  if (id === 11 || id === 12) return 'RUNTIME_ERROR';
  return 'ERROR';
}

export interface Judge0Result {
  stdout: string;
  stderr: string;
  status: string;
  statusId: number;
  time: string;
  memory: number;
  compileOutput: string | null;
}

@Injectable()
export class Judge0Service {
  private readonly logger = new Logger(Judge0Service.name);

  constructor(private readonly config: ConfigService) {}

  async execute(
    code: string,
    language: Judge0Language,
    stdin: string,
    timeLimitSec: number,
  ): Promise<Judge0Result> {
    const apiKey      = this.config.get<string>('judge0.rapidApiKey');
    const apiUrl      = this.config.get<string>('judge0.apiUrl');
    const apiHost     = this.config.get<string>('judge0.rapidApiHost');
    const timeoutMs   = this.config.get<number>('judge0.timeoutMs') ?? 10000;
    const languageId  = LANGUAGE_IDS[language];

    if (!apiKey) {
      this.logger.warn('Judge0 mock mode — JUDGE0_RAPIDAPI_KEY not set.');
      return {
        stdout: stdin,
        stderr: '',
        status: 'ACCEPTED',
        statusId: 3,
        time: '0.045',
        memory: 1240,
        compileOutput: null,
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `${apiUrl}/submissions?base64_encoded=false&wait=true`,
        {
          method: 'POST',
          headers: {
            'Content-Type':   'application/json',
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': apiHost!,
          },
          body: JSON.stringify({
            source_code:     code,
            language_id:     languageId,
            stdin:           stdin ?? '',
            cpu_time_limit:  timeLimitSec,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        this.logger.error(`Judge0 HTTP error: ${response.status}`);
        return { stdout: '', stderr: `Judge0 returned HTTP ${response.status}`, status: 'ERROR', statusId: 13, time: '0', memory: 0, compileOutput: null };
      }

      const raw      = await response.json();
      const statusId = raw.status?.id ?? 13;
      return {
        stdout:        raw.stdout        ?? '',
        stderr:        raw.stderr        ?? '',
        status:        mapStatus(statusId),
        statusId,
        time:          raw.time          ?? '0',
        memory:        raw.memory        ?? 0,
        compileOutput: statusId === 6 ? (raw.compile_output ?? null) : null,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.logger.warn(`Judge0 timed out after ${timeoutMs}ms.`);
        return { stdout: '', stderr: '', status: 'TIME_LIMIT_EXCEEDED', statusId: 5, time: String(timeoutMs / 1000), memory: 0, compileOutput: null };
      }
      this.logger.error('Judge0 network error', err);
      return { stdout: '', stderr: 'Code execution service unavailable.', status: 'ERROR', statusId: 13, time: '0', memory: 0, compileOutput: null };
    } finally {
      clearTimeout(timer);
    }
  }
}
