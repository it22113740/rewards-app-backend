import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { SubmissionType } from '@prisma/client';

export class CreateSubmissionItemDto {
  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  type: SubmissionType;

  @ApiProperty({ description: 'Cloudinary media URL' })
  @IsString()
  @MinLength(1)
  mediaUrl: string;
}
