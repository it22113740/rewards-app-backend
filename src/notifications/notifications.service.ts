import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeofenceCheckDto } from './dto/geofence-check.dto.js';
import { TestPushDto } from './dto/test-push.dto.js';

type GeofenceHit = {
  venueId: string;
  venueName: string;
  distanceMeters: number;
  remainingPoints: number | null;
  title: string;
  body: string;
  notified: boolean;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async testPush(userId: string, dto?: TestPushDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });
    const pushToken = user?.pushToken ?? null;
    const isValid = !!pushToken && this.isExpoPushToken(pushToken);
    const title = dto?.title?.trim() || 'Test push from Rewards App';
    const body = dto?.body?.trim() || 'If you see this, push delivery works.';

    let expoResult: { accepted: boolean; errorMessage?: string; raw: unknown } | null = null;
    if (isValid) {
      expoResult = await this.sendExpoPush(pushToken, title, body, { type: 'test_push' });
    }

    return {
      sent: isValid && (expoResult?.accepted ?? false),
      reason: isValid
        ? expoResult?.accepted
          ? null
          : (expoResult?.errorMessage ?? 'Expo push API did not accept the message')
        : 'Missing or invalid Expo push token on user profile',
      title,
      body,
      expo: expoResult?.raw ?? null,
    };
  }

  async geofenceCheck(userId: string, role: Role, dto: GeofenceCheckDto) {
    if (role !== Role.USER) {
      throw new ForbiddenException('Only users can run geofence checks');
    }

    const dedupeHours = this.getDedupeHours();
    const cutoff = new Date(Date.now() - dedupeHours * 60 * 60 * 1000);
    const [venues, balances, user, recentNotifications] = await Promise.all([
      this.prisma.venue.findMany({
        select: {
          id: true,
          name: true,
          lat: true,
          lng: true,
          radiusMeters: true,
          perks: { select: { pointsRequired: true }, orderBy: { pointsRequired: 'asc' }, take: 1 },
        },
      }),
      this.prisma.userVenuePoints.findMany({
        where: { userId },
        select: { venueId: true, points: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { pushToken: true },
      }),
      this.prisma.notification.findMany({
        where: {
          userId,
          type: 'at_venue',
          createdAt: { gte: cutoff },
        },
        select: {
          data: true,
        },
      }),
    ]);

    const pointsByVenue = new Map(balances.map((b) => [b.venueId, b.points]));
    const hits: GeofenceHit[] = [];
    const recentlyNotifiedVenueIds = new Set(
      recentNotifications
        .map((n) => {
          if (!n.data || typeof n.data !== 'object' || !('venueId' in n.data)) return null;
          const venueId = (n.data as { venueId?: unknown }).venueId;
          return typeof venueId === 'string' ? venueId : null;
        })
        .filter((v): v is string => Boolean(v)),
    );

    for (const venue of venues) {
      const distance = this.haversineDistance(dto.lat, dto.lng, venue.lat, venue.lng);
      const radius = venue.radiusMeters || 100;
      if (distance > radius) continue;

      const myPoints = pointsByVenue.get(venue.id) ?? 0;
      const minPerkPoints = venue.perks[0]?.pointsRequired ?? null;
      const remainingPoints = minPerkPoints == null ? null : Math.max(minPerkPoints - myPoints, 0);
      const title = `You're near ${venue.name}`;
      const body = this.buildMessage(minPerkPoints, remainingPoints);

      let notified = false;
      if (!recentlyNotifiedVenueIds.has(venue.id)) {
        await this.prisma.notification.create({
          data: {
            userId,
            type: 'at_venue',
            title,
            body,
            data: { venueId: venue.id, remainingPoints },
          },
        });
        await this.sendExpoPush(user?.pushToken ?? null, title, body, { venueId: venue.id, remainingPoints });
        notified = true;
      }

      hits.push({
        venueId: venue.id,
        venueName: venue.name,
        distanceMeters: Math.round(distance),
        remainingPoints,
        title,
        body,
        notified,
      });
    }

    return { hits };
  }

  private buildMessage(minPerkPoints: number | null, remainingPoints: number | null) {
    if (minPerkPoints == null || remainingPoints == null) {
      return 'Check in and start earning points here.';
    }
    return `Only ${remainingPoints} more points to unlock a perk!`;
  }

  private getDedupeHours() {
    const raw = Number(process.env.GEOFENCE_NOTIFY_DEDUPE_HOURS ?? 4);
    if (!Number.isFinite(raw)) return 4;
    return Math.min(6, Math.max(2, Math.floor(raw)));
  }

  private async sendExpoPush(
    pushToken: string | null,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<{ accepted: boolean; errorMessage?: string; raw: unknown } | null> {
    if (!pushToken || !this.isExpoPushToken(pushToken)) return null;

    const payload = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      channelId: 'default',
    };

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const raw = (await res.json().catch(() => null)) as Record<string, unknown> | null;

      if (raw && Array.isArray((raw as { errors?: unknown }).errors) && (raw as { errors: unknown[] }).errors.length) {
        const first = (raw as { errors: { message?: string }[] }).errors[0];
        return {
          accepted: false,
          errorMessage: first?.message ?? 'Expo push errors array',
          raw,
        };
      }

      const inner = raw && typeof raw === 'object' && 'data' in raw ? (raw as { data: unknown }).data : raw;

      if (!res.ok) {
        return {
          accepted: false,
          errorMessage: `HTTP ${res.status}`,
          raw,
        };
      }

      const status =
        inner && typeof inner === 'object' && inner !== null && 'status' in inner
          ? String((inner as { status?: string }).status)
          : null;
      const errMsg =
        inner && typeof inner === 'object' && inner !== null && 'message' in inner
          ? String((inner as { message?: string }).message)
          : null;

      if (status === 'error') {
        return { accepted: false, errorMessage: errMsg ?? 'Expo returned status error', raw };
      }

      return { accepted: true, raw };
    } catch (e) {
      return {
        accepted: false,
        errorMessage: e instanceof Error ? e.message : 'fetch failed',
        raw: null,
      };
    }
  }

  private isExpoPushToken(value: string) {
    return /^ExponentPushToken\[[A-Za-z0-9-_]+\]$/.test(value) || /^ExpoPushToken\[[A-Za-z0-9-_]+\]$/.test(value);
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const p1 = toRad(lat1);
    const p2 = toRad(lat2);
    const dp = toRad(lat2 - lat1);
    const dl = toRad(lon2 - lon1);

    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
