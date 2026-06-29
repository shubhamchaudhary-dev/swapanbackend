import sharp from 'sharp';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import { cloudinary } from './cloudinary';

const uploadBufferToCloudinary = (buffer: Buffer, folder: string, filename: string, isPdf: boolean): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename,
        resource_type: isPdf ? 'raw' : 'image',
        format: isPdf ? undefined : 'png',
        access_mode: 'public',
      },
      (error, result) => {
        if (result) {
          resolve(result.secure_url);
        } else {
          reject(error);
        }
      }
    );
    stream.end(buffer);
  });
};

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Extract only the display name from "Name | email | phone | address | designation" format.
 * This strips out all metadata and returns an array of clean author names.
 */
function extractAuthorNamesList(authors: string[]): string[] {
  const result: string[] = [];
  for (const author of authors) {
    const cleanAuthor = author.split('|')[0].trim();
    if (cleanAuthor) {
      // If multiple authors were submitted separated by commas in a single field
      const subAuthors = cleanAuthor.split(',').map(a => a.trim()).filter(Boolean);
      result.push(...subAuthors);
    }
  }
  return result;
}

/**
 * Wrap text into multiple lines, each fitting within maxCharsPerLine.
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  if (text.length <= maxCharsPerLine) return [text];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export const generateAndUploadCertificate = async (
  title: string,
  authors: string[],
  journalName: string,
  publicationDate: string,
  paperSlug: string
): Promise<{ authorCertificates: { authorName: string; certId: string; pdfUrl: string; pngUrl: string }[] }> => {
  const templatePath = path.join(__dirname, '../assets/certificate.png');

  // Template is exactly 1536 x 1024 px
  const W = 1536;
  const H = 1024;

  const authorNamesList = extractAuthorNamesList(authors);
  const pdfDoc = await PDFDocument.create();
  let firstPngBuffer: Buffer | null = null;
  const authorCertificates: { authorName: string; certId: string; pdfUrl: string; pngUrl: string }[] = [];

  const safeTitle = escapeXml(title);
  const safeJournal = escapeXml(journalName);
  const safeDate = escapeXml(publicationDate);
  const centerX = W / 2;

  // ──────────────────────────────────────────────────────────────────────────
  // TITLE (Static for all pages)
  // ──────────────────────────────────────────────────────────────────────────
  const TITLE_Y = 430;
  const titleMaxChars = 60;
  const titleFontSize = title.length > titleMaxChars
    ? Math.max(15, Math.floor(22 * (titleMaxChars / title.length)))
    : 22;
  const titleLineH = titleFontSize + 5;
  const titleLines = wrapText(safeTitle, titleMaxChars);
  const titleBaselineY = TITLE_Y - ((titleLines.length - 1) * titleLineH) / 2;

  const titleSvg = titleLines.map((line, i) =>
    `<text x="${centerX}" y="${Math.round(titleBaselineY + i * titleLineH)}" ` +
    `font-family="Georgia, 'Times New Roman', serif" font-size="${titleFontSize}" ` +
    `font-weight="bold" fill="#0B1F5C" text-anchor="middle">${line}</text>`
  ).join('\n');

  // ──────────────────────────────────────────────────────────────────────────
  // BOTTOM RIBBON (Static for all pages)
  // ──────────────────────────────────────────────────────────────────────────
  const RIBBON_Y = 807; // Vertically centered with the icons
  const JOURNAL_X = 500; // Just right of the book icon (X=465)
  const DATE_X = 875; // Just right of the calendar icon (X=838)
  const journalFontSize = journalName.length > 22
    ? Math.max(12, Math.floor(18 * (22 / journalName.length)))
    : 18;
  const dateFontSize = 18;

  const ribbonSvg = `
    <text x="${JOURNAL_X}" y="${RIBBON_Y}" font-family="Georgia, 'Times New Roman', serif"
      font-size="${journalFontSize}" font-weight="bold" fill="#0B1F5C" text-anchor="start">${safeJournal}</text>
    <text x="${DATE_X}" y="${RIBBON_Y}" font-family="Georgia, 'Times New Roman', serif"
      font-size="${dateFontSize}" font-weight="bold" fill="#0B1F5C" text-anchor="start">${safeDate}</text>
  `;

  // ──────────────────────────────────────────────────────────────────────────
  // LOOP OVER AUTHORS
  // ──────────────────────────────────────────────────────────────────────────
  const uploadPromises: Promise<void>[] = [];

  for (const authorName of authorNamesList) {
    const certId = `SP-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const safeAuthor = escapeXml(authorName);
    
    // Shift the author name down so it doesn't overlap the "authored by" text which ends at Y=484
    const AUTHORS_Y = 525;
    const authorsMaxChars = 75;
    const authorsFontSize = authorName.length > authorsMaxChars
      ? Math.max(16, Math.floor(36 * (authorsMaxChars / authorName.length)))
      : 36;
    const authorsLineH = authorsFontSize + 5;
    const authorsLines = wrapText(safeAuthor, authorsMaxChars);
    const authorsBaselineY = AUTHORS_Y - ((authorsLines.length - 1) * authorsLineH) / 2;

    const authorsSvg = authorsLines.map((line, i) =>
      `<text x="${centerX}" y="${Math.round(authorsBaselineY + i * authorsLineH)}" ` +
      `font-family="Georgia, 'Times New Roman', serif" font-size="${authorsFontSize}" ` +
      `font-weight="normal" fill="#1a1a4e" text-anchor="middle">${line}</text>`
    ).join('\n');

    // Add Cert ID to top left corner
    const certIdSvg = `<text x="150" y="80" font-family="Georgia, 'Times New Roman', serif" font-size="16" font-weight="bold" fill="#0B1F5C" text-anchor="start">Certificate ID: ${certId}</text>`;

    const svgOverlay = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${titleSvg}
      ${authorsSvg}
      ${ribbonSvg}
      ${certIdSvg}
    </svg>`;

    const generateAndUploadForAuthor = async () => {
      const pngBuffer = await sharp(templatePath)
        .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
        .png()
        .toBuffer();

      const authorPdfDoc = await PDFDocument.create();
      const page = authorPdfDoc.addPage([W, H]);
      const pngImage = await authorPdfDoc.embedPng(pngBuffer);
      page.drawImage(pngImage, { x: 0, y: 0, width: W, height: H });
      const pdfBuffer = Buffer.from(await authorPdfDoc.save());

      const timestamp = Date.now();
      const folder = 'swarnpublication/certificates';
      const safeAuthorFile = authorName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      const shortSlug = paperSlug.substring(0, 30);

      const [pngUrl, pdfUrl] = await Promise.all([
        uploadBufferToCloudinary(pngBuffer, folder, `cert_${shortSlug}_${safeAuthorFile}_${timestamp}`, false),
        uploadBufferToCloudinary(pdfBuffer, folder, `cert_${shortSlug}_${safeAuthorFile}_${timestamp}.pdf`, true),
      ]);

      authorCertificates.push({ authorName, certId, pdfUrl, pngUrl });
    };

    uploadPromises.push(generateAndUploadForAuthor());
  }

  await Promise.all(uploadPromises);

  return { authorCertificates };
};

