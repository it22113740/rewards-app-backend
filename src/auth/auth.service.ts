import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { User } from '@prisma/client';
import { Role } from '@prisma/client';
import { MailService } from '../mail/mail.service.js';
import { RegisterOwnerDto } from './dto/register-owner.dto.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

const SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  /** PasswordResetOtp delegate (cast for TS when generated client types are stale). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get otp(): any {
    return (this.prisma as any).passwordResetOtp;
  }

  async registerOwner(dto: RegisterOwnerDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.gmail.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.gmail.toLowerCase(),
        username: null,
        passwordHash,
        role: Role.OWNER,
      },
    });
    await this.prisma.ownerProfile.create({
      data: {
        userId: user.id,
        gmail: dto.gmail,
        address: dto.address,
        onboardingStep: 0,
      },
    });
    const token = this.issueToken(user);
    return { user: this.sanitizeUser(user), accessToken: token };
  }

  async registerUser(dto: RegisterUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username,
        passwordHash,
        role: Role.USER,
      },
    });
    const token = this.issueToken(user);
    return { user: this.sanitizeUser(user), accessToken: token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (
      !user ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const token = this.issueToken(user);
    return { user: this.sanitizeUser(user), accessToken: token };
  }

  async getProfile(user: User) {
    return this.sanitizeUser(user);
  }

  /** Forgot password: send OTP to registered email (user or owner). */
  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    // Always return same message to avoid leaking whether email exists
    const message = "If an account exists with this email, you'll receive an OTP shortly.";
    if (!user) {
      return { message };
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await this.otp.deleteMany({ where: { email } });
    await this.otp.create({
      data: { email, otp, expiresAt },
    });
    try {
      await this.mailService.sendMail({
        to: email,
        subject: 'Reset your password – OTP',
        text: `Your one-time password is: ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, ignore this email.`,
        html: `<p>Your one-time password is: <strong>${otp}</strong>.</p><p>It expires in ${OTP_EXPIRY_MINUTES} minutes.</p><p>If you didn't request this, please ignore this email.</p>`,
      });
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${email}:`, err);
      await this.otp.deleteMany({ where: { email } });
      throw new InternalServerErrorException(
        'Failed to send OTP email. Please check SMTP configuration or try again later.',
      );
    }
    return { message };
  }

  /** Reset password using OTP sent to email (user or owner). */
  async resetPasswordWithOtp(dto: ResetPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const record = await this.otp.findFirst({
      where: { email, otp: dto.otp },
      orderBy: { createdAt: 'desc' },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired OTP. Please request a new one.');
    }
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new BadRequestException('Invalid or expired OTP.');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.otp.deleteMany({ where: { email } }),
    ]);
    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }

  /** Change password for the authenticated user (USER or OWNER). */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { message: 'Password updated successfully' };
  }

  async validateUserById(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    return user ?? null;
  }

  private issueToken(user: User): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: User) {
    const { passwordHash: _, ...rest } = user;
    return rest;
  }
}
