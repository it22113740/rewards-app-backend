import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { UploadResourceType } from './upload.service.js';
import { UploadService } from './upload.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_FILES = 20; // max photos + videos per request

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Upload a single file (image or video) to Cloudinary',
    description: 'Use for submission media or shop image. For venue/shop image: upload here with resourceType "image", then pass the returned mediaUrl as imageUrl in POST /venues or PATCH /venues/:id.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Image or video file' },
        resourceType: { type: 'string', enum: ['image', 'video', 'auto'], description: 'Optional' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Returns { mediaUrl, publicId }' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_VIDEO_SIZE },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('resourceType') resourceType?: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException(
        'No file provided. Send as multipart/form-data with field "file".',
      );
    }
    const type: UploadResourceType =
      resourceType === 'video' ? 'video' : resourceType === 'image' ? 'image' : 'auto';
    if (type === 'image' && file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException(
        `Image must be under ${MAX_IMAGE_SIZE / 1024 / 1024} MB`,
      );
    }
    if (type === 'video' && file.size > MAX_VIDEO_SIZE) {
      throw new BadRequestException(
        `Video must be under ${MAX_VIDEO_SIZE / 1024 / 1024} MB`,
      );
    }
    return this.uploadService.uploadFile(file.buffer, type);
  }

  @Post('multiple')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upload multiple files (field: files)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' }, description: 'Multiple files' },
        resourceType: { type: 'string', enum: ['image', 'video', 'auto'], description: 'Optional' },
      },
      required: ['files'],
    },
  })
  @ApiResponse({ status: 201, description: 'Returns { uploads: [ { mediaUrl, publicId }, ... ] }' })
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_VIDEO_SIZE },
    }),
  )
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('resourceType') resourceType?: string,
  ) {
    if (!files?.length) {
      throw new BadRequestException(
        'No files provided. Send as multipart/form-data with field "files" (multiple).',
      );
    }
    const type: UploadResourceType =
      resourceType === 'video' ? 'video' : resourceType === 'image' ? 'image' : 'auto';
    const results: Array<{ mediaUrl: string; publicId: string }> = [];
    for (const file of files) {
      if (!file.buffer) continue;
      if (type === 'image' && file.size > MAX_IMAGE_SIZE) {
        throw new BadRequestException(
          `One or more images exceed ${MAX_IMAGE_SIZE / 1024 / 1024} MB`,
        );
      }
      if (type === 'video' && file.size > MAX_VIDEO_SIZE) {
        throw new BadRequestException(
          `One or more videos exceed ${MAX_VIDEO_SIZE / 1024 / 1024} MB`,
        );
      }
      const result = await this.uploadService.uploadFile(file.buffer, type);
      results.push(result);
    }
    return { uploads: results };
  }
}
