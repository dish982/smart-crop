export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import { connectToDatabase } from '@/lib/mongodb';
import FarmerHistory from '@/models/FarmerHistory';

const JWT_SECRET = process.env.JWT_SECRET;

function parseResultData(resultData) {
  if (!resultData) return {};

  if (typeof resultData === 'object') {
    return resultData;
  }

  if (typeof resultData === 'string') {
    try {
      const parsed = JSON.parse(resultData);
      return parsed && typeof parsed === 'object'
        ? parsed
        : { prediction: resultData };
    } catch {
      return { prediction: resultData };
    }
  }

  return {};
}

function getPrediction(resultData) {
  const parsed = parseResultData(resultData);

  return (
    parsed.prediction ||
    parsed.disease ||
    parsed.label ||
    parsed.className ||
    'Unknown'
  );
}

function isUncertain(resultData) {
  const prediction = getPrediction(resultData);

  const normalized = String(prediction)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');

  return (
    normalized.includes('uncertain') ||
    normalized.includes('not detected') ||
    normalized === 'unknown' ||
    normalized.includes('low confidence')
  );
}

function cleanDiseaseName(name) {
  if (!name) return 'Unknown';

  return String(name)
    .replace(/___/g, ': ')
    .replace(/_/g, ' ')
    .trim();
}

function getStatus(resultData) {
  if (isUncertain(resultData)) {
    return 'Uncertain';
  }

  const result = parseResultData(resultData);

  if (result.farmerConfirmed === true) {
    return 'Accurate';
  }

  if (result.farmerConfirmed === false) {
    return 'Incorrect';
  }

  return 'Unconfirmed';
}

export async function GET(request) {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET missing');
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'Admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const farmerId = searchParams.get('farmerId');

    const query = { type: 'disease' };

    if (farmerId) {
      if (!mongoose.Types.ObjectId.isValid(farmerId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid farmer ID' },
          { status: 400 }
        );
      }

      query.userId = new mongoose.Types.ObjectId(farmerId);
    }

    const diseaseLogs = await FarmerHistory.find(query)
      .populate('userId', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    if (diseaseLogs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No disease scan records found' },
        { status: 404 }
      );
    }

    const totalScans = diseaseLogs.length;
    let accurate = 0;
    let inaccurate = 0;
    let unconfirmed = 0;
    let uncertain = 0;

    const diseaseMap = new Map();

    for (const log of diseaseLogs) {
      const result = parseResultData(log.resultData);
      const prediction = getPrediction(log.resultData);
      const status = getStatus(log.resultData);

      if (status === 'Accurate') accurate++;
      else if (status === 'Incorrect') inaccurate++;
      else if (status === 'Uncertain') uncertain++;
      else unconfirmed++;

      const diseaseName = cleanDiseaseName(prediction);

      if (!diseaseMap.has(diseaseName)) {
        diseaseMap.set(diseaseName, {
          count: 0,
          accurate: 0,
          inaccurate: 0,
          unconfirmed: 0,
          uncertain: 0,
        });
      }

      const stats = diseaseMap.get(diseaseName);
      stats.count++;

      if (status === 'Accurate') stats.accurate++;
      else if (status === 'Incorrect') stats.inaccurate++;
      else if (status === 'Uncertain') stats.uncertain++;
      else stats.unconfirmed++;
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: 45,
    });

    const chunks = [];

    doc.on('data', (chunk) => {
      chunks.push(chunk);
    });

    const pdfBuffer = await new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', reject);

      const PAGE_WIDTH = 595.28;
      const PAGE_HEIGHT = 841.89;
      const MARGIN = 45;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

      const GREEN = '#2D5A27';
      const LIGHT_GREEN = '#EEF2D8';
      const CREAM = '#FAF7F2';
      const CHERRY = '#7A1734';
      const TEXT = '#1C241B';
      const MUTED = '#636B62';
      const BORDER = '#E5DEC3';
      const WHITE = '#FFFFFF';

      function addPageHeader(title) {
        doc.rect(0, 0, PAGE_WIDTH, 82).fill(GREEN);

        doc
          .fillColor(WHITE)
          .fontSize(21)
          .font('Helvetica-Bold')
          .text(title, MARGIN, 27, {
            width: CONTENT_WIDTH,
            align: 'left',
          });

        doc
          .fillColor('#DDE8D2')
          .fontSize(9)
          .font('Helvetica')
          .text('Smart Crop Advisory System', MARGIN, 55);
      }

      function addFooter() {
        const pageNumber = doc.bufferedPageRange().count;

        doc
          .moveTo(MARGIN, PAGE_HEIGHT - 38)
          .lineTo(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 38)
          .strokeColor(BORDER)
          .lineWidth(0.7)
          .stroke();

        doc
          .fillColor(MUTED)
          .fontSize(8)
          .font('Helvetica')
          .text(
            'Smart Crop Advisory System',
            MARGIN,
            PAGE_HEIGHT - 27,
            {
              width: CONTENT_WIDTH / 2,
            }
          );

        doc
          .text(
            `Page ${pageNumber}`,
            PAGE_WIDTH / 2,
            PAGE_HEIGHT - 27,
            {
              width: CONTENT_WIDTH / 2,
              align: 'right',
            }
          );
      }

      function sectionTitle(title, y) {
        doc
          .fillColor(TEXT)
          .font('Helvetica-Bold')
          .fontSize(13)
          .text(title, MARGIN, y);

        return y + 22;
      }

      function statCard(x, y, width, label, value, color) {
        doc
          .roundedRect(x, y, width, 62, 8)
          .fillAndStroke(WHITE, BORDER);

        doc
          .fillColor(color)
          .font('Helvetica-Bold')
          .fontSize(20)
          .text(String(value), x + 12, y + 12, {
            width: width - 24,
            align: 'left',
          });

        doc
          .fillColor(MUTED)
          .font('Helvetica')
          .fontSize(8)
          .text(label, x + 12, y + 39);
      }

      function drawTableHeader(columns, y) {
        doc
          .roundedRect(MARGIN, y, CONTENT_WIDTH, 25, 5)
          .fill(LIGHT_GREEN);

        columns.forEach((column) => {
          doc
            .fillColor(GREEN)
            .font('Helvetica-Bold')
            .fontSize(8)
            .text(
              column.label,
              column.x,
              y + 8,
              {
                width: column.width,
                align: column.align || 'left',
              }
            );
        });

        return y + 25;
      }

      function drawTableRow(columns, y, values, index) {
        const rowHeight = 27;

        if (index % 2 === 0) {
          doc
            .rect(MARGIN, y, CONTENT_WIDTH, rowHeight)
            .fill('#FCFBF8');
        }

        columns.forEach((column, i) => {
          doc
            .fillColor(TEXT)
            .font('Helvetica')
            .fontSize(8)
            .text(
              String(values[i] ?? ''),
              column.x,
              y + 9,
              {
                width: column.width,
                align: column.align || 'left',
              }
            );
        });

        doc
          .moveTo(MARGIN, y + rowHeight)
          .lineTo(PAGE_WIDTH - MARGIN, y + rowHeight)
          .strokeColor(BORDER)
          .lineWidth(0.5)
          .stroke();

        return y + rowHeight;
      }

      function ensureSpace(y, requiredHeight) {
        if (y + requiredHeight > PAGE_HEIGHT - 55) {
          addFooter();
          doc.addPage();
          doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(CREAM);
          return 55;
        }

        return y;
      }

      doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(CREAM);

      addPageHeader(
        farmerId
          ? 'Farmer Disease Report'
          : 'Smart Crop Disease Report'
      );

      let y = 105;

      if (farmerId) {
        const farmer = diseaseLogs[0]?.userId;

        doc
          .roundedRect(MARGIN, y, CONTENT_WIDTH, 72, 8)
          .fillAndStroke(WHITE, BORDER);

        doc
          .fillColor(GREEN)
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('Farmer Information', MARGIN + 15, y + 13);

        doc
          .fillColor(TEXT)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(
            farmer?.name || 'Anonymous Farmer',
            MARGIN + 15,
            y + 36
          );

        doc
          .fillColor(MUTED)
          .font('Helvetica')
          .fontSize(9)
          .text(
            farmer?.phone || 'Phone not available',
            MARGIN + 15,
            y + 51
          );

        y += 90;
      }

      y = sectionTitle('Diagnosis Summary', y);

      const cardGap = 8;
      const cardWidth = (CONTENT_WIDTH - cardGap * 4) / 5;

      statCard(
        MARGIN,
        y,
        cardWidth,
        'TOTAL SCANS',
        totalScans,
        GREEN
      );

      statCard(
        MARGIN + (cardWidth + cardGap),
        y,
        cardWidth,
        'ACCURATE',
        accurate,
        GREEN
      );

      statCard(
        MARGIN + (cardWidth + cardGap) * 2,
        y,
        cardWidth,
        'INCORRECT',
        inaccurate,
        CHERRY
      );

      statCard(
        MARGIN + (cardWidth + cardGap) * 3,
        y,
        cardWidth,
        'UNCONFIRMED',
        unconfirmed,
        MUTED
      );

      statCard(
        MARGIN + (cardWidth + cardGap) * 4,
        y,
        cardWidth,
        'UNCERTAIN',
        uncertain,
        CHERRY
      );

      y += 88;

      y = ensureSpace(y, 100);

      y = sectionTitle('Disease Breakdown', y);

      const diseaseColumns = [
        {
          label: 'DISEASE',
          x: MARGIN + 10,
          width: 190,
        },
        {
          label: 'SCANS',
          x: MARGIN + 210,
          width: 55,
          align: 'center',
        },
        {
          label: 'ACCURATE',
          x: MARGIN + 270,
          width: 65,
          align: 'center',
        },
        {
          label: 'INCORRECT',
          x: MARGIN + 340,
          width: 65,
          align: 'center',
        },
        {
          label: 'UNCONFIRMED',
          x: MARGIN + 410,
          width: 70,
          align: 'center',
        },
      ];

      y = drawTableHeader(diseaseColumns, y);

      for (const [index, [disease, stats]] of Array.from(
        diseaseMap.entries()
      ).entries()) {
        y = ensureSpace(y, 35);

        y = drawTableRow(
          diseaseColumns,
          y,
          [
            disease,
            stats.count,
            stats.accurate,
            stats.inaccurate,
            stats.unconfirmed,
          ],
          index
        );
      }

      y += 25;
      y = ensureSpace(y, 120);

      y = sectionTitle('Recent Scans', y);

      const scanColumns = [
        {
          label: '#',
          x: MARGIN + 8,
          width: 25,
          align: 'center',
        },
        {
          label: 'DIAGNOSIS',
          x: MARGIN + 38,
          width: 180,
        },
        {
          label: 'STATUS',
          x: MARGIN + 225,
          width: 75,
        },
        {
          label: 'CONFIDENCE',
          x: MARGIN + 305,
          width: 75,
          align: 'center',
        },
        {
          label: 'DATE',
          x: MARGIN + 390,
          width: 100,
          align: 'center',
        },
      ];

      y = drawTableHeader(scanColumns, y);

      diseaseLogs.slice(0, 20).forEach((log, index) => {
        y = ensureSpace(y, 35);

        const prediction = cleanDiseaseName(
          getPrediction(log.resultData)
        );

        const result = parseResultData(log.resultData);
        const status = getStatus(log.resultData);

        const confidence =
          typeof result.confidence === 'number'
            ? `${result.confidence}%`
            : 'N/A';

        const date = new Date(log.createdAt).toLocaleDateString(
          'en-IN'
        );

        y = drawTableRow(
          scanColumns,
          y,
          [
            index + 1,
            prediction,
            status,
            confidence,
            date,
          ],
          index
        );
      });

      addFooter();

      doc.end();
    });
    
    const fileName = farmerId
      ? 'farmer-disease-report.pdf'
      : 'smart-crop-disease-report.pdf';

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('REPORT DOWNLOAD ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate report',
      },
      { status: 500 }
    );
  }
}