import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CertificatesController } from './controllers/certificates.controller';
import { CertificatesService } from './services/certificates.service';
import { CertificateSchema } from './models/certificate.model';
import { CourseSchema } from '../courses/models/course.model';
import { UserSchema } from '../auth/models/user.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Certificate', schema: CertificateSchema },
      { name: 'Course',      schema: CourseSchema },
      { name: 'User',        schema: UserSchema },
    ]),
  ],
  controllers: [CertificatesController],
  providers:   [CertificatesService],
  exports:     [CertificatesService],
})
export class CertificatesModule {}
