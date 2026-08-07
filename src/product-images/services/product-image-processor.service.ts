import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, promises as fs } from 'fs';
import { extname, join } from 'path';
import sharp from 'sharp';

export interface ProcessedProductImage {
  originalUrl: string;
  largeUrl: string;
  imageUrl: string;
  thumbnailUrl: string;
}

@Injectable()
export class ProductImageProcessorService {
  private readonly uploadRoot = join(process.cwd(), 'uploads', 'products');

  private readonly originalDirectory = join(this.uploadRoot, 'original');

  private readonly largeDirectory = join(this.uploadRoot, 'large');

  private readonly mediumDirectory = join(this.uploadRoot, 'medium');

  private readonly thumbnailDirectory = join(this.uploadRoot, 'thumbnail');

  constructor() {
    this.createDirectories();
  }

  async process(file: Express.Multer.File): Promise<ProcessedProductImage> {
    if (!file?.buffer) {
      throw new BadRequestException('Không tìm thấy dữ liệu file ảnh');
    }

    const metadata = await sharp(file.buffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new BadRequestException('Không thể xác định kích thước ảnh');
    }

    // Không nhận ảnh quá nhỏ vì crop sẽ làm ảnh bị mờ.
    if (metadata.width < 600 || metadata.height < 600) {
      throw new BadRequestException(
        'Ảnh phải có chiều rộng và chiều cao tối thiểu 600px',
      );
    }

    // Hạn chế ảnh có độ phân giải quá lớn.
    const totalPixels = metadata.width * metadata.height;

    if (totalPixels > 40_000_000) {
      throw new BadRequestException('Độ phân giải ảnh quá lớn');
    }

    const fileId = randomUUID();

    const originalExtension = this.getSafeExtension(file.mimetype);

    const originalFilename = `${fileId}${originalExtension}`;

    const webpFilename = `${fileId}.webp`;

    const originalPath = join(this.originalDirectory, originalFilename);

    const largePath = join(this.largeDirectory, webpFilename);

    const mediumPath = join(this.mediumDirectory, webpFilename);

    const thumbnailPath = join(this.thumbnailDirectory, webpFilename);

    const createdFiles: string[] = [];

    try {
      // Lưu bản gốc
      await fs.writeFile(originalPath, file.buffer);

      createdFiles.push(originalPath);

      // rotate() tự xử lý hướng ảnh dựa trên EXIF.
      const baseImage = sharp(file.buffer).rotate();

      // Ảnh dùng cho chi tiết và zoom
      await baseImage
        .clone()
        .resize(1200, 1200, {
          fit: 'cover',
          position: 'centre',
          withoutEnlargement: true,
        })
        .webp({
          quality: 88,
        })
        .toFile(largePath);

      createdFiles.push(largePath);

      // Ảnh mặc định cho danh sách sản phẩm
      await baseImage
        .clone()
        .resize(600, 600, {
          fit: 'cover',
          position: 'centre',
          withoutEnlargement: true,
        })
        .webp({
          quality: 85,
        })
        .toFile(mediumPath);

      createdFiles.push(mediumPath);

      // Ảnh nhỏ cho giỏ hàng và danh sách nhỏ
      await baseImage
        .clone()
        .resize(300, 300, {
          fit: 'cover',
          position: 'centre',
          withoutEnlargement: true,
        })
        .webp({
          quality: 80,
        })
        .toFile(thumbnailPath);

      createdFiles.push(thumbnailPath);

      return {
        originalUrl: `/uploads/products/original/${originalFilename}`,

        largeUrl: `/uploads/products/large/${webpFilename}`,

        imageUrl: `/uploads/products/medium/${webpFilename}`,

        thumbnailUrl: `/uploads/products/thumbnail/${webpFilename}`,
      };
    } catch {
      await this.deletePhysicalFiles(createdFiles);

      throw new InternalServerErrorException('Xử lý ảnh sản phẩm thất bại');
    }
  }

  async deleteByUrls(urls: {
    originalUrl: string;
    largeUrl: string;
    imageUrl: string;
    thumbnailUrl: string;
  }): Promise<void> {
    const paths = [
      this.urlToPhysicalPath(urls.originalUrl),
      this.urlToPhysicalPath(urls.largeUrl),
      this.urlToPhysicalPath(urls.imageUrl),
      this.urlToPhysicalPath(urls.thumbnailUrl),
    ];

    await this.deletePhysicalFiles(paths);
  }

  filesExist(urls: {
    originalUrl: string;
    largeUrl: string;
    imageUrl: string;
    thumbnailUrl: string;
  }): boolean {
    return [
      urls.originalUrl,
      urls.largeUrl,
      urls.imageUrl,
      urls.thumbnailUrl,
    ].every((url) => existsSync(this.urlToPhysicalPath(url)));
  }

  private createDirectories(): void {
    const directories = [
      this.originalDirectory,
      this.largeDirectory,
      this.mediumDirectory,
      this.thumbnailDirectory,
    ];

    for (const directory of directories) {
      if (!existsSync(directory)) {
        mkdirSync(directory, {
          recursive: true,
        });
      }
    }
  }

  private getSafeExtension(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return '.jpg';

      case 'image/png':
        return '.png';

      case 'image/webp':
        return '.webp';

      default:
        throw new BadRequestException('Định dạng ảnh không được hỗ trợ');
    }
  }

  private urlToPhysicalPath(fileUrl: string): string {
    const normalizedUrl = fileUrl.replace(/^\/uploads\//, '');

    return join(process.cwd(), 'uploads', normalizedUrl);
  }

  private async deletePhysicalFiles(paths: string[]): Promise<void> {
    await Promise.all(
      paths.map(async (filePath) => {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          const nodeError = error as NodeJS.ErrnoException;

          if (nodeError.code !== 'ENOENT') {
            throw error;
          }
        }
      }),
    );
  }
}
