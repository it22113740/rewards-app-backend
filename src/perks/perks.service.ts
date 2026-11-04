import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { VenuesService } from '../venues/venues.service.js';
import { CreatePerkDto } from './dto/create-perk.dto.js';
import { UpdatePerkDto } from './dto/update-perk.dto.js';

@Injectable()
export class PerksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venuesService: VenuesService,
  ) {}

  async createForOwner(user: User, dto: CreatePerkDto) {
    if (user.role !== ('OWNER' as Role)) {
      throw new ForbiddenException('Only owners can create perks');
    }
    await this.venuesService.findOneForOwner(user, dto.venueId);
    return this.prisma.perk.create({
      data: {
        venueId: dto.venueId,
        pointsRequired: dto.pointsRequired,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        discountPercent: dto.discountPercent,
        promoCodePrefix: dto.promoCodePrefix,
        imageUrl: dto.imageUrl,
      } as Prisma.PerkUncheckedCreateInput,
    });
  }

  async findByVenue(venueId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
    });
    if (!venue || venue.bannedAt) {
      throw new NotFoundException('Venue not found');
    }
    return this.prisma.perk.findMany({
      where: { venueId },
      orderBy: { pointsRequired: 'asc' },
    });
  }

  /** Owner: list perks across all venues owned by the current owner. */
  async findMine(user: User) {
    if (user.role !== ('OWNER' as Role)) {
      throw new ForbiddenException('Only owners can list their perks');
    }
    return this.prisma.perk.findMany({
      where: { venue: { owner: { userId: user.id } } },
      orderBy: [{ venue: { name: 'asc' } }, { pointsRequired: 'asc' }],
      include: { venue: { select: { id: true, name: true } } },
    });
  }

  private async findOneAndCheckOwnership(perkId: string, user: User) {
    const perk = await this.prisma.perk.findUnique({
      where: { id: perkId },
      include: { venue: { include: { owner: true } } },
    });
    if (!perk) {
      throw new NotFoundException('Perk not found');
    }
    if (perk.venue.owner.userId !== user.id) {
      throw new ForbiddenException('You do not own this perk');
    }
    return perk;
  }

  async updateForOwner(user: User, perkId: string, dto: UpdatePerkDto) {
    await this.findOneAndCheckOwnership(perkId, user);
    return this.prisma.perk.update({
      where: { id: perkId },
      data: {
        ...(dto.pointsRequired !== undefined && { pointsRequired: dto.pointsRequired }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.discountPercent !== undefined && { discountPercent: dto.discountPercent }),
        ...(dto.promoCodePrefix !== undefined && { promoCodePrefix: dto.promoCodePrefix }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      },
    });
  }

  async deleteForOwner(user: User, perkId: string) {
    await this.findOneAndCheckOwnership(perkId, user);
    await this.prisma.perk.delete({ where: { id: perkId } });
    return { deleted: true };
  }
}
