import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType()
export class CreateServerDto {
  @IsString()
  @Field()
  name: string;

  @IsString()
  @Field()
  profileId: number;
}
