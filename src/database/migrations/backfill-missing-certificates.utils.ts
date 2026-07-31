export const DEFAULT_CERTIFICATE_BACKFILL_BATCH_SIZE = 100;
const MAX_CERTIFICATE_BACKFILL_BATCH_SIZE = 10_000;

export interface CertificateBackfillOptions {
  execute: boolean;
  batchSize: number;
  showHelp: boolean;
}

export interface CertificateBackfillStats {
  mode: 'dry-run' | 'execute';
  completedEnrollmentsScanned: number;
  certificatesAlreadyPresent: number;
  certificatesMissing: number;
  certificatesIssued: number;
  issueFailed: number;
  legacyCertificatesMissingSnapshot: number;
  legacyCertificatesHydrated: number;
  hydrateFailed: number;
}

export interface CertificateSnapshot {
  recipientName: string;
  courseTitle: string;
  courseSlug: string;
  courseLevel: string;
  courseLanguage: string;
  courseDescription: string;
  courseTags: string[];
  courseCategory: string;
  courseEstimatedDuration: number;
  courseTotalLessons: number;
  completedAt: Date;
  templateVersion: string;
}

function parseBatchSize(rawValue: string | undefined): number {
  if (!rawValue || !/^\d+$/.test(rawValue)) {
    throw new Error('--batch-size must be a positive integer.');
  }

  const batchSize = Number(rawValue);
  if (
    !Number.isSafeInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > MAX_CERTIFICATE_BACKFILL_BATCH_SIZE
  ) {
    throw new Error(`--batch-size must be between 1 and ${MAX_CERTIFICATE_BACKFILL_BATCH_SIZE}.`);
  }

  return batchSize;
}

export function parseCertificateBackfillArgs(args: string[]): CertificateBackfillOptions {
  let execute = false;
  let explicitDryRun = false;
  let batchSize = DEFAULT_CERTIFICATE_BACKFILL_BATCH_SIZE;
  let showHelp = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--execute') {
      execute = true;
      continue;
    }

    if (argument === '--dry-run') {
      explicitDryRun = true;
      continue;
    }

    if (argument === '--help' || argument === '-h') {
      showHelp = true;
      continue;
    }

    if (argument === '--batch-size') {
      batchSize = parseBatchSize(args[index + 1]);
      index += 1;
      continue;
    }

    if (argument.startsWith('--batch-size=')) {
      batchSize = parseBatchSize(argument.slice('--batch-size='.length));
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (execute && explicitDryRun) {
    throw new Error('--execute and --dry-run cannot be used together.');
  }

  return { execute, batchSize, showHelp };
}

export function formatCertificateBackfillStats(stats: CertificateBackfillStats): string {
  return [
    `mode=${stats.mode}`,
    `completedEnrollmentsScanned=${stats.completedEnrollmentsScanned}`,
    `certificatesAlreadyPresent=${stats.certificatesAlreadyPresent}`,
    `certificatesMissing=${stats.certificatesMissing}`,
    `certificatesIssued=${stats.certificatesIssued}`,
    `issueFailed=${stats.issueFailed}`,
    `legacyCertificatesMissingSnapshot=${stats.legacyCertificatesMissingSnapshot}`,
    `legacyCertificatesHydrated=${stats.legacyCertificatesHydrated}`,
    `hydrateFailed=${stats.hydrateFailed}`,
  ].join(' ');
}

function missingStringExpression(field: keyof CertificateSnapshot) {
  return {
    $or: [{ $in: [{ $type: `$${field}` }, ['missing', 'null']] }, { $eq: [`$${field}`, ''] }],
  };
}

/**
 * Builds an atomic aggregation update that fills missing snapshot values while
 * preserving every value already stored on the certificate. In particular,
 * certificateCode and issuedAt are intentionally absent from this update.
 */
export function buildCertificateSnapshotHydrationUpdate(snapshot: CertificateSnapshot) {
  const stringFields: Array<
    Exclude<
      keyof CertificateSnapshot,
      | 'completedAt'
      | 'courseTags'
      | 'courseEstimatedDuration'
      | 'courseTotalLessons'
    >
  > = [
    'recipientName',
    'courseTitle',
    'courseSlug',
    'courseLevel',
    'courseLanguage',
    'courseDescription',
    'courseCategory',
    'templateVersion',
  ];
  const set: Record<string, unknown> = {};

  for (const field of stringFields) {
    set[field] = {
      $cond: [missingStringExpression(field), { $literal: snapshot[field] }, `$${field}`],
    };
  }

  set.completedAt = {
    $cond: [
      { $in: [{ $type: '$completedAt' }, ['missing', 'null']] },
      { $literal: snapshot.completedAt },
      '$completedAt',
    ],
  };
  set.courseTags = {
    $cond: [
      { $in: [{ $type: '$courseTags' }, ['missing', 'null']] },
      { $literal: snapshot.courseTags },
      '$courseTags',
    ],
  };
  for (const field of ['courseEstimatedDuration', 'courseTotalLessons'] as const) {
    set[field] = {
      $cond: [
        { $in: [{ $type: `$${field}` }, ['missing', 'null']] },
        { $literal: snapshot[field] },
        `$${field}`,
      ],
    };
  }

  return [{ $set: set }];
}
