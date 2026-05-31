import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User, UserSchema } from './models/user.model';
import { RefreshToken, RefreshTokenSchema } from './models/refresh-token.model';
import { UserStats, UserStatsSchema } from '../gamification/models/user-stats.model';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (c: ConfigService) => ({
        secret:      c.get<string>('jwt.accessSecret'),
        signOptions: { expiresIn: c.get<string>('jwt.accessExpiresIn') },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.modelName,         schema: UserSchema },
      { name: RefreshToken.modelName, schema: RefreshTokenSchema },
      { name: UserStats.modelName,    schema: UserStatsSchema },
    ]),
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy],
  exports:     [AuthService, JwtModule],
})
export class AuthModule {}
