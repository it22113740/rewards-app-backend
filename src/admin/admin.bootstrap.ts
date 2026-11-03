import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';

const SALT_ROUNDS = 10;

@Injectable()
export class AdminBootstrap implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrap.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>('SUPERADMIN_EMAIL')?.toLowerCase().trim();
    const password = this.config.get<string>('SUPERADMIN_PASSWORD');
    if (!email || !password) return;
    if (password.length < 8) {
      this.logger.warn(
        'SUPERADMIN_PASSWORD must be at least 8 characters. Superadmin was not created.',
      );
      return;
    }

    try {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (existing.role !== Role.SUPERADMIN) {
          this.logger.warn(
            `SUPERADMIN_EMAIL ${email} already belongs to another account. Left it unchanged.`,
          );
        }
        return;
      }
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          role: Role.SUPERADMIN,
          username: 'superadmin',
        },
      });
      this.logger.log(`Superadmin ready for ${email}`);
    } catch (err) {
      this.logger.error(
        'Could not ensure the superadmin account. Apply the latest Prisma migration and restart.',
        err instanceof Error ? err.stack : undefined,
      );
    }
  }
}
