import fs from 'fs';
import path from 'path';
import { env } from './env';
import { logger } from './logger';
import { BadRequestError } from '../common/custom-error';

type UploadFile = File | Express.Multer.File;

export async function saveUploadedFile(file: UploadFile, folder = 'attachments'): Promise<string> {
  const isMulterFile = 'buffer' in file;
  const buffer = isMulterFile ? file.buffer : Buffer.from(await file.arrayBuffer());

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
  const originalName = isMulterFile ? file.originalname : file.name;
  const originalExtension = path.extname(originalName);
  const baseName = path.basename(originalName, originalExtension).replace(/[^a-zA-Z0-9]/g, '_');
  const uniqueName = `${Date.now()}-${baseName}${originalExtension}`;
  const filePath = path.join(targetDir, uniqueName);

  await fs.promises.writeFile(filePath, buffer);
  logger.info(`💾 File saved successfully: ${filePath}`);

  return `/uploads/${folder}/${uniqueName}`;
}
