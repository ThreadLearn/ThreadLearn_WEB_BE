jest.mock('../../../common/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { Response } from 'express';
import { CertificatesService } from '../services/certificates.service';
import { CertificatesController } from './certificates.controller';

describe('CertificatesController PDF download', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the generated PDF with download-safe headers', async () => {
    const buffer = Buffer.from('%PDF-test');
    jest.spyOn(CertificatesService, 'renderPdf').mockResolvedValue({
      buffer,
      filename: 'threadlearn-course-TL-CERT-001.pdf',
    });
    const response = {
      setHeader: jest.fn(),
      status: jest.fn(),
      send: jest.fn(),
    };
    response.status.mockReturnValue(response);

    await new CertificatesController().pdf(
      'TL-CERT-001',
      response as unknown as Response,
    );

    expect(CertificatesService.renderPdf).toHaveBeenCalledWith('TL-CERT-001');
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/pdf',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="threadlearn-course-TL-CERT-001.pdf"',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Length',
      String(buffer.length),
    );
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith(buffer);
  });
});
