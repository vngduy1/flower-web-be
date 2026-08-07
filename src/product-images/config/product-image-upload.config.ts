import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const productImageUploadOptions: MulterOptions = {
  storage: memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (
    request: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(
        new BadRequestException('Chỉ chấp nhận file JPG, PNG hoặc WEBP'),
        false,
      );

      return;
    }

    callback(null, true);
  },
};
