import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateVenueDto } from './dto/create-venue.dto.js';
import { UpdateVenueDto } from './dto/update-venue.dto.js';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnerProfileIdForUser(userId: string) {
    const ownerProfile = await this.prisma.ownerProfile.findUnique({
      where: { userId },
    });
    if (!ownerProfile) {
      throw new ForbiddenException('Owner profile not found for this user');
    }
    return ownerProfile.id;
  }

  async createForOwner(user: User, dto: CreateVenueDto) {
    if (user.role !== ('OWNER' as Role)) {
      throw new ForbiddenException('Only owners can create venues');
    }
    const ownerId = await this.getOwnerProfileIdForUser(user.id);
    return this.prisma.venue.create({
      data: {
        ownerId,
        name: dto.name,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        radiusMeters: dto.radiusMeters,
        pointsPerVideo: dto.pointsPerVideo,
        pointsPerPhoto: dto.pointsPerPhoto,
        category: dto.category,
        description: dto.description,
        ...(dto.imageUrl != null && { imageUrl: dto.imageUrl }),
      },
    });
  }

  async findMine(user: User) {
    if (user.role !== ('OWNER' as Role)) {
      throw new ForbiddenException('Only owners can list their venues');
    }
    return this.prisma.venue.findMany({
      where: {
        owner: { userId: user.id },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForOwner(user: User, venueId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      include: { owner: true },
    });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }
    if (venue.owner.userId !== user.id) {
      throw new ForbiddenException('You do not own this venue');
    }
    return venue;
  }

  async updateForOwner(user: User, venueId: string, dto: UpdateVenueDto) {
    await this.findOneForOwner(user, venueId);
    return this.prisma.venue.update({
      where: { id: venueId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.lat !== undefined && { lat: dto.lat }),
        ...(dto.lng !== undefined && { lng: dto.lng }),
        ...(dto.radiusMeters !== undefined && { radiusMeters: dto.radiusMeters }),
        ...(dto.pointsPerVideo !== undefined && { pointsPerVideo: dto.pointsPerVideo }),
        ...(dto.pointsPerPhoto !== undefined && { pointsPerPhoto: dto.pointsPerPhoto }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      },
    });
  }

  async deleteForOwner(user: User, venueId: string) {
    await this.findOneForOwner(user, venueId);
    await this.prisma.venue.delete({ where: { id: venueId } });
    return { deleted: true };
  }

  /** Public: list all venues (shops) for discovery – id, name, description, category, imageUrl, etc. */
  async findAll(limit = 100, offset = 0) {
    const select = {
      id: true,
      name: true,
      description: true,
      category: true,
      imageUrl: true,
      address: true,
      pointsPerPhoto: true,
      pointsPerVideo: true,
      lat: true,
      lng: true,
    } as Prisma.VenueSelect;
    return this.prisma.venue.findMany({
      take: Math.min(limit, 100),
      skip: offset,
      orderBy: { createdAt: 'desc' },
      select,
    });
  }

  async findNearby(lat: number, lng: number, radiusMeters?: number) {
    const radius = radiusMeters ?? 300; // default 300m
    const venues = await this.prisma.venue.findMany();
    const withDistance = venues
      .map((v) => ({
        ...v,
        distance: this.haversineDistance(lat, lng, v.lat, v.lng),
      }))
      .filter((v) => v.distance <= (v.radiusMeters || radius));

    withDistance.sort((a, b) => a.distance - b.distance);
    return withDistance;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

