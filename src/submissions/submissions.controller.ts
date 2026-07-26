import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { SubmissionStatus } from '@prisma/client';
import { SubmissionsService } from './submissions.service.js';
import { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { CreateSubmissionsBatchDto } from './dto/create-submissions-batch.dto.js';
import { ReviewSubmissionDto } from './dto/review-submission.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@ApiTags('Submissions')
@Controller('submissions')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'User: submit a single photo or video at a venue' })
  @ApiResponse({ status: 201, description: 'Submission created' })
  async create(@CurrentUser() user: User, @Body() dto: CreateSubmissionDto) {
    return this.submissionsService.create(user, dto);
  }

  @Post('batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'User: submit multiple photos/videos at a venue' })
  @ApiResponse({ status: 201, description: 'Submissions created' })
  async createBatch(@CurrentUser() user: User, @Body() dto: CreateSubmissionsBatchDto) {
    return this.submissionsService.createBatch(user, dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'User: list my submissions and their status' })
  @ApiQuery({ name: 'status', required: false, enum: SubmissionStatus })
  @ApiResponse({ status: 200, description: 'List of my submissions with venue and status' })
  async findMine(
    @CurrentUser() user: User,
    @Query('status') status?: SubmissionStatus,
  ) {
    return this.submissionsService.findMySubmissions(user, status);
  }

  @Get('venue/:venueId/approved-media')
  @ApiOperation({ summary: 'Public: list approved media for a venue (gallery)' })
  @ApiResponse({
    status: 200,
    description: 'List of approved photo/video submissions for the venue',
  })
  async getApprovedMediaForVenue(@Param('venueId') venueId: string) {
    return this.submissionsService.getApprovedMediaForVenue(venueId);
  }

  @Get('owner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: list submissions across all my venues' })
  @ApiQuery({ name: 'status', required: false, enum: SubmissionStatus })
  @ApiResponse({ status: 200, description: 'List of submissions' })
  async findForOwner(
    @CurrentUser() user: User,
    @Query('status') status?: SubmissionStatus,
  ) {
    return this.submissionsService.findForOwner(user, status);
  }

  @Get('venue/:venueId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: list submissions for a venue' })
  @ApiQuery({ name: 'status', required: false, enum: SubmissionStatus })
  @ApiResponse({ status: 200, description: 'List of submissions' })
  async findByVenue(
    @CurrentUser() user: User,
    @Param('venueId') venueId: string,
    @Query('status') status?: SubmissionStatus,
  ) {
    return this.submissionsService.findByVenue(venueId, user, status);
  }

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner: approve or reject a submission' })
  @ApiResponse({ status: 200, description: 'Submission reviewed, points awarded if approved' })
  async review(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.submissionsService.review(id, user, dto);
  }
}
