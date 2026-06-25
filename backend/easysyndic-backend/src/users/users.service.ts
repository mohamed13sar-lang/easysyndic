import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    return {
      name: typeof record.name === 'string' ? record.name : undefined,
      message: typeof record.message === 'string' ? record.message : undefined,
      code: typeof record.code === 'string' ? record.code : undefined,
      meta: record.meta,
      stack: typeof record.stack === 'string' ? record.stack : undefined,
    };
  }

  return {
    message: String(error),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    console.log('[USERS] create user started');
    console.log('[USERS] email:', createUserDto.email);
    console.log('[USERS] phone:', createUserDto.phone);
    console.log('[USERS] role:', createUserDto.role);

    try {
      console.log('[USERS] checking phone');
      let existingPhone: { id: string } | null = null;
      try {
        existingPhone = await this.prisma.user.findUnique({
          where: { phone: createUserDto.phone },
          select: { id: true },
        });
      } catch (error: unknown) {
        const err = normalizeError(error);
        console.error(
          '[USERS] phone check failed',
          err.name,
          err.message,
          err.stack,
        );
        throw error;
      }

      if (existingPhone) {
        throw new ConflictException('Phone already exists');
      }

      if (createUserDto.email) {
        console.log('[USERS] checking email');
        let existingEmail: { id: string } | null = null;
        try {
          existingEmail = await this.prisma.user.findUnique({
            where: { email: createUserDto.email },
            select: { id: true },
          });
        } catch (error: unknown) {
          const err = normalizeError(error);
          console.error(
            '[USERS] email check failed',
            err.name,
            err.message,
            err.stack,
          );
          throw error;
        }

        if (existingEmail) {
          throw new ConflictException('Email already exists');
        }
      }

      let hashedPassword: string | null = null;
      if (createUserDto.password) {
        console.log('[USERS] hashing password');
        try {
          hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        } catch (error: unknown) {
          const err = normalizeError(error);
          console.error(
            '[USERS] bcrypt hash failed',
            err.name,
            err.message,
            err.stack,
          );
          throw error;
        }
      }

      console.log('[USERS] creating user in database');
      try {
        const createdUser = await this.prisma.user.create({
          data: {
            fullName: createUserDto.fullName,
            phone: createUserDto.phone,
            email: createUserDto.email,
            password: hashedPassword,
            role: createUserDto.role,
            isActive: true,
          },
        });
        console.log('[USERS] user created successfully');
        return this.sanitizeUser(createdUser);
      } catch (error: unknown) {
        const err = normalizeError(error);
        console.error(
          '[USERS] prisma create failed',
          err.name,
          err.message,
          err.code,
          err.meta,
          err.stack,
        );
        throw error;
      }
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target
          : [String(error.meta?.target)];

        if (target.includes('phone')) {
          throw new ConflictException('Phone already exists');
        }
        if (target.includes('email')) {
          throw new ConflictException('Email already exists');
        }
        throw new ConflictException('Unique constraint violation');
      }

      const err = normalizeError(error);
      console.error(
        '[USERS] unexpected create error',
        err.name,
        err.message,
        err.code,
        err.meta,
        err.stack,
      );
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.sanitizeUser(user));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return this.sanitizeUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.ensureUserExists(id);
    await this.ensureUniqueFields(updateUserDto.phone, updateUserDto.email, id);

    const hashedPassword = updateUserDto.password
      ? await bcrypt.hash(updateUserDto.password, 10)
      : undefined;

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          fullName: updateUserDto.fullName,
          phone: updateUserDto.phone,
          email: updateUserDto.email,
          password: hashedPassword,
          role: updateUserDto.role,
        },
      });

      return this.sanitizeUser(updatedUser);
    } catch (error: unknown) {
      this.handlePrismaUniqueError(error);
      throw error;
    }
  }

  async updateStatus(id: string, updateUserStatusDto: UpdateUserStatusDto) {
    await this.ensureUserExists(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: updateUserStatusDto.isActive },
    });

    return this.sanitizeUser(user);
  }

  async remove(id: string) {
    await this.ensureUserExists(id);

    const user = await this.prisma.user.delete({
      where: { id },
    });

    return this.sanitizeUser(user);
  }

  private async ensureUserExists(id: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
  }

  private async ensureUniqueFields(
    phone?: string,
    email?: string,
    excludeUserId?: string,
  ) {
    if (phone) {
      const byPhone = await this.prisma.user.findFirst({
        where: {
          phone,
          ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        },
        select: { id: true },
      });

      if (byPhone) {
        throw new ConflictException('Phone already exists');
      }
    }

    if (email) {
      const byEmail = await this.prisma.user.findFirst({
        where: {
          email,
          ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        },
        select: { id: true },
      });

      if (byEmail) {
        throw new ConflictException('Email already exists');
      }
    }
  }

  private handlePrismaUniqueError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta?.target.join(', ')
        : String(error.meta?.target);
      throw new ConflictException(`Unique constraint failed on: ${target}`);
    }
  }

  private sanitizeUser<T extends { password: string | null }>(
    user: T,
  ): Omit<T, 'password'> {
    return this.omitProperty(user, 'password');
  }

  private omitProperty<T extends object, K extends keyof T>(
    object: T,
    key: K,
  ): Omit<T, K> {
    const clone = { ...object };
    delete clone[key];
    return clone;
  }
}
