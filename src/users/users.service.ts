import { ConflictException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ownerProfile: true },
    });
    if (!user) return null;
    return this.sanitize(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ownerProfile: true },
    });
    if (!user) return null;

    if (dto.email !== undefined && dto.email.toLowerCase() !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (existing) {
        throw new ConflictException('An account with this email already exists');
      }
    }

    const userData: { username?: string; email?: string; pushToken?: string; imageUrl?: string } = {};
    if (dto.username !== undefined) userData.username = dto.username;
    if (dto.email !== undefined) userData.email = dto.email.toLowerCase();
    if (dto.pushToken !== undefined) userData.pushToken = dto.pushToken;
    if (dto.imageUrl !== undefined) userData.imageUrl = dto.imageUrl;

    if (Object.keys(userData).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: userData,
      });
    }

    if (user.role === Role.OWNER) {
      const ownerFields =
        dto.gmail !== undefined || dto.address !== undefined || dto.onboardingStep !== undefined;
      if (ownerFields && user.ownerProfile) {
        await this.prisma.ownerProfile.update({
          where: { userId },
          data: {
            ...(dto.gmail !== undefined && { gmail: dto.gmail }),
            ...(dto.address !== undefined && { address: dto.address }),
            ...(dto.onboardingStep !== undefined && { onboardingStep: dto.onboardingStep }),
          },
        });
      } else if (ownerFields) {
        await this.prisma.ownerProfile.create({
          data: {
            userId,
            gmail: dto.gmail ?? user.email,
            address: dto.address ?? '',
            onboardingStep: dto.onboardingStep ?? 0,
          },
        });
      }
    }

    const full = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ownerProfile: true },
    });
    return full ? this.sanitize(full) : null;
  }

  async getMyPoints(userId: string) {
    const rows = await this.prisma.userVenuePoints.findMany({
      where: { userId },
      include: { venue: { select: { id: true, name: true } } },
    });
    const total = rows.reduce((sum, r) => sum + r.points, 0);
    const byVenue = rows.map((r) => ({
      venueId: r.venue.id,
      venueName: r.venue.name,
      points: r.points,
    }));
    return { total, byVenue };
  }

  private sanitize(user: User & { ownerProfile?: unknown }) {
    const { passwordHash: _, ...rest } = user;
    return rest;
  }
}
