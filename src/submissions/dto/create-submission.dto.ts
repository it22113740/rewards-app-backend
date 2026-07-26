import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { SubmissionType } from '@prisma/client';

export class CreateSubmissionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  venueId: string;

  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  type: SubmissionType;

  @ApiProperty({ description: 'Cloudinary media URL from POST /upload or POST /upload/multiple' })
  @IsString()
  @MinLength(1)
  mediaUrl: string;
}
