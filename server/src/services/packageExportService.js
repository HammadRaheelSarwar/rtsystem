import ExcelJS from 'exceljs';
import {
  AlignmentType,
  BorderStyle,
  Document as WordDocument,
  Footer,
  Header,
  HeadingLevel,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from 'docx';
import {
  Inquiry,
  InquiryTakingForm,
  JobInquiryForm,
  DesignWeightSummary,
  CostingSheet,
  CommercialProposal,
  TechnicalProposal,
  ProposalDrawing
} from '../models/index.js';
import { AppError } from '../utils/http.js';

const NAVY = '0F2744';
const BLUE = '0B76B7';
const LIGHT_BLUE = 'EAF4FB';
const LIGHT_BORDER = 'CBD5E1';
const HIDDEN_KEYS = new Set([
  '_id', 'id', '__v', 'save', 'createdAt', 'updatedAt', 'metadata',
  'password', 'passwordHash', 'refreshTokens', 'passwordResetToken',
  'passwordResetExpires', 'isDeleted', 'deletedAt'
]);

const plain = value => value == null ? value : JSON.parse(JSON.stringify(value, (key, item) =>
  HIDDEN_KEYS.has(key) || typeof item === 'function' ? undefined : item
));

export const humanize = key => String(key || '')
  .replace(/[_-]+/g, ' ')
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/\b\w/g, letter => letter.toUpperCase());

const meaningful = value => value !== undefined && value !== null && value !== '';
const primitive = value => value === null || ['string', 'number', 'boolean'].includes(typeof value);

export function packageSections(data) {
  return [
    ['Inquiry & Client', { ...plain(data.inquiry), client: plain(data.inquiry?.client) }],
    ['Inquiry Taking Form (ITF)', plain(data.itf)],
    ['Job Inquiry Form (JIF)', plain(data.jif)],
    ['Design Weight Summary (DWS)', plain(data.dws)],
    ['Costing Sheet', plain(data.costing)],
    ['Commercial Proposal', plain(data.commercial)],
    ['Technical Proposal', plain(data.technical)],
    ['Proposal Drawings', plain(data.drawings || [])]
  ];
}

export async function loadPackageData(inquiryId) {
  const inquiry = await Inquiry.findById(inquiryId).populate('client');
  if (!inquiry) throw new AppError('Inquiry not found', 404);
  const revision = inquiry.packageLocked && inquiry.approvedRevision != null
    ? inquiry.approvedRevision
    : inquiry.revisionNumber;
  const filter = { inquiry: inquiry._id, revision };
  const [itf, jif, dws, costing, commercial, technical, drawings] = await Promise.all([
    InquiryTakingForm.findOne({ inquiry: inquiry._id }),
    JobInquiryForm.findOne(filter),
    DesignWeightSummary.findOne(filter),
    CostingSheet.findOne(filter),
    CommercialProposal.findOne(filter),
    TechnicalProposal.findOne(filter),
    ProposalDrawing.find(filter).populate('document').sort({ drawingNumber: 1, revision: -1 })
  ]);
  return { inquiry, revision, itf, jif, dws, costing, commercial, technical, drawings };
}

function displayValue(value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (!meaningful(value)) return '—';
  if (typeof value === 'number') return value;
  if (/^\d{4}-\d{2}-\d{2}T/.test(String(value))) {
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf())) return date.toISOString().slice(0, 10);
  }
  return String(value);
}

function objectEntries(value) {
  return Object.entries(value || {}).filter(([key, item]) => !HIDDEN_KEYS.has(key) && meaningful(item));
}

function excelTitle(sheet, title, subtitle) {
  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = title;
  sheet.getCell('A1').font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
  sheet.getCell('A1').alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 32;
  sheet.mergeCells('A2:D2');
  sheet.getCell('A2').value = subtitle;
  sheet.getCell('A2').font = { name: 'Arial', size: 10, color: { argb: 'FF475569' } };
  sheet.getRow(2).height = 22;
}

function styleExcelSection(row) {
  row.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BLUE}` } };
  row.alignment = { vertical: 'middle' };
  row.height = 22;
}

function appendExcelObject(sheet, title, value, startRow) {
  let rowNumber = startRow;
  sheet.mergeCells(rowNumber, 1, rowNumber, 4);
  sheet.getCell(rowNumber, 1).value = title;
  styleExcelSection(sheet.getRow(rowNumber));
  rowNumber += 1;

  const scalars = objectEntries(value).filter(([, item]) => primitive(item));
  for (const [key, item] of scalars) {
    sheet.getCell(rowNumber, 1).value = humanize(key);
    sheet.getCell(rowNumber, 2).value = displayValue(item);
    sheet.mergeCells(rowNumber, 2, rowNumber, 4);
    sheet.getCell(rowNumber, 1).font = { name: 'Arial', bold: true, color: { argb: `FF${NAVY}` } };
    sheet.getCell(rowNumber, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${LIGHT_BLUE}` } };
    sheet.getCell(rowNumber, 2).alignment = { wrapText: true, vertical: 'top' };
    rowNumber += 1;
  }

  for (const [key, item] of objectEntries(value).filter(([, nested]) => !primitive(nested))) {
    if (Array.isArray(item)) rowNumber = appendExcelArray(sheet, humanize(key), item, rowNumber);
    else rowNumber = appendExcelObject(sheet, humanize(key), item, rowNumber);
  }
  return rowNumber + 1;
}

function appendExcelArray(sheet, title, values, startRow) {
  let rowNumber = startRow;
  sheet.mergeCells(rowNumber, 1, rowNumber, 4);
  sheet.getCell(rowNumber, 1).value = title;
  styleExcelSection(sheet.getRow(rowNumber));
  rowNumber += 1;
  if (!values.length) {
    sheet.getCell(rowNumber, 1).value = 'No records';
    return rowNumber + 2;
  }
  if (values.every(primitive)) {
    values.forEach(item => { sheet.getCell(rowNumber++, 1).value = displayValue(item); });
    return rowNumber + 1;
  }
  const keys = [...new Set(values.flatMap(item => objectEntries(item).filter(([, nested]) => primitive(nested)).map(([key]) => key)))];
  const usable = keys.slice(0, 12);
  usable.forEach((key, index) => { sheet.getCell(rowNumber, index + 1).value = humanize(key); });
  const header = sheet.getRow(rowNumber++);
  header.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
  values.forEach(item => {
    usable.forEach((key, index) => { sheet.getCell(rowNumber, index + 1).value = displayValue(item?.[key]); });
    sheet.getRow(rowNumber).alignment = { wrapText: true, vertical: 'top' };
    rowNumber += 1;
  });
  values.forEach((item, index) => {
    for (const [key, nested] of objectEntries(item).filter(([, child]) => !primitive(child))) {
      const nestedTitle = `${title} ${index + 1} — ${humanize(key)}`;
      rowNumber = Array.isArray(nested)
        ? appendExcelArray(sheet, nestedTitle, nested, rowNumber)
        : appendExcelObject(sheet, nestedTitle, nested, rowNumber);
    }
  });
  return rowNumber + 1;
}

export async function buildPackageWorkbook(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RT Inquiry & Proposal Management System';
  workbook.created = new Date();
  for (const [sectionName, value] of packageSections(data)) {
    const sheetName = sectionName
      .replace('Inquiry Taking Form (ITF)', 'ITF')
      .replace('Job Inquiry Form (JIF)', 'JIF')
      .replace('Design Weight Summary (DWS)', 'DWS')
      .slice(0, 31);
    const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 2, showGridLines: false }] });
    excelTitle(sheet, sectionName, `${data.inquiry?.inquiryNumber || 'Inquiry'} • Revision R${data.revision ?? 0}`);
    if (Array.isArray(value)) appendExcelArray(sheet, sectionName, value, 4);
    else appendExcelObject(sheet, sectionName, value || {}, 4);
    sheet.columns.forEach((column, index) => {
      let width = index === 0 ? 28 : 20;
      column.eachCell({ includeEmpty: false }, cell => {
        const length = String(cell.value ?? '').length;
        width = Math.min(45, Math.max(width, length + 2));
        cell.font = { name: 'Arial', ...(cell.font || {}) };
        cell.alignment = { vertical: 'top', wrapText: true, ...(cell.alignment || {}) };
      });
      column.width = width;
    });
    sheet.pageSetup = { orientation: sheet.columnCount > 6 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    sheet.pageMargins = { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.2, footer: 0.2 };
  }
  return workbook;
}

const wordBorders = {
  top: { style: BorderStyle.SINGLE, size: 2, color: LIGHT_BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: LIGHT_BORDER },
  left: { style: BorderStyle.SINGLE, size: 2, color: LIGHT_BORDER },
  right: { style: BorderStyle.SINGLE, size: 2, color: LIGHT_BORDER },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: LIGHT_BORDER },
  insideVertical: { style: BorderStyle.SINGLE, size: 2, color: LIGHT_BORDER }
};

function wordCell(text, options = {}) {
  return new TableCell({
    width: { size: options.width || 4680, type: WidthType.DXA },
    shading: options.fill ? { fill: options.fill } : undefined,
    margins: { top: 100, right: 120, bottom: 100, left: 120 },
    children: [new Paragraph({
      spacing: { after: 0 },
      children: [new TextRun({ text: String(displayValue(text)), bold: options.bold, color: options.color, size: options.size || 18, font: 'Arial' })]
    })]
  });
}

function wordKeyValueTable(value) {
  const rows = objectEntries(value)
    .filter(([, item]) => primitive(item))
    .map(([key, item]) => new TableRow({ children: [
      wordCell(humanize(key), { bold: true, fill: LIGHT_BLUE, width: 3000, color: NAVY }),
      wordCell(item, { width: 6360 })
    ] }));
  if (!rows.length) rows.push(new TableRow({ children: [wordCell('No data available', { width: 9360 })] }));
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [3000, 6360], borders: wordBorders, rows });
}

function wordArrayTable(values) {
  if (!values.length) return wordKeyValueTable({ status: 'No records' });
  if (values.every(primitive)) return wordKeyValueTable(Object.fromEntries(values.map((item, index) => [`Item ${index + 1}`, item])));
  const keys = [...new Set(values.flatMap(item => objectEntries(item).filter(([, nested]) => primitive(nested)).map(([key]) => key)))].slice(0, 8);
  if (!keys.length) return wordKeyValueTable({ status: 'No printable fields' });
  const width = Math.floor(9360 / keys.length);
  const rows = [new TableRow({ tableHeader: true, children: keys.map(key => wordCell(humanize(key), { bold: true, fill: NAVY, color: 'FFFFFF', width })) })];
  values.forEach(item => rows.push(new TableRow({ children: keys.map(key => wordCell(item?.[key], { width })) })));
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: keys.map(() => width), borders: wordBorders, rows });
}

function wordArrayBlocks(title, values, heading = HeadingLevel.HEADING_2) {
  const blocks = [wordArrayTable(values)];
  values.forEach((record, index) => {
    if (!record || primitive(record)) return;
    for (const [key, nested] of objectEntries(record).filter(([, child]) => !primitive(child))) {
      blocks.push(new Paragraph({ heading, children: [new TextRun(`${title} ${index + 1} — ${humanize(key)}`)] }));
      blocks.push(...(Array.isArray(nested) ? wordArrayBlocks(humanize(key), nested, HeadingLevel.HEADING_3) : wordNestedBlocks(nested, 2)));
    }
  });
  return blocks;
}

function wordNestedBlocks(value, depth = 1) {
  const blocks = [wordKeyValueTable(value || {})];
  for (const [key, item] of objectEntries(value).filter(([, nested]) => !primitive(nested))) {
    const heading = depth === 1 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
    blocks.push(new Paragraph({ heading, children: [new TextRun(humanize(key))] }));
    if (Array.isArray(item)) {
      blocks.push(...wordArrayBlocks(humanize(key), item, HeadingLevel.HEADING_3));
    } else blocks.push(...wordNestedBlocks(item, depth + 1));
  }
  return blocks;
}

function wordObjectBlocks(title, value) {
  return [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title)] }), ...wordNestedBlocks(value)];
}

export async function buildPackageDocument(data) {
  const children = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'GM INQUIRY & PROPOSAL PACKAGE', bold: true, size: 30, color: NAVY, font: 'Arial' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 260 }, children: [new TextRun({ text: `${data.inquiry?.inquiryNumber || 'Inquiry'} • Revision R${data.revision ?? 0}`, size: 20, color: BLUE, font: 'Arial' })] })
  ];
  for (const [title, value] of packageSections(data)) {
    children.push(...(Array.isArray(value)
      ? [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title)] }), ...wordArrayBlocks(title, value)]
      : wordObjectBlocks(title, value || {})));
  }
  const document = new WordDocument({
    creator: 'RT Inquiry & Proposal Management System',
    title: `${data.inquiry?.inquiryNumber || 'Inquiry'} GM Package`,
    styles: {
      default: { document: { run: { font: 'Arial', size: 18 }, paragraph: { spacing: { after: 80, line: 240 } } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: NAVY, font: 'Arial' }, paragraph: { spacing: { before: 260, after: 100 }, keepNext: true } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 21, bold: true, color: BLUE, font: 'Arial' }, paragraph: { spacing: { before: 180, after: 80 }, keepNext: true } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 18, bold: true, color: NAVY, font: 'Arial' }, paragraph: { spacing: { before: 140, after: 60 }, keepNext: true } }
      ]
    },
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 994, right: 1440, bottom: 1440, left: 1440, header: 400, footer: 500 } }
      },
      headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: 'RT INQUIRY', bold: true, color: NAVY, size: 18, font: 'Arial' }), new TextRun({ text: `   ${data.inquiry?.inquiryNumber || ''}`, color: BLUE, size: 18, font: 'Arial' })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Controlled GM review package  •  Page ', size: 16, color: '64748B', font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '64748B', font: 'Arial' }), new TextRun({ text: ' of ', size: 16, color: '64748B', font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '64748B', font: 'Arial' })] })] }) },
      children
    }]
  });
  return Packer.toBuffer(document);
}
