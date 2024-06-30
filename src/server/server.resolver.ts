import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { Request } from 'express';
import { GraphqlAuthGuard } from 'src/auth/auth.guard';
import { Server } from './types';
import { ServerService } from './server.service';
import { v4 as uuid } from 'uuid';
import * as GraphQlUpload from 'graphql-upload/GraphQLUpload.js';
import { join } from 'path';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { CreateServerDto } from './dto';
import * as GraphQLUpload from 'graphql-upload/GraphQLUpload.js';
@UseGuards(GraphqlAuthGuard)
@Resolver()
export class ServerResolver {
  constructor(private readonly serverService: ServerService) {}

  @Query(() => [Server])
  async getServers(@Context() ctx: { req: Request }) {
    const { email } = ctx.req?.profile;
    if (!email) {
      return new ApolloError('Profile not found', 'PROFILE_NOT_FOUND');
    }
    return this.serverService.getServersByProfileEmailOfMember(email);
  }

  @Mutation(() => Server)
  async createServer(
    @Args('input') input: CreateServerDto,
    @Args('file', { type: () => GraphQlUpload, nullable: true })
    file: GraphQlUpload,
  ) {
    if (!file) throw new ApolloError('Image is required', 'IMAGE_REQUIRED');
    const imageUrl = await this.storeImageAndGetUrl(file);
    return this.serverService.createServer(input, imageUrl);
  }

  @Query(() => Server)
  async getServer(
    @Context() ctx: { req: Request },
    @Args('id', { nullable: true }) id: number,
  ) {
    const { email } = ctx?.req?.profile;
    if (!email) {
      return new ApolloError('Profile not found', 'PROFILE_NOT_FOUND');
    }
    return this.serverService.getServer(id, email);
  }

  async storeImageAndGetUrl(file: GraphQLUpload) {
    const { createReadStream, filename } = await file;
    const uniqueFilename = `${uuid()}_${filename}`;
    const imagePath = join(process.cwd(), 'public', 'images', uniqueFilename);
    const imageUrl = `${process.env.APP_URL}/images/${uniqueFilename}`;

    if (!existsSync(join(process.cwd(), 'public', 'images'))) {
      mkdirSync(join(process.cwd(), 'public', 'images'), { recursive: true });
    }

    const readStream = createReadStream();
    readStream.pipe(createWriteStream(imagePath));
    return imageUrl;
  }
}
