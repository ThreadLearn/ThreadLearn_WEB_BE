// Compatibility shim for old `import { logger } from '../configs/logger'`
// Old modules can keep their imports during migration.
import { Logger } from '@nestjs/common';

const _logger = new Logger('App');

export const logger = {
  info:  (msg: string, ...args: any[]) => _logger.log(msg, ...args),
  warn:  (msg: string, ...args: any[]) => _logger.warn(msg, ...args),
  error: (msg: string, ...args: any[]) => _logger.error(msg, ...args),
  debug: (msg: string, ...args: any[]) => _logger.debug(msg, ...args),
};

export default logger;
