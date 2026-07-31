import {
  buildCertificateSnapshotHydrationUpdate,
  DEFAULT_CERTIFICATE_BACKFILL_BATCH_SIZE,
  formatCertificateBackfillStats,
  parseCertificateBackfillArgs,
} from './backfill-missing-certificates.utils';

describe('certificate backfill CLI', () => {
  describe('parseCertificateBackfillArgs', () => {
    it('defaults to dry-run mode', () => {
      expect(parseCertificateBackfillArgs([])).toEqual({
        execute: false,
        batchSize: DEFAULT_CERTIFICATE_BACKFILL_BATCH_SIZE,
        showHelp: false,
      });
    });

    it('only enables writes with the explicit execute flag', () => {
      expect(parseCertificateBackfillArgs(['--execute', '--batch-size', '250'])).toEqual({
        execute: true,
        batchSize: 250,
        showHelp: false,
      });
    });

    it('accepts an inline batch size and help aliases', () => {
      expect(parseCertificateBackfillArgs(['--batch-size=25', '-h'])).toEqual({
        execute: false,
        batchSize: 25,
        showHelp: true,
      });
    });

    it.each([
      ['--batch-size', '0'],
      ['--batch-size=-1'],
      ['--batch-size=1.5'],
      ['--batch-size=10001'],
      ['--batch-size'],
      ['--unknown'],
      ['--execute', '--dry-run'],
    ])('rejects invalid or ambiguous arguments: %s', (...args) => {
      expect(() => parseCertificateBackfillArgs(args)).toThrow();
    });
  });

  describe('formatCertificateBackfillStats', () => {
    it('formats every counter for an auditable completion log', () => {
      expect(
        formatCertificateBackfillStats({
          mode: 'dry-run',
          completedEnrollmentsScanned: 12,
          certificatesAlreadyPresent: 7,
          certificatesMissing: 5,
          certificatesIssued: 0,
          issueFailed: 0,
          legacyCertificatesMissingSnapshot: 3,
          legacyCertificatesHydrated: 0,
          hydrateFailed: 0,
        })
      ).toBe(
        'mode=dry-run completedEnrollmentsScanned=12 certificatesAlreadyPresent=7 ' +
          'certificatesMissing=5 certificatesIssued=0 issueFailed=0 ' +
          'legacyCertificatesMissingSnapshot=3 legacyCertificatesHydrated=0 hydrateFailed=0'
      );
    });
  });

  describe('buildCertificateSnapshotHydrationUpdate', () => {
    it('only targets snapshot fields and never changes legacy identity or issuance fields', () => {
      const update = buildCertificateSnapshotHydrationUpdate({
        recipientName: 'Ada Lovelace',
        courseTitle: 'Concurrent JavaScript',
        courseSlug: 'concurrent-javascript',
        courseLevel: 'ADVANCED',
        courseLanguage: 'javascript',
        courseDescription: 'Build reliable asynchronous JavaScript systems.',
        courseTags: ['event-loop', 'promises'],
        courseCategory: 'Concurrency',
        courseEstimatedDuration: 480,
        courseTotalLessons: 12,
        completedAt: new Date('2026-07-01T00:00:00.000Z'),
        templateVersion: 'forest-v1',
      });
      const serialized = JSON.stringify(update);

      expect(serialized).toContain('recipientName');
      expect(serialized).toContain('completedAt');
      expect(serialized).not.toContain('certificateCode');
      expect(serialized).not.toContain('issuedAt');
    });
  });
});
