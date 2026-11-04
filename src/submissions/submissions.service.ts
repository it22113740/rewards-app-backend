import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Role, User } from '@prisma/client';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { VenuesService } from '../venues/venues.service.js';
import { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { CreateSubmissionsBatchDto } from './dto/create-submissions-batch.dto.js';
import { ReviewSubmissionDto } from './dto/review-submission.dto.js';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venuesService: VenuesService,
  ) {}

  async create(user: User, dto: CreateSubmissionDto) {
    if (user.role !== ('USER' as Role)) {
      throw new ForbiddenException('Only users can submit photos/videos at venues');
    }
    const venue = await this.prisma.venue.findUnique({
      where: { id: dto.venueId },
    });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }
    if (venue.bannedAt) {
      throw new ForbiddenException('This store is not accepting posts');
    }
    return this.prisma.submission.create({
      data: {
        userId: user.id,
        venueId: dto.venueId,
        type: dto.type,
        mediaUrl: dto.mediaUrl,
        status: SubmissionStatus.PENDING,
      },
      include: {
        venue: { select: { id: true, name: true } },
      },
    });
  }

  /** Create multiple submissions for the same venue in one request (e.g. multiple photos/videos). */
  async createBatch(user: User, dto: CreateSubmissionsBatchDto) {
    if (user.role !== ('USER' as Role)) {
      throw new ForbiddenException('Only users can submit photos/videos at venues');
    }
    const venue = await this.prisma.venue.findUnique({
      where: { id: dto.venueId },
    });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }
    if (venue.bannedAt) {
      throw new ForbiddenException('This store is not accepting posts');
    }
    const submissions = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.submission.create({
          data: {
            userId: user.id,
            venueId: dto.venueId,
            type: item.type,
            mediaUrl: item.mediaUrl,
            status: SubmissionStatus.PENDING,
          },
          include: {
            venue: { select: { id: true, name: true } },
          },
        }),
      ),
    );
    return { submissions };
  }

  /** User: list my own submissions with optional status filter. */
  async findMySubmissions(user: User, status?: SubmissionStatus) {
    return this.prisma.submission.findMany({
      where: {
        userId: user.id,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        venue: { select: { id: true, name: true } },
      },
    });
  }

  /** Public: list approved media (photos & videos) for a venue for gallery display. */
  async getApprovedMediaForVenue(venueId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true, bannedAt: true },
    });
    if (!venue || venue.bannedAt) {
      throw new NotFoundException('Venue not found');
    }

    return this.prisma.submission.findMany({
      where: {
        venueId,
        status: SubmissionStatus.APPROVED,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        mediaUrl: true,
        type: true,
        createdAt: true,
      },
    });
  }

  async findByVenue(venueId: string, user: User, status?: SubmissionStatus) {
    await this.venuesService.findOneForOwner(user, venueId);
    return this.prisma.submission.findMany({
      where: {
        venueId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });
  }

  /** Owner: list submissions across all venues owned by the current owner. */
  async findForOwner(user: User, status?: SubmissionStatus) {
    return this.prisma.submission.findMany({
      where: {
        venue: { owner: { userId: user.id } },
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        venue: { select: { id: true, name: true } },
        user: { select: { id: true, username: true, email: true } },
      },
    });
  }

  async findOneAndCheckOwnership(submissionId: string, user: User) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { venue: { include: { owner: true } } },
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    if (submission.venue.owner.userId !== user.id) {
      throw new ForbiddenException('You do not own this venue');
    }
    if (submission.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException('Submission has already been reviewed');
    }
    return submission;
  }

  async review(submissionId: string, user: User, dto: ReviewSubmissionDto) {
    if (dto.status === SubmissionStatus.PENDING) {
      throw new BadRequestException('Use APPROVED or REJECTED to review');
    }
    const submission = await this.findOneAndCheckOwnership(submissionId, user);
    if (dto.status === SubmissionStatus.REJECTED && !dto.rejectionReason?.trim()) {
      throw new BadRequestException('Rejection reason is required when rejecting');
    }

    const reviewedAt = new Date();
    const updates: {
      status: SubmissionStatus;
      rejectionReason?: string;
      reviewedAt: Date;
      pointsAwarded?: number;
    } = {
      status: dto.status,
      reviewedAt,
      ...(dto.status === SubmissionStatus.REJECTED && { rejectionReason: dto.rejectionReason }),
    };

    if (dto.status === SubmissionStatus.APPROVED) {
      const venue = await this.prisma.venue.findUnique({
        where: { id: submission.venueId },
      });
      if (!venue) throw new NotFoundException('Venue not found');
      const points =
        submission.type === 'VIDEO' ? venue.pointsPerVideo : venue.pointsPerPhoto;
      updates.pointsAwarded = points;

      await this.prisma.$transaction([
        this.prisma.submission.update({
          where: { id: submissionId },
          data: updates,
        }),
        this.prisma.userVenuePoints.upsert({
          where: {
            userId_venueId: { userId: submission.userId, venueId: submission.venueId },
          },
          create: {
            userId: submission.userId,
            venueId: submission.venueId,
            points,
          },
          update: { points: { increment: points } },
        }),
      ]);
    } else {
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: updates,
      });
    }

    return this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        user: { select: { id: true, username: true, email: true } },
        venue: { select: { id: true, name: true } },
      },
    });
  }
}
