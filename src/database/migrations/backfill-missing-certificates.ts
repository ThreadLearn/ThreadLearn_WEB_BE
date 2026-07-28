/* eslint-disable no-console */
import mongoose from 'mongoose';
import { User } from '../../modules/auth/models/user.model';
import { Certificate } from '../../modules/certificates/models/certificate.model';
import { CertificatesService } from '../../modules/certificates/services/certificates.service';
import { Course } from '../../modules/courses/models/course.model';
import { Enrollment } from '../../modules/enrollments/models/enrollment.model';
import {
  buildCertificateSnapshotHydrationUpdate,
  CertificateBackfillOptions,
  CertificateBackfillStats,
  CertificateSnapshot,
  DEFAULT_CERTIFICATE_BACKFILL_BATCH_SIZE,
  formatCertificateBackfillStats,
  parseCertificateBackfillArgs,
} from './backfill-missing-certificates.utils';

const CURRENT_CERTIFICATE_TEMPLATE_VERSION = 'forest-v1';
const LEGACY_CERTIFICATE_SNAPSHOT_FILTER = {
  $or: [
    { recipientName: { $exists: false } },
    { recipientName: null },
    { recipientName: '' },
    { courseTitle: { $exists: false } },
    { courseTitle: null },
    { courseTitle: '' },
    { courseSlug: { $exists: false } },
    { courseSlug: null },
    { courseSlug: '' },
    { courseLevel: { $exists: false } },
    { courseLevel: null },
    { courseLevel: '' },
    { courseLanguage: { $exists: false } },
    { courseLanguage: null },
    { courseLanguage: '' },
    { courseDescription: { $exists: false } },
    { courseDescription: null },
    { courseDescription: '' },
    { courseTags: { $exists: false } },
    { courseCategory: { $exists: false } },
    { courseEstimatedDuration: { $exists: false } },
    { courseTotalLessons: { $exists: false } },
    { completedAt: { $exists: false } },
    { completedAt: null },
    { templateVersion: { $exists: false } },
    { templateVersion: null },
    { templateVersion: '' },
  ],
};

function requiredText(value: unknown, field: string): string {
  const text = String(value ?? '').trim();
  if (!text) {
    throw new Error(`Cannot hydrate certificate without ${field}.`);
  }
  return text;
}

async function hydrateLegacyCertificateSnapshots(
  options: Pick<CertificateBackfillOptions, 'execute' | 'batchSize'>,
  stats: CertificateBackfillStats
): Promise<void> {
  const cursor = Certificate.find(LEGACY_CERTIFICATE_SNAPSHOT_FILTER)
    .select({
      _id: 1,
      userId: 1,
      courseId: 1,
      certificateCode: 1,
      issuedAt: 1,
    })
    .sort({ _id: 1 })
    .lean()
    .cursor({ batchSize: options.batchSize });

  try {
    for await (const certificate of cursor) {
      stats.legacyCertificatesMissingSnapshot += 1;

      if (options.execute) {
        try {
          const [user, course, enrollment] = await Promise.all([
            User.findById(certificate.userId).select('firstName lastName').lean(),
            Course.findById(certificate.courseId)
              .select(
                'title slug level language shortDescription description tags category estimatedDuration totalLessons',
              )
              .lean(),
            Enrollment.findOne({
              userId: certificate.userId,
              courseId: certificate.courseId,
              completed: true,
            })
              .select('completedAt updatedAt')
              .lean(),
          ]);

          if (!user || !course || !enrollment) {
            throw new Error('Certificate source user, course, or completed enrollment is missing.');
          }

          const snapshot: CertificateSnapshot = {
            recipientName: requiredText(
              [user.firstName, user.lastName].filter(Boolean).join(' '),
              'recipient name'
            ),
            courseTitle: requiredText(course.title, 'course title'),
            courseSlug: requiredText(course.slug, 'course slug'),
            courseLevel: requiredText(course.level, 'course level'),
            courseLanguage: requiredText(course.language, 'course language'),
            courseDescription: requiredText(
              course.shortDescription || course.description,
              'course description',
            ),
            courseTags: Array.isArray(course.tags)
              ? course.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8)
              : [],
            courseCategory: String(course.category || '').trim(),
            courseEstimatedDuration:
              typeof course.estimatedDuration === 'number' ? course.estimatedDuration : 0,
            courseTotalLessons:
              typeof course.totalLessons === 'number' ? course.totalLessons : 0,
            completedAt: enrollment.completedAt ?? enrollment.updatedAt ?? certificate.issuedAt,
            templateVersion: CURRENT_CERTIFICATE_TEMPLATE_VERSION,
          };

          if (!snapshot.completedAt) {
            throw new Error('Cannot hydrate certificate without a completion timestamp.');
          }

          const updateResult = await Certificate.collection.updateOne(
            { _id: certificate._id },
            buildCertificateSnapshotHydrationUpdate(snapshot)
          );
          if (updateResult.matchedCount !== 1) {
            throw new Error('Legacy certificate disappeared before it could be hydrated.');
          }
          stats.legacyCertificatesHydrated += 1;
        } catch (error) {
          stats.hydrateFailed += 1;
          console.error(
            `[certificate-backfill] Failed legacy certificate=${String(certificate._id)} ` +
              `code=${String(certificate.certificateCode)}`,
            error
          );
        }
      }

      if (stats.legacyCertificatesMissingSnapshot % options.batchSize === 0) {
        console.log(
          `[certificate-backfill] Legacy progress ${formatCertificateBackfillStats(stats)}`
        );
      }
    }
  } finally {
    await cursor.close().catch((error) => {
      console.warn('[certificate-backfill] Could not close certificate cursor cleanly.', error);
    });
  }
}

export async function backfillMissingCertificates(
  options: Pick<CertificateBackfillOptions, 'execute' | 'batchSize'>
): Promise<CertificateBackfillStats> {
  const stats: CertificateBackfillStats = {
    mode: options.execute ? 'execute' : 'dry-run',
    completedEnrollmentsScanned: 0,
    certificatesAlreadyPresent: 0,
    certificatesMissing: 0,
    certificatesIssued: 0,
    issueFailed: 0,
    legacyCertificatesMissingSnapshot: 0,
    legacyCertificatesHydrated: 0,
    hydrateFailed: 0,
  };

  const cursor = Enrollment.find({ completed: true })
    .select({ _id: 1, userId: 1, courseId: 1 })
    .sort({ _id: 1 })
    .lean()
    .cursor({ batchSize: options.batchSize });

  try {
    for await (const enrollment of cursor) {
      stats.completedEnrollmentsScanned += 1;

      const certificateExists = await Certificate.exists({
        userId: enrollment.userId,
        courseId: enrollment.courseId,
      });
      if (certificateExists) {
        stats.certificatesAlreadyPresent += 1;
      } else {
        stats.certificatesMissing += 1;

        if (options.execute) {
          try {
            await CertificatesService.issueCertificate(
              String(enrollment.userId),
              String(enrollment.courseId)
            );
            stats.certificatesIssued += 1;
          } catch (error) {
            stats.issueFailed += 1;
            console.error(
              `[certificate-backfill] Failed enrollment=${String(enrollment._id)} ` +
                `user=${String(enrollment.userId)} course=${String(enrollment.courseId)}`,
              error
            );
          }
        }
      }

      if (stats.completedEnrollmentsScanned % options.batchSize === 0) {
        console.log(
          `[certificate-backfill] Enrollment progress ${formatCertificateBackfillStats(stats)}`
        );
      }
    }
  } finally {
    await cursor.close().catch((error) => {
      console.warn('[certificate-backfill] Could not close enrollment cursor cleanly.', error);
    });
  }

  await hydrateLegacyCertificateSnapshots(options, stats);
  return stats;
}

function printUsage() {
  console.log(`Usage:
  npx ts-node src/database/migrations/backfill-missing-certificates.ts [options]

Options:
  --execute               Issue missing certificates. Without this flag, no certificates are written.
  --dry-run               Explicitly select the default read-only mode.
  --batch-size <number>   MongoDB cursor batch size (default: ${DEFAULT_CERTIFICATE_BACKFILL_BATCH_SIZE}).
  --help, -h              Show this help text.
`);
}

export async function runCertificateBackfillCli(
  args: string[] = process.argv.slice(2)
): Promise<CertificateBackfillStats | undefined> {
  const options = parseCertificateBackfillArgs(args);
  if (options.showHelp) {
    printUsage();
    return undefined;
  }

  // Prevent model initialization from creating collections or indexes in dry-run mode.
  // Certificate writes remain explicit and are only reached when --execute is present.
  mongoose.set('autoCreate', false);
  mongoose.set('autoIndex', false);

  console.log(
    `[certificate-backfill] Starting mode=${options.execute ? 'execute' : 'dry-run'} ` +
      `batchSize=${options.batchSize}`
  );

  try {
    const { connectToDatabase } = await import('../../configs/db');
    await connectToDatabase();
    const stats = await backfillMissingCertificates(options);
    console.log(`[certificate-backfill] Complete ${formatCertificateBackfillStats(stats)}`);

    if (stats.issueFailed > 0 || stats.hydrateFailed > 0) {
      process.exitCode = 1;
    }

    return stats;
  } finally {
    try {
      await mongoose.disconnect();
      console.log('[certificate-backfill] MongoDB disconnected.');
    } catch (error) {
      process.exitCode = 1;
      console.error('[certificate-backfill] MongoDB disconnect failed.', error);
    }
  }
}

if (require.main === module) {
  runCertificateBackfillCli().catch((error) => {
    process.exitCode = 1;
    console.error('[certificate-backfill] Fatal error.', error);
  });
}
