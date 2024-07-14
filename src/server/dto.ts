import { Field, InputType } from '@nestjs/graphql';
import { ChannelType } from '@prisma/client';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class CreateServerDto {
  @IsString()
  @Field()
  name: string;

  @IsString()
  @Field()
  profileId: number;
}

@InputType()
export class UpdateServerDto {
  @IsString()
  @Field()
  name: string;

  @IsInt()
  @Field()
  serverId: number;
}

@InputType()
export class CreateChannelOnServerDto {
  @IsNotEmpty()
  @IsString()
  @Field()
  name: string;

  @IsInt()
  @Field()
  serverId: number;

  @IsString()
  @Field()
  type: ChannelType;
}
