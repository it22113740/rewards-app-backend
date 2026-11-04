import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Role, User } from '@prisma/client';
import { RedemptionStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { VenuesService } from '../venues/venues.service.js';

@Injectable()
export class RedemptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venuesService: VenuesService,
  ) {}

  private generatePromoCode(prefix?: string | null): string {
    const pre = (prefix?.trim() || 'RWD').toUpperCase().replace(/\s/g, '');
    const suffix = randomBytes(4).toString('hex').toUpperCase();
    return `${pre}-${suffix}`;
  }

  async redeem(user: User, perkId: string) {
    if (user.role !== ('USER' as Role)) {
      throw new ForbiddenException('Only users can redeem perks');
    }
    const perk = await this.prisma.perk.findUnique({
      where: { id: perkId },
      include: { venue: true },
    });
    if (!perk || perk.venue.bannedAt) {
      throw new NotFoundException('Perk not found');
    }
    const balance = await this.prisma.userVenuePoints.findUnique({
      where: {
        userId_venueId: { userId: user.id, venueId: perk.venueId },
      },
    });
    const points = balance?.points ?? 0;
    if (points < perk.pointsRequired) {
      throw new BadRequestException(
        `Insufficient points. Required: ${perk.pointsRequired}, you have: ${points}`,
      );
    }
    const promoCode = this.generatePromoCode(perk.promoCodePrefix);

    await this.prisma.$transaction([
      this.prisma.redemption.create({
        data: {
          userId: user.id,
          perkId: perk.id,
          promoCode,
          pointsSpent: perk.pointsRequired,
          status: RedemptionStatus.ISSUED,
        },
      }),
      this.prisma.userVenuePoints.update({
        where: {
          userId_venueId: { userId: user.id, venueId: perk.venueId },
        },
        data: { points: { decrement: perk.pointsRequired } },
      }),
    ]);

    return this.prisma.redemption.findFirst({
      where: { userId: user.id, perkId: perk.id, promoCode },
      include: {
        perk: { include: { venue: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyRedemptions(user: User) {
    return this.prisma.redemption.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        perk: { include: { venue: { select: { id: true, name: true } } } },
      },
    });
  }

  async findByVenue(venueId: string, user: User) {
    await this.venuesService.findOneForOwner(user, venueId);
    return this.prisma.redemption.findMany({
      where: { perk: { venueId } },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, email: true } },
        perk: { select: { id: true, title: true, pointsRequired: true } },
      },
    });
  }

  /** Owner: list redemptions across all venues owned by the current owner. */
  async findForOwner(user: User) {
    if (user.role !== ('OWNER' as Role)) {
      throw new ForbiddenException('Only owners can list redemptions');
    }
    return this.prisma.redemption.findMany({
      where: { perk: { venue: { owner: { userId: user.id } } } },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, email: true } },
        perk: { include: { venue: { select: { id: true, name: true } } } },
      },
    });
  }

  async markAsUsed(redemptionId: string, user: User) {
    const redemption = await this.prisma.redemption.findUnique({
      where: { id: redemptionId },
      include: { perk: { include: { venue: { include: { owner: true } } } } },
    });
    if (!redemption) {
      throw new NotFoundException('Redemption not found');
    }
    if (redemption.perk.venue.owner.userId !== user.id) {
      throw new ForbiddenException('You do not own this venue');
    }
    if (redemption.status === RedemptionStatus.USED) {
      throw new BadRequestException('Redemption is already marked as used');
    }
    const usedAt = new Date();
    await this.prisma.redemption.update({
      where: { id: redemptionId },
      data: { status: RedemptionStatus.USED, usedAt },
    });
    return this.prisma.redemption.findUnique({
      where: { id: redemptionId },
      include: {
        user: { select: { id: true, username: true, email: true } },
        perk: { include: { venue: { select: { id: true, name: true } } } },
      },
    });
  }
}
