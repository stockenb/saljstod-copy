'use client';

import type { jsPDF } from 'jspdf';

type Specification = {
  key: string;
  value: string;
};

export type ProductData = {
  articleNumber: string;
  title: string;
  link: string;
  image: string;
  description: string;
  weight: string;
  specs: Specification[];
};

export type ProductFetchError = {
  articleNumber: string;
  message: string;
};

export type ProductFetchResult = {
  products: ProductData[];
  errors: ProductFetchError[];
};

const contactDetails = [
  'Nils Ahlgren AB • Rörvägen 16, 136 50 Jordbro',
  'info@nilsahlgren.se • +46 8 500 125 80 • www.nilsahlgren.se',
];

type PdfImage = {
  dataUrl: string;
  format: 'PNG' | 'JPEG' | 'WEBP';
};

const LOGO_IMAGE_PATH = '/na_foretag.png';

const POPPINS_FONT_URLS = {
  regular: 'https://cdn.jsdelivr.net/npm/@fontsource/poppins/files/poppins-latin-400-normal.ttf',
  semiBold: 'https://cdn.jsdelivr.net/npm/@fontsource/poppins/files/poppins-latin-600-normal.ttf',
} as const;

const POPPINS_FONT_FILES = {
  regular: 'Poppins-Regular.ttf',
  semiBold: 'Poppins-SemiBold.ttf',
} as const;

type PoppinsFontVariant = keyof typeof POPPINS_FONT_URLS;

const poppinsFontCache: Partial<Record<PoppinsFontVariant, string>> = {};

const EXCLUDED_SPEC_KEYS = new Set(['ean-kod', 'benämning engelska', 'vikt']);

const PACKAGING_PRIORITIES: Record<string, number> = {
  'sb förpackning': 0,
  paket: 1,
  hink: 2,
};

const UNKNOWN_PACKAGING_PRIORITY = 3;
const BULK_PACKAGING_PRIORITY = 4;

const PRIMARY_PACKAGING_KEYS = ['Primärförpackning', 'Primärförp.'];
const PRIMARY_QUANTITY_KEYS = ['Antal i primärförpackning', 'Antal i primärförp.'];

function normalizeSpecKey(label: string) {
  return label.trim().toLowerCase();
}

function normalizePackagingLabel(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .normalize('NFKC')
    .toLocaleLowerCase('sv-SE')
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized || null;
}

function getPackagingPriority(articleNumber: string, packaging: string | null): number {
  if (/^b/i.test(articleNumber)) {
    return BULK_PACKAGING_PRIORITY;
  }

  if (!packaging) {
    return UNKNOWN_PACKAGING_PRIORITY;
  }

  return PACKAGING_PRIORITIES[packaging] ?? UNKNOWN_PACKAGING_PRIORITY;
}

function extractNumbers(value: string): number[] {
  const matches = value.match(/\d+(?:[.,]\d+)?/g);

  if (!matches) {
    return [];
  }

  return matches
    .map((match) => Number.parseFloat(match.replace(',', '.')))
    .filter((num) => Number.isFinite(num));
}

function getSizeSortKey(size: string): number[] {
  const compact = size.replace(/\s+/g, ' ');
  const numbers = extractNumbers(compact);
  return numbers.length > 0 ? numbers : [Number.POSITIVE_INFINITY];
}

function compareSizeKeys(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    const aValue = a[index] ?? 0;
    const bValue = b[index] ?? 0;

    if (aValue !== bValue) {
      return aValue - bValue;
    }
  }

  return 0;
}

function getPrimaryPackagingQuantity(value: string | undefined | null): number {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const numbers = extractNumbers(value);
  if (numbers.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return numbers[0];
}

function normalizeUrl(raw: string): string {
  if (!raw) return raw;
  if (raw.startsWith('data:image/')) return raw;

  try {
    const [base, rest] = raw.split(/([?#].*)/);
    return encodeURI(base) + (rest ?? '');
  } catch {
    return raw.replace(/ /g, '%20');
  }
}

async function loadHtmlImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function rasterizeToJpeg(pdfImage: PdfImage, quality = 0.92) {
  const img = await loadHtmlImageFromDataUrl(pdfImage.dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Kunde inte skapa 2D-kontext');
  ctx.drawImage(img, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { dataUrl, format: 'JPEG' as const } satisfies PdfImage;
}

async function loadLogoImage(): Promise<PdfImage> {
  const response = await fetch(LOGO_IMAGE_PATH, { cache: 'force-cache' });

  if (!response.ok) {
    throw new Error('Kunde inte ladda logotypen');
  }

  const blob = await response.blob();
  const format = blob.type === 'image/png' ? 'PNG' : blob.type === 'image/webp' ? 'WEBP' : 'JPEG';
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  return { dataUrl, format };
}

async function loadPoppinsFont(variant: PoppinsFontVariant): Promise<string | null> {
  if (poppinsFontCache[variant]) {
    return poppinsFontCache[variant] ?? null;
  }

  try {
    const response = await fetch(POPPINS_FONT_URLS[variant]);

    if (!response.ok) {
      throw new Error(`Kunde inte ladda typsnittet ${variant}`);
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
    const base64 = btoa(binary);
    poppinsFontCache[variant] = base64;
    return base64;
  } catch (error) {
    console.warn('Kunde inte ladda Poppins', error);
    poppinsFontCache[variant] = null;
    return null;
  }
}

async function ensurePoppinsFonts(doc: jsPDF): Promise<boolean> {
  try {
    const [regular, semiBold] = await Promise.all([
      loadPoppinsFont('regular'),
      loadPoppinsFont('semiBold'),
    ]);

    if (!regular || !semiBold) {
      return false;
    }

    doc.addFileToVFS(POPPINS_FONT_FILES.regular, regular);
    doc.addFont(POPPINS_FONT_FILES.regular, 'Poppins', 'normal');
    doc.addFileToVFS(POPPINS_FONT_FILES.semiBold, semiBold);
    doc.addFont(POPPINS_FONT_FILES.semiBold, 'Poppins', 'bold');

    return true;
  } catch (error) {
    console.warn('Kunde inte ladda Poppins', error);
    return false;
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.trim().replace('#', '');
  const full = sanitized.length === 3 ? sanitized.split('').map((char) => char + char).join('') : sanitized;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function createFilename(products: ProductData[]) {
  const first = products[0];
  const base = first?.title || first?.articleNumber || 'samlat-produktblad';
  return `${base}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .concat('-samlat.pdf');
}

function tokenizeTitle(title: string) {
  return title
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function findCommonPrefixTokens(tokenLists: string[][]) {
  if (tokenLists.length === 0) {
    return [] as string[];
  }

  let prefix = [...tokenLists[0]];

  for (let listIndex = 1; listIndex < tokenLists.length && prefix.length > 0; listIndex += 1) {
    const tokens = tokenLists[listIndex];
    const maxLength = Math.min(prefix.length, tokens.length);
    let matchLength = 0;

    while (
      matchLength < maxLength &&
      prefix[matchLength].toLowerCase() === tokens[matchLength]?.toLowerCase()
    ) {
      matchLength += 1;
    }

    prefix = prefix.slice(0, matchLength);
  }

  return prefix;
}

function findCommonSuffixTokens(tokenLists: string[][]) {
  if (tokenLists.length === 0) {
    return [] as string[];
  }

  let suffix = [...tokenLists[0]];

  for (let listIndex = 1; listIndex < tokenLists.length && suffix.length > 0; listIndex += 1) {
    const tokens = tokenLists[listIndex];
    const maxLength = Math.min(suffix.length, tokens.length);
    let matchLength = 0;

    while (
      matchLength < maxLength &&
      suffix[suffix.length - 1 - matchLength]?.toLowerCase() ===
        tokens[tokens.length - 1 - matchLength]?.toLowerCase()
    ) {
      matchLength += 1;
    }

    suffix = suffix.slice(suffix.length - matchLength);
  }

  return suffix;
}

async function collectImage(product: ProductData): Promise<PdfImage | null> {
  if (!product.image) {
    return null;
  }

  const normalizedUrl = normalizeUrl(product.image);
  if (!normalizedUrl) {
    return null;
  }

  try {
    const response = await fetch(`/api/produktblad/image?src=${encodeURIComponent(normalizedUrl)}`);

    if (!response.ok) {
      throw new Error('Kunde inte hämta bild');
    }

    const data = (await response.json()) as { dataUrl?: string; format?: PdfImage['format'] };
    if (data?.dataUrl && data?.format) {
      if (data.format === 'PNG') {
        return { dataUrl: data.dataUrl, format: 'PNG' };
      }

      if (data.format === 'WEBP') {
        return { dataUrl: data.dataUrl, format: 'WEBP' };
      }

      if (data.format === 'JPEG') {
        return { dataUrl: data.dataUrl, format: 'JPEG' };
      }
    }

    if (data?.dataUrl) {
      return rasterizeToJpeg({ dataUrl: data.dataUrl, format: 'JPEG' });
    }
  } catch (error) {
    console.warn('Kunde inte hämta produktbild', error);
  }

  try {
    const response = await fetch(normalizedUrl, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error('Kunde inte hämta produktbild');
    }

    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return rasterizeToJpeg({ dataUrl, format: 'JPEG' });
  } catch (error) {
    console.warn('Kunde inte rasterisera produktbild', error);
    return null;
  }
}

export async function fetchCombinedProductData(articleNumbers: string[]): Promise<ProductFetchResult> {
  const numbers = Array.from(new Set(
    articleNumbers
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  ));

  if (numbers.length === 0) {
    return { products: [], errors: [] };
  }

  const requests = numbers.map(async (articleNumber) => {
    const response = await fetch(`/api/produktblad?id=${encodeURIComponent(articleNumber)}`);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error || 'Kunde inte hämta artikel.');
    }

    const data = (await response.json()) as { product: ProductData };
    return data.product;
  });

  const results = await Promise.allSettled(requests);
  const products: ProductData[] = [];
  const errors: ProductFetchError[] = [];

  results.forEach((result, index) => {
    const articleNumber = numbers[index];

    if (result.status === 'fulfilled') {
      products.push(result.value);
      return;
    }

    const reason =
      result.reason instanceof Error ? result.reason.message : String(result.reason ?? 'Okänt fel');
    errors.push({ articleNumber, message: reason });
  });

  return { products, errors };
}

export async function generateCombinedProductSheet(products: ProductData[]): Promise<void> {
  if (products.length === 0) {
    throw new Error('Inga artiklar att generera PDF för.');
  }

  const [{ jsPDF }, autoTableModule, logoImage] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadLogoImage(),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const fontsLoaded = await ensurePoppinsFonts(doc);

  const baseFont = fontsLoaded ? 'Poppins' : 'helvetica';
  const headingColor = hexToRgb('#0f172a');
  const accentColor = hexToRgb('#1d4ed8');
  const textColor = hexToRgb('#1f2937');
  const borderColor = hexToRgb('#e2e8f0');

  const marginX = 20;
  const marginY = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(headingColor[0], headingColor[1], headingColor[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  const logo = await collectImage(products[0]);
  if (logo) {
    const logoWidth = 40;
    const logoHeight = (logoWidth * 3) / 8;
    doc.addImage(logo.dataUrl, logo.format, marginX, 8, logoWidth, logoHeight);
  }

  doc.setFont(baseFont, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(products[0]?.title || 'Samlat produktblad', marginX + 8, 20);

  doc.setFont(baseFont, 'normal');
  doc.setFontSize(12);
  doc.text('Samlat produktblad', marginX + 8, 28);

  let currentY = 50;

  const productImages = await Promise.all(products.map((product) => collectImage(product)));

  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    const image = productImages[index];

    if (currentY + 70 > pageHeight - marginY) {
      doc.addPage();
      currentY = marginY;
    }

    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(marginX - 4, currentY - 4, pageWidth - marginX * 2 + 8, 68, 3, 3, 'S');

    const contentWidth = pageWidth - marginX * 2;
    const imageWidth = 50;
    const imageHeight = 50;
    const imageMargin = 8;
    const columnWidth = contentWidth - imageWidth - imageMargin;

    if (image) {
      doc.addImage(image.dataUrl, image.format, marginX, currentY, imageWidth, imageHeight, undefined, 'FAST');
    } else {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY, imageWidth, imageHeight, 'F');
      doc.setFont(baseFont, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Ingen bild', marginX + imageWidth / 2, currentY + imageHeight / 2, {
        align: 'center',
        baseline: 'middle',
      });
    }

    const columnStartX = marginX + imageWidth + imageMargin;
    const columnStartY = currentY;
    const columnLimitY = columnStartY + imageHeight;

    doc.setFont(baseFont, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
    doc.text(product.title || product.articleNumber, columnStartX, columnStartY + 6);

    doc.setFont(baseFont, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`Artikelnummer: ${product.articleNumber}`, columnStartX, columnStartY + 12);
    if (product.weight) {
      doc.text(`Vikt: ${product.weight}`, columnStartX, columnStartY + 18);
    }

    doc.setFont(baseFont, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    const description = product.description || '';
    if (description) {
      const maxWidth = columnWidth;
      const lineHeight = 4.5;
      let textBaseline = columnStartY + 26;
      const words = description.split(/\s+/);
      let currentLine = '';
      let lastLineBaseline = columnStartY + 26;

      const writeLine = (line: string) => {
        doc.text(line, marginX, textBaseline);
        lastLineBaseline = textBaseline;
        textBaseline += lineHeight;
      };

      for (const word of words) {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        const candidateWidth =
          doc.getStringUnitWidth(candidate) * (doc.getFontSize() / doc.internal.scaleFactor);

        if (candidateWidth <= maxWidth) {
          currentLine = candidate;
        } else {
          if (currentLine) {
            writeLine(currentLine);
          }

          const updatedMaxWidth = textBaseline < columnLimitY ? columnWidth : contentWidth;
          const wordWidth =
            doc.getStringUnitWidth(word) * (doc.getFontSize() / doc.internal.scaleFactor);

          if (wordWidth > updatedMaxWidth) {
            const forcedLines = doc.splitTextToSize(word, updatedMaxWidth);
            for (const forcedLine of forcedLines) {
              doc.text(forcedLine, marginX, textBaseline);
              lastLineBaseline = textBaseline;
              textBaseline += lineHeight;
            }
          } else {
            currentLine = word;
          }
        }
      }

      if (currentLine) {
        writeLine(currentLine);
      }

      currentY = Math.max(columnLimitY, lastLineBaseline + 6);
    } else {
      currentY = columnLimitY;
    }

    currentY += 12;
  }

  const displayValue = (value?: string) => {
    const trimmed = (value ?? '').trim();
    return trimmed || '-';
  };

  const specOrder: string[] = [];
  const rawEntries = products.map((product) => {
    const articleNumber = displayValue(product.articleNumber);
    const originalTitle = (product.title ?? '').trim();
    const tokens = tokenizeTitle(originalTitle);
    const specMap = new Map<string, string>();
    const normalizedSpecMap = new Map<string, string>();

    product.specs.forEach((spec) => {
      const label = spec.key.trim() || 'Specifikation';
      const normalizedLabel = normalizeSpecKey(label);

      if (EXCLUDED_SPEC_KEYS.has(normalizedLabel)) {
        return;
      }

      const trimmedValue = (spec.value ?? '').trim();
      if (!specOrder.includes(label)) {
        specOrder.push(label);
      }

      specMap.set(label, trimmedValue);
      normalizedSpecMap.set(normalizedLabel, trimmedValue);
    });

    return { articleNumber, originalTitle, tokens, specMap, normalizedSpecMap };
  });

  const tokenLists = rawEntries
    .map((entry) => entry.tokens)
    .filter((entryTokens) => entryTokens.length > 0);
  const prefixTokens = findCommonPrefixTokens(tokenLists);
  const suffixTokens = findCommonSuffixTokens(tokenLists);
  const prefixLength = prefixTokens.length;
  const suffixLength = suffixTokens.length;

  const articleEntries = rawEntries.map((entry) => {
    const { tokens } = entry;
    let endIndex = tokens.length - suffixLength;
    if (endIndex < prefixLength) {
      endIndex = prefixLength;
    }
    const sizeTokens = tokens.slice(prefixLength, endIndex);
    const sizeText = sizeTokens.join(' ').trim();
    const packagingValue = PRIMARY_PACKAGING_KEYS.reduce<string | undefined>((current, key) => {
      if (current) {
        return current;
      }

      return entry.normalizedSpecMap.get(normalizeSpecKey(key));
    }, undefined);
    const normalizedPackaging = normalizePackagingLabel(packagingValue);
    const quantityValue = PRIMARY_QUANTITY_KEYS.reduce<string | undefined>((current, key) => {
      if (current) {
        return current;
      }

      return entry.normalizedSpecMap.get(normalizeSpecKey(key));
    }, undefined);

    return {
      articleNumber: entry.articleNumber,
      size: displayValue(sizeText || entry.originalTitle),
      sizeSortKey: getSizeSortKey(sizeText || entry.originalTitle),
      packagingPriority: getPackagingPriority(entry.articleNumber, normalizedPackaging),
      packagingQuantity: getPrimaryPackagingQuantity(quantityValue),
      specMap: entry.specMap,
    };
  });

  const sharedSpecLabels = specOrder.filter((label) => {
    const firstValue = (rawEntries[0]?.specMap.get(label) ?? '').trim();
    if (!firstValue) {
      return false;
    }

    return rawEntries.every((entry) => {
      const value = (entry.specMap.get(label) ?? '').trim();
      return value && value.toLowerCase() === firstValue.toLowerCase();
    });
  });

  const sharedSpecs = sharedSpecLabels.map((label) => ({
    label,
    value: displayValue(rawEntries[0]?.specMap.get(label)),
  }));

  const remainingSpecLabels = specOrder.filter((label) => !sharedSpecLabels.includes(label));
  const filteredSpecLabels = remainingSpecLabels.filter((label) =>
    rawEntries.some((entry) => (entry.specMap.get(label) ?? '').trim()),
  );

  if (sharedSpecs.length > 0) {
    if (currentY + 30 > pageHeight - 30) {
      doc.addPage();
      currentY = 30;
    }

    doc.setFont(baseFont, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
    doc.text('Specifikation', marginX, currentY);
    currentY += 6;

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [['Specifikation', 'Värde']],
      body: sharedSpecs.map((spec) => [spec.label, spec.value]),
      styles: {
        font: baseFont,
        fontStyle: 'normal',
        fontSize: 9,
        textColor,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [accentColor[0], accentColor[1], accentColor[2]],
        textColor: [255, 255, 255],
        font: baseFont,
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.1,
    });

    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    if (finalY) {
      currentY = finalY + 10;
    } else {
      currentY += 20;
    }
  }

  if (articleEntries.length > 0) {
    if (currentY + 30 > pageHeight - 30) {
      doc.addPage();
      currentY = 30;
    }

    doc.setFont(baseFont, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
    doc.text('Artiklar', marginX, currentY);
    currentY += 6;

    const headRow = ['Artikelnummer', 'Storlek', ...filteredSpecLabels];
    const sortedArticleEntries = [...articleEntries].sort((a, b) => {
      const sizeComparison = compareSizeKeys(a.sizeSortKey, b.sizeSortKey);
      if (sizeComparison !== 0) {
        return sizeComparison;
      }

      if (a.packagingPriority !== b.packagingPriority) {
        return a.packagingPriority - b.packagingPriority;
      }

      if (a.packagingQuantity !== b.packagingQuantity) {
        return a.packagingQuantity - b.packagingQuantity;
      }

      const sizeTextComparison = a.size.localeCompare(b.size, 'sv-SE');
      if (sizeTextComparison !== 0) {
        return sizeTextComparison;
      }

      return a.articleNumber.localeCompare(b.articleNumber, 'sv-SE');
    });

    const tableBody = sortedArticleEntries.map((entry) => {
      const rowValues = filteredSpecLabels.map((label) => displayValue(entry.specMap.get(label)));
      return [displayValue(entry.articleNumber), entry.size, ...rowValues];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [headRow],
      body: tableBody,
      styles: {
        font: baseFont,
        fontStyle: 'normal',
        fontSize: 8,
        textColor,
        cellPadding: 1.8,
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [accentColor[0], accentColor[1], accentColor[2]],
        textColor: [255, 255, 255],
        font: baseFont,
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.1,
    });

    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    if (finalY) {
      currentY = finalY + 10;
    }
  }

  if (currentY > pageHeight - 30) {
    doc.addPage();
    currentY = 30;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, pageHeight - 26, pageWidth - marginX, pageHeight - 26);

  doc.setFont(baseFont, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const footerY = pageHeight - 16;
  contactDetails.forEach((line, index) => {
    doc.text(line, marginX, footerY + index * 5);
  });

  doc.save(createFilename(products));
}

export function normalizeArticleNumbers(raw: string): string[] {
  return raw
    .split(/[\n,;\t ]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

