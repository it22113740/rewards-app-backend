import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export type UploadResourceType = 'image' | 'video' | 'auto';

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(
    buffer: Buffer,
    resourceType: UploadResourceType = 'auto',
    folder = 'rewards',
  ): Promise<{ mediaUrl: string; publicId: string }> {
    const type = resourceType === 'auto' ? undefined : resourceType;
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: type ?? 'auto',
          folder,
        },
        (err, result) => {
          if (err) {
            reject(new BadRequestException(err.message ?? 'Upload failed'));
            return;
          }
          if (!result?.secure_url) {
            reject(new BadRequestException('Upload did not return a URL'));
            return;
          }
          resolve({
            mediaUrl: result.secure_url,
            publicId: result.public_id ?? '',
          });
        },
      );
      Readable.from(buffer).pipe(stream);
    });
  }
}
