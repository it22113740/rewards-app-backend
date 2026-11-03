import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, type User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service.js';
import { LoginDto } from '../auth/dto/login.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BanUserDto } from './dto/ban-user.dto.js';
import { StoreListQueryDto, UserListQueryDto } from './dto/list-query.dto.js';
import { OnboardStoreDto } from './dto/onboard-store.dto.js';
import { addMediaCount, emptyMedia, type MediaCounts } from './media-counts.js';

const SALT_ROUNDS = 10;

const storeInclude = {
  owner: {
    include: {
      user: {
        select: { id: true, email: true, bannedAt: true },
      },
    },
  },
} satisfies Prisma.VenueInclude;

type VenueWithOwner = Prisma.VenueGetPayload<{ include: typeof storeInclude }>;

const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  imageUrl: true,
  role: true,
  createdAt: true,
  bannedAt: true,
  banReason: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async login(dto: LoginDto) {
    const result = await this.authService.login(dto);
    if (result.user.role !== Role.SUPERADMIN) {
      throw new ForbiddenException('This desk is only for the Hunt superadmin');
    }
    return result;
  }

  async overview() {
    const [stores, people, banned, media, recent] = await Promise.all([
      this.prisma.venue.count(),
      this.prisma.user.count({ where: { role: { in: [Role.USER, Role.OWNER] } } }),
      this.prisma.user.count({ where: { bannedAt: { not: null } } }),
      this.mediaTotals(),
      this.listStores({ limit: 5, offset: 0, sort: 'newest' }),
    ]);
    return {
      stores,
      people,
      banned,
      media,
      recentStores: recent.items,
    };
  }

  async listStores(query: StoreListQueryDto) {
    const limit = query.limit ?? 25;
    const offset = query.offset ?? 0;
    const where = this.storeWhere(query.q);
    const total = await this.prisma.venue.count({ where });

    if (query.sort === 'rejected') {
      const ids = await this.prisma.venue.findMany({ where, select: { id: true } });
      const media = await this.mediaForVenues(ids.map((venue) => venue.id));
      const ordered = [...ids].sort((a, b) => {
        const left = media.get(a.id) ?? emptyMedia();
        const right = media.get(b.id) ?? emptyMedia();
        const rejectedLeft = left.rejectedPhotos + left.rejectedVideos;
        const rejectedRight = right.rejectedPhotos + right.rejectedVideos;
        return rejectedRight - rejectedLeft;
      });
      const pageIds = ordered.slice(offset, offset + limit).map((venue) => venue.id);
      if (!pageIds.length) return { items: [], total, limit, offset };
      const venues = await this.prisma.venue.findMany({
        where: { id: { in: pageIds } },
        include: storeInclude,
      });
      const byId = new Map(venues.map((venue) => [venue.id, venue]));
      const items = pageIds.flatMap((id) => {
        const venue = byId.get(id);
        return venue ? [this.toStore(venue, media.get(id) ?? emptyMedia())] : [];
      });
      return { items, total, limit, offset };
    }

    const venues = await this.prisma.venue.findMany({
      where,
      include: storeInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    const media = await this.mediaForVenues(venues.map((venue) => venue.id));
    return {
      items: venues.map((venue) => this.toStore(venue, media.get(venue.id) ?? emptyMedia())),
      total,
      limit,
      offset,
    };
  }

  async onboardStore(dto: OnboardStoreDto) {
    const email = dto.ownerEmail.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      include: { ownerProfile: true },
    });
    if (existing && existing.role !== Role.OWNER) {
      throw new ConflictException('That email is already used by a guest or admin account');
    }

    const venueData = {
      name: dto.name.trim(),
      address: dto.address.trim(),
      lat: dto.lat,
      lng: dto.lng,
      radiusMeters: dto.radiusMeters ?? 100,
      pointsPerPhoto: dto.pointsPerPhoto ?? 10,
      pointsPerVideo: dto.pointsPerVideo ?? 20,
      category: dto.category?.trim() || null,
      description: dto.description?.trim() || null,
    };

    try {
      if (existing) {
        const profile =
          existing.ownerProfile ??
          (await this.prisma.ownerProfile.create({
            data: {
              userId: existing.id,
              gmail: email,
              address: dto.address.trim(),
              onboardingStep: 1,
            },
          }));
        const venue = await this.prisma.venue.create({
          data: { ...venueData, ownerId: profile.id },
          include: storeInclude,
        });
        return {
          store: this.toStore(venue, emptyMedia()),
          ownerCreated: false,
          message:
            'Store onboarded under the existing owner. Their password was left unchanged.',
        };
      }

      const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
      const venue = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            role: Role.OWNER,
            username: null,
          },
        });
        const profile = await tx.ownerProfile.create({
          data: {
            userId: user.id,
            gmail: email,
            address: dto.address.trim(),
            onboardingStep: 1,
          },
        });
        return tx.venue.create({
          data: { ...venueData, ownerId: profile.id },
          include: storeInclude,
        });
      });
      return {
        store: this.toStore(venue, emptyMedia()),
        ownerCreated: true,
        message:
          'Store onboarded. The owner can sign in to the Hunt app with this email and password.',
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('An account with this email already exists');
      }
      throw err;
    }
  }

  async listUsers(query: UserListQueryDto) {
    const limit = query.limit ?? 25;
    const offset = query.offset ?? 0;
    const q = query.q?.trim();
    const where: Prisma.UserWhereInput = {
      role: { in: [Role.USER, Role.OWNER] },
      ...(query.status === 'banned' ? { bannedAt: { not: null } } : {}),
      ...(query.status === 'active' ? { bannedAt: null } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { username: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: publicUserSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);
    return { items, total, limit, offset };
  }

  async banUser(actor: User, userId: string, dto: BanUserDto) {
    if (actor.id === userId) {
      throw new ForbiddenException('You can’t ban your own account');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException('A superadmin can’t be banned from this desk');
    }
    if (user.bannedAt) throw new BadRequestException('This person is already banned');
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        bannedAt: new Date(),
        banReason: dto.reason.trim(),
        pushToken: null,
      },
      select: publicUserSelect,
    });
  }

  async unbanUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException('A superadmin can’t be changed from this desk');
    }
    if (!user.bannedAt) throw new BadRequestException('This person is not banned');
    return this.prisma.user.update({
      where: { id: userId },
      data: { bannedAt: null, banReason: null },
      select: publicUserSelect,
    });
  }

  private storeWhere(q?: string): Prisma.VenueWhereInput {
    const term = q?.trim();
    if (!term) return {};
    return {
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { address: { contains: term, mode: 'insensitive' } },
        { owner: { user: { email: { contains: term, mode: 'insensitive' } } } },
      ],
    };
  }

  private async mediaTotals(): Promise<MediaCounts> {
    const bucket = emptyMedia();
    const rows = await this.prisma.submission.groupBy({
      by: ['type', 'status'],
      _count: { _all: true },
    });
    for (const row of rows) {
      addMediaCount(bucket, row.type, row.status, row._count._all);
    }
    return bucket;
  }

  private async mediaForVenues(venueIds: string[]) {
    const map = new Map<string, MediaCounts>();
    for (const id of venueIds) map.set(id, emptyMedia());
    if (!venueIds.length) return map;
    const rows = await this.prisma.submission.groupBy({
      by: ['venueId', 'type', 'status'],
      where: { venueId: { in: venueIds } },
      _count: { _all: true },
    });
    for (const row of rows) {
      const bucket = map.get(row.venueId);
      if (!bucket) continue;
      addMediaCount(bucket, row.type, row.status, row._count._all);
    }
    return map;
  }

  private toStore(venue: VenueWithOwner, media: MediaCounts) {
    return {
      id: venue.id,
      name: venue.name,
      address: venue.address,
      category: venue.category,
      description: venue.description,
      lat: venue.lat,
      lng: venue.lng,
      radiusMeters: venue.radiusMeters,
      pointsPerPhoto: venue.pointsPerPhoto,
      pointsPerVideo: venue.pointsPerVideo,
      imageUrl: venue.imageUrl,
      createdAt: venue.createdAt,
      owner: venue.owner.user,
      media,
    };
  }
}
