import PDFDocument from 'pdfkit';
import { CertificateResponse } from '../presentation/certificate.presenter';

const FOREST = '#12372A';
const DEEP_FOREST = '#09251C';
const LIME = '#B7F34A';
const CREAM = '#FBF8ED';
const INK = '#17362B';
const MUTED = '#5E7169';
const WHITE = '#FFFFFF';

function formatCertificateDate(date: Date): string {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function safeText(value: string, fallback: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || fallback;
}

function courseScope(certificate: CertificateResponse): string {
  if (certificate.course.totalLessons) {
    return `${certificate.course.totalLessons} lessons`;
  }
  if (certificate.course.estimatedDuration) {
    const hours = Math.max(1, Math.round(certificate.course.estimatedDuration / 60));
    return `${hours} learning hours`;
  }
  return 'Self-paced';
}

export class CertificatePdfService {
  static async render(certificate: CertificateResponse): Promise<Buffer> {
    const document = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 0,
      info: {
        Title: `ThreadLearn Certificate - ${certificate.course.title}`,
        Author: 'ThreadLearn',
        Subject: 'Certificate of Completion',
        Keywords: 'ThreadLearn, certificate, course completion',
      },
    });
    const chunks: Buffer[] = [];

    document.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    const completed = new Promise<Buffer>((resolve, reject) => {
      document.once('end', () => resolve(Buffer.concat(chunks)));
      document.once('error', reject);
    });

    document.registerFont(
      'NotoSans',
      require.resolve('@digabi/noto-sans/WOFF/NotoSans-Regular.woff'),
    );
    document.registerFont(
      'NotoSansBold',
      require.resolve('@digabi/noto-sans/WOFF/NotoSans-Bold.woff'),
    );

    const width = document.page.width;
    const height = document.page.height;
    const railWidth = 156;
    const contentLeft = railWidth + 58;
    const contentWidth = width - contentLeft - 58;
    const description = safeText(
      certificate.course.description,
      'This credential confirms successful completion of the published course requirements recorded by ThreadLearn.',
    );
    const skills =
      certificate.course.tags.length > 0
        ? certificate.course.tags.slice(0, 5)
        : [certificate.course.level, certificate.course.language].filter(Boolean);
    const courseTitle = safeText(certificate.course.title, 'ThreadLearn Course');
    let courseTitleFontSize = 23;
    document.font('NotoSansBold').fontSize(courseTitleFontSize);
    while (
      courseTitleFontSize > 17 &&
      document.heightOfString(courseTitle, { width: 430, lineGap: 2 }) > 62
    ) {
      courseTitleFontSize -= 1;
      document.fontSize(courseTitleFontSize);
    }

    document.rect(0, 0, width, height).fill(CREAM);
    document.rect(0, 0, railWidth, height).fill(FOREST);
    document.rect(railWidth, 0, 8, height).fill(LIME);
    document.lineWidth(2).strokeColor(FOREST).rect(18, 18, width - 36, height - 36).stroke();
    document
      .lineWidth(0.7)
      .strokeColor('#8FA69B')
      .rect(27, 27, width - 54, height - 54)
      .stroke();

    document.save();
    document.strokeColor('#0B7668').lineWidth(0.5).opacity(0.12);
    for (let ring = 0; ring < 22; ring += 1) {
      document.ellipse(width - 108, 182, 122 - ring * 5, 98 - ring * 4).stroke();
    }
    document.restore();

    document
      .fillColor(WHITE)
      .font('NotoSansBold')
      .fontSize(20)
      .text('THREAD', 31, 48, { width: 100, lineBreak: false });
    document
      .fillColor(LIME)
      .fontSize(20)
      .text('LEARN', 31, 73, { width: 100, lineBreak: false });
    document
      .fillColor('#DCE9E2')
      .font('NotoSans')
      .fontSize(7.5)
      .text('BUILD / PRACTICE / GROW', 31, 108, {
        width: 94,
        characterSpacing: 0.55,
      });
    document.lineWidth(1).strokeColor('#4E7162').moveTo(31, 145).lineTo(124, 145).stroke();

    document
      .fillColor(LIME)
      .font('NotoSansBold')
      .fontSize(22)
      .text('1', 31, 160, { width: 22, lineBreak: false });
    document
      .fillColor(WHITE)
      .font('NotoSansBold')
      .fontSize(8)
      .text('COURSE', 55, 169, { width: 67, characterSpacing: 1.1 });

    document
      .fillColor('#DCE9E2')
      .font('NotoSansBold')
      .fontSize(7.5)
      .text('COMPLETED PROGRAM', 31, 207, { characterSpacing: 0.65 });
    document
      .fillColor(WHITE)
      .font('NotoSansBold')
      .fontSize(8)
      .text(certificate.course.title, 31, 226, {
        width: 94,
        height: 64,
        lineGap: 2,
        ellipsis: true,
      });

    document
      .fillColor('#DCE9E2')
      .font('NotoSansBold')
      .fontSize(7.5)
      .text('SKILLS DEMONSTRATED', 31, 313, {
        width: 94,
        characterSpacing: 0.45,
      });
    document
      .fillColor(WHITE)
      .font('NotoSans')
      .fontSize(7)
      .text(skills.map((skill) => `/ ${skill}`).join('\n'), 31, 340, {
        width: 94,
        height: 77,
        lineGap: 2,
        ellipsis: true,
      });

    document
      .fillColor('#DCE9E2')
      .font('NotoSansBold')
      .fontSize(7.5)
      .text('CERTIFICATE ID', 31, 434);
    document
      .fillColor(WHITE)
      .font('NotoSans')
      .fontSize(7)
      .text(certificate.certificateCode, 31, 452, {
        width: 94,
        height: 43,
        lineGap: 2,
        ellipsis: true,
      });
    document
      .fillColor('#DCE9E2')
      .font('NotoSansBold')
      .fontSize(7.5)
      .text('ISSUED', 31, 509);
    document
      .fillColor(WHITE)
      .font('NotoSans')
      .fontSize(8)
      .text(formatCertificateDate(certificate.issuedAt), 31, 526, { width: 94 });

    document
      .fillColor(FOREST)
      .font('NotoSansBold')
      .fontSize(12)
      .text('CERTIFICATE OF COMPLETION', contentLeft, 55, {
        width: contentWidth,
        characterSpacing: 2.2,
      });
    document
      .fillColor(MUTED)
      .font('NotoSans')
      .fontSize(8.5)
      .text(formatCertificateDate(certificate.issuedAt), contentLeft, 91);
    document
      .fillColor(MUTED)
      .font('NotoSans')
      .fontSize(10)
      .text('ThreadLearn confirms that', contentLeft, 116);
    document
      .fillColor(DEEP_FOREST)
      .font('NotoSansBold')
      .fontSize(31)
      .text(safeText(certificate.recipientName, 'ThreadLearn Learner'), contentLeft, 139, {
        width: contentWidth,
        height: 43,
        ellipsis: true,
      });
    document
      .lineWidth(3)
      .strokeColor(LIME)
      .moveTo(contentLeft, 188)
      .lineTo(contentLeft + Math.min(contentWidth, 455), 188)
      .stroke();
    document
      .fillColor(MUTED)
      .font('NotoSans')
      .fontSize(10)
      .text('has successfully completed the online course', contentLeft, 210);
    document
      .fillColor(INK)
      .font('NotoSansBold')
      .fontSize(courseTitleFontSize)
      .text(courseTitle, contentLeft, 235, {
        width: 430,
        height: 64,
        lineGap: 2,
      });
    document
      .fillColor(MUTED)
      .font('NotoSans')
      .fontSize(8.5)
      .text(description, contentLeft, 307, {
        width: 430,
        height: 62,
        lineGap: 2,
        ellipsis: true,
      });

    document
      .fillColor(CREAM)
      .circle(width - 108, 182, 28)
      .fill()
      .lineWidth(1)
      .strokeColor('#8FBBAA')
      .circle(width - 108, 182, 28)
      .stroke();
    document
      .fillColor(FOREST)
      .font('NotoSansBold')
      .fontSize(15)
      .text('TL', width - 126, 171, { width: 36, align: 'center' });
    document
      .lineWidth(0.8)
      .strokeColor('#A6B7AE')
      .moveTo(width - 177, 274)
      .lineTo(width - 39, 274)
      .stroke();
    document
      .fillColor(FOREST)
      .font('NotoSansBold')
      .fontSize(9)
      .text('THREADLEARN', width - 177, 286, { width: 138, align: 'center' });
    document
      .fillColor(MUTED)
      .font('NotoSans')
      .fontSize(6.5)
      .text('Official learning record', width - 177, 302, {
        width: 138,
        align: 'center',
      });

    const metadataTop = 390;
    const metadataColumns = [
      {
        label: 'COMPLETED',
        value: formatCertificateDate(certificate.completedAt),
        x: contentLeft,
        width: 130,
      },
      {
        label: 'LEARNING LEVEL',
        value: certificate.course.level || 'Open level',
        x: contentLeft + 150,
        width: 120,
      },
      {
        label: 'LANGUAGE',
        value: certificate.course.language || 'Not specified',
        x: contentLeft + 285,
        width: 110,
      },
      {
        label: 'COURSE SCOPE',
        value: courseScope(certificate),
        x: contentLeft + 410,
        width: 130,
      },
    ];

    for (const item of metadataColumns) {
      document
        .fillColor(MUTED)
        .font('NotoSansBold')
        .fontSize(7.5)
        .text(item.label, item.x, metadataTop, { width: item.width });
      document
        .fillColor(INK)
        .font('NotoSans')
        .fontSize(9)
        .text(item.value, item.x, metadataTop + 17, {
          width: item.width,
          ellipsis: true,
        });
    }

    document.roundedRect(contentLeft, 457, contentWidth, 91, 7).fill('#EEF2E8');
    document
      .fillColor(FOREST)
      .font('NotoSansBold')
      .fontSize(8.5)
      .text('VERIFY THIS CREDENTIAL', contentLeft + 18, 472);
    document
      .fillColor(MUTED)
      .font('NotoSans')
      .fontSize(7.6)
      .text(certificate.verificationUrl, contentLeft + 18, 490, {
        width: contentWidth - 36,
        ellipsis: true,
      });
    document
      .fillColor(MUTED)
      .font('NotoSans')
      .fontSize(6.2)
      .text(
        `Certificate ID ${certificate.certificateCode} - Generated by ThreadLearn - No signature is required.`,
        contentLeft + 18,
        513,
        { width: contentWidth - 36, ellipsis: true },
      );
    document
      .fillColor('#71837B')
      .font('NotoSans')
      .fontSize(5.7)
      .text(
        'This certificate attests to completion of an online ThreadLearn course. Verify the live record using the URL above.',
        contentLeft + 18,
        532,
        { width: contentWidth - 36, ellipsis: true },
      );

    document.end();
    return completed;
  }
}
