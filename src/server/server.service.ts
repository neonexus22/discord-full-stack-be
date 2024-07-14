import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CreateChannelOnServerDto,
  CreateServerDto,
  UpdateServerDto,
} from './dto';
import { v4 as uuid } from 'uuid';
import { PrismaService } from 'src/prisma.service';
import { ChannelType, Member, MemberRole } from '@prisma/client';

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
      include: {
        members: {
          include: {
            profile: true,
            server: true,
          },
        },
        channels: true,
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

  async updateServerWithNewInviteCode(serverId: number) {
    const server = await this.prismaService.server.findUnique({
      where: {
        id: serverId,
      },
    });
    if (!server) throw new BadRequestException('Server not found');
    const newInviteCode = uuid();
    return this.prismaService.server.update({
      where: {
        id: serverId,
      },
      data: {
        inviteCode: newInviteCode,
      },
    });
  }

  async updateServer(input: UpdateServerDto, imageUrl: string) {
    const server = await this.prismaService.server.findUnique({
      where: {
        id: input.serverId,
      },
    });

    if (!server) throw new BadRequestException('Server not found');
    return this.prismaService.server.update({
      where: {
        id: input.serverId,
      },
      data: {
        name: input.name,
        imageUrl,
      },
    });
  }

  async createChannel(input: CreateChannelOnServerDto, email: string) {
    const profile = await this.prismaService.profile.findUnique({
      where: { email },
    });
    if (!profile) throw new BadRequestException('Profile not found');
    return await this.prismaService.server.update({
      where: {
        id: input.serverId,
        members: {
          some: {
            profileId: profile.id,
            role: {
              in: [MemberRole.ADMIN, MemberRole.MODERATOR],
            },
          },
        },
      },
      data: {
        channels: {
          create: {
            name: input.name,
            profileId: profile.id,
            type: ChannelType[input.type],
          },
        },
      },
    });
  }

  async leaveServer(serverId: number, email: string) {
    const profile = await this.prismaService.profile.findUnique({
      where: {
        email,
      },
    });
    if (!profile) throw new BadRequestException('Profile not found');
    return this.prismaService.server.update({
      where: {
        id: serverId,
      },
      data: {
        members: {
          deleteMany: {
            profileId: profile.id,
          },
        },
      },
    });
  }

  async deleteServer(serverId: number, email: string) {
    const profile = await this.prismaService.profile.findUnique({
      where: {
        email,
      },
    });
    if (!profile) throw new BadRequestException('Profile not found');
    const server = await this.prismaService.server.findUnique({
      where: {
        id: serverId,
        members: {
          some: {
            profileId: profile.id,
            role: {
              in: [MemberRole.ADMIN],
            },
          },
        },
      },
    });
    if (!server) throw new Error('Server not found');
    await this.prismaService.server.delete({
      where: {
        id: serverId,
      },
    });
    return 'Server deleted successfully!';
  }

  async deleteChannelFromServer(channelId: number, email: string) {
    const profile = await this.prismaService.profile.findUnique({
      where: {
        email,
      },
    });
    if (!profile) throw new BadRequestException('Profile not found');
    const channel = await this.prismaService.channel.findUnique({
      where: {
        id: channelId,
        profileId: profile.id,
        NOT: {
          name: 'general',
        },
      },
    });
    if (!channel) throw new BadRequestException('Channel not found');
    await this.prismaService.channel.delete({
      where: {
        id: channelId,
      },
    });
    return 'Channel deleted successfully!';
  }

  async addMemberToServer(inviteCode: string, email: string) {
    const server = await this.prismaService.server.findUnique({
      where: {
        inviteCode,
      },
    });
    if (!server) throw new BadRequestException('Server not found');
    const profile = await this.prismaService.profile.findUnique({
      where: {
        email,
      },
    });
    if (!profile) throw new BadRequestException('Profile not found');

    const member = await this.prismaService.member.findFirst({
      where: {
        profileId: profile.id,
        serverId: server.id,
      },
    });

    if (member) return new Error('Member already exists');

    return this.prismaService.server.update({
      where: {
        inviteCode,
      },
      data: {
        members: {
          create: {
            profileId: profile.id,
          },
        },
      },
    });
  }

  async changeMemberRole(memberId: number, role: MemberRole, email: string) {
    const profile = await this.prismaService.profile.findUnique({
      where: {
        email,
      },
    });
    if (!profile) throw new Error('Profile not found');
    const member = await this.prismaService.member.findUnique({
      where: {
        id: memberId,
      },
    });
    if (!member) throw new Error('Member not found');

    await this.prismaService.member.update({
      where: {
        id: memberId,
        NOT: {
          profileId: member.id,
        },
      },
      data: {
        role: MemberRole[role],
      },
    });

    const server = await this.prismaService.server.findUnique({
      where: {
        id: member.serverId,
      },
      include: {
        members: true,
      },
    });
    if (!server) throw new Error('Server not found');
    return server;
  }

  async deleteMember(memberId: number, email: string) {
    const profile = await this.prismaService.profile.findUnique({
      where: {
        email,
      },
    });
    if (!profile) throw new Error('Profile not found');
    const member = await this.prismaService.member.findUnique({
      where: {
        id: memberId,
      },
    });
    if (!member) throw new Error('Member not found');
    await this.prismaService.member.delete({
      where: {
        id: memberId,
        NOT: {
          profileId: member.id,
        },
      },
    });

    const server = await this.prismaService.server.findUnique({
      where: {
        id: member.serverId,
      },
      include: {
        members: {
          include: {
            profile: true,
          },
        },
      },
    });
    if (!server) throw new Error('Server not found');
    return server;
  }
}
