import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateServerDto } from './dto';
import { v4 as uuid } from 'uuid';
import { PrismaService } from 'src/prisma.service';
import { MemberRole } from '@prisma/client';

@Injectable()
export class ServerService {
  constructor(private readonly prismaService: PrismaService) {}
  async createServer(input: CreateServerDto, imageUrl: string) {
    const profile = await this.prismaService.profile.findUnique({
      where: {
        id: input.profileId,
      },
    });
    if (!profile) throw new BadRequestException('Profile not found');
    return this.prismaService.server.create({
      data: {
        name: input.name,
        profileId: input.profileId,
        imageUrl,
        inviteCode: uuid(),
        channels: {
          create: [
            {
              name: 'general',
              profileId: profile.id,
            },
          ],
        },
        members: {
          create: [
            {
              role: MemberRole.ADMIN,
              profileId: profile.id,
            },
          ],
        },
      },
      include: {
        members: true,
      },
    });
  }

  async getServer(id: number, email: string) {
    const profile = await this.prismaService.profile.findUnique({
      where: { email },
    });
    if (!profile) throw new BadRequestException('Profile not found');
    const server = this.prismaService.server.findUnique({
      where: {
        id,
        members: {
          some: {
            profileId: profile.id,
          },
        },
      },
    });
    if (!server) throw new BadRequestException('Server not found');
    return server;
  }

  async getServersByProfileEmailOfMember(email: string) {
    return this.prismaService.server.findMany({
      where: {
        members: {
          some: {
            profile: {
              email,
            },
          },
        },
      },
    });
  }
}
