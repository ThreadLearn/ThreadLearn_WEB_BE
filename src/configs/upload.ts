import fs from 'fs';
import path from 'path';
import { env } from './env';
import { logger } from './logger';
import { BadRequestError } from '../common/custom-error';

export async function saveUploadedFile(file: File, folder = 'attachments'): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Validate size
  const maxBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new BadRequestError(`File size exceeds the configured max limit of ${env.MAX_FILE_SIZE_MB}MB.`);
  }

  // Create path
  const targetDir = path.join(process.cwd(), env.UPLOAD_DIR, folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Generate safe name
  const originalExtension = path.extname(file.name);
  const baseName = path.basename(file.name, originalExtension).replace(/[^a-zA-Z0-9]/g, '_');
  const uniqueName = `${Date.now()}-${baseName}${originalExtension}`;
  const filePath = path.join(targetDir, uniqueName);

  await fs.promises.writeFile(filePath, buffer);
  logger.info(`💾 File saved successfully: ${filePath}`);

  return `/uploads/${folder}/${uniqueName}`;
}
