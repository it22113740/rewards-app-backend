import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { VenuesService } from '../venues/venues.service.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venuesService: VenuesService,
  ) {}

  async createForOwner(user: User, dto: CreatePromotionDto) {
    if (user.role !== ('OWNER' as Role)) {
      throw new ForbiddenException('Only owners can create promotions');
    }
    await this.venuesService.findOneForOwner(user, dto.venueId);
    return this.prisma.promotion.create({
      data: {
        venueId: dto.venueId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        imageUrl: dto.imageUrl || null,
      },
      include: { venue: { select: { id: true, name: true } } },
    });
  }

  async findPublic() {
    return this.prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' },
      include: { venue: { select: { id: true, name: true, category: true } } },
    });
  }

  async findByVenue(venueId: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) throw new NotFoundException('Venue not found');
    return this.prisma.promotion.findMany({
      where: { venueId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMine(user: User) {
    if (user.role !== ('OWNER' as Role)) {
      throw new ForbiddenException('Only owners can list their promotions');
    }
    return this.prisma.promotion.findMany({
      where: { venue: { owner: { userId: user.id } } },
      orderBy: { createdAt: 'desc' },
      include: { venue: { select: { id: true, name: true } } },
    });
  }

  private async findOwned(id: string, user: User) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
      include: { venue: { include: { owner: true } } },
    });
    if (!promotion) throw new NotFoundException('Promotion not found');
    if (promotion.venue.owner.userId !== user.id) {
      throw new ForbiddenException('You do not own this promotion');
    }
    return promotion;
  }

  async updateForOwner(user: User, id: string, dto: UpdatePromotionDto) {
    await this.findOwned(id, user);
    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description.trim() || null }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl || null }),
      },
      include: { venue: { select: { id: true, name: true } } },
    });
  }

  async deleteForOwner(user: User, id: string) {
    await this.findOwned(id, user);
    await this.prisma.promotion.delete({ where: { id } });
    return { ok: true };
  }
}
