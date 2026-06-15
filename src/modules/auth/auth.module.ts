import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { User, UserSchema } from './schemas/user.schema';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  // Export MongooseModule để các module khác có thể @InjectModel(User.name) / @InjectModel(RefreshToken.name)
  // khi tới đợt migration tương ứng (admin / users / ai / analytics).
  exports: [AuthService, MongooseModule],
})
export class AuthModule {}
