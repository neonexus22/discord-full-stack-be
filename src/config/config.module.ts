import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes ConfigService available globally
      envFilePath: '.env', // specify the path to your .env file
    }),
  ],
})
export class AppConfigModule {}
