/**
 * filegen MCP server — 把「生成 PDF / PPT / Excel / Word」做成 MCP 工具
 *
 * 跑法：node server.mjs
 * 扩展里填：http://127.0.0.1:8950/mcp
 *
 * 每个工具返回一段 JSON，里面带文件的 base64；扩展收到后自己下载，
 * 这样才能拿到 downloadId，支持「打开文件夹 / 默认应用打开 / 另存为」。
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { renderPdf } from './chrome-pdf.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import PptxGenJS from 'pptxgenjs';
import ExcelJS from 'exceljs';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType
} from 'docx';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.FILEGEN_PORT || 8950);

/* ── 中文字体 ─────────────────────────────────────────── */
const FONT_CANDIDATES = [
  '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  '/Library/Fonts/Arial Unicode.ttf'
];
const FONT_PATH = FONT_CANDIDATES.find((p) => existsSync(p));
let FONT_BYTES = null;
if (FONT_PATH) FONT_BYTES = readFileSync(FONT_PATH);

/* ── 通用 ─────────────────────────────────────────────── */

function baseName(name, ext) {
  const s = String(name || '文档').replace(/[\\/:*?"<>|\n\r]/g, '_').trim() || '文档';
  return /\.(pdf|pptx|xlsx|docx)$/i.test(s) ? s : `${s}.${ext}`;
}

function parseSpec(args) {
  const title = String(args.title || '文档');
  let sections = Array.isArray(args.sections) ? args.sections : [];
  if (!sections.length && args.content) {
    sections = [{ heading: title, body: String(args.content) }];
  }
  return { title, sections };
}

function fileResult(name, mime, buffer) {
  return {
    name,
    mime,
    size: buffer.length,
    b64: buffer.toString('base64')
  };
}

/* ── PDF ──────────────────────────────────────────────── */

function wrapText(text, font, size, maxW) {
  const out = [];
  for (const para of String(text == null ? '' : text).split('\n')) {
    let cur = '';
    for (const ch of Array.from(para)) {
      const next = cur + ch;
      if (font.widthOfTextAtSize(next, size) > maxW && cur) {
        out.push(cur);
        cur = ch;
      } else {
        cur = next;
      }
    }
    out.push(cur);
  }
  return out;
}

async function makePdf({ title, sections }) {
  if (!FONT_BYTES) throw new Error('找不到中文字体：' + FONT_CANDIDATES.join(' / '));

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(FONT_BYTES, { subset: true });

  const W = 595.28;
  const H = 841.89;
  const M = 56;
  const maxW = W - M * 2;
  const INK = rgb(0.11, 0.12, 0.15);
  const HEAD = rgb(0.10, 0.19, 0.34);
  const MUTED = rgb(0.52, 0.55, 0.60);
  const RULE = rgb(0.84, 0.86, 0.90);

  let page = doc.addPage([W, H]);
  let y = H - M;

  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  const need = (h) => { if (y - h < M) { newPage(); return true; } return false; };
  const put = (txt, x, size, color, dy) => {
    page.drawText(txt, { x, y: y - dy, size, font, color });
  };

  // 标题
  for (const line of wrapText(title, font, 22, maxW)) {
    need(30);
    put(line, M, 22, INK, 22);
    y -= 30;
  }
  y -= 4;

  for (const sec of sections) {
    if (sec.heading) {
      need(34);
      y -= 8;
      for (const line of wrapText(sec.heading, font, 15, maxW)) {
        need(24);
        put(line, M, 15, HEAD, 15);
        y -= 22;
      }
      y -= 4;
    }

    if (sec.body) {
      const flat = String(sec.body).replace(/\n{3,}/g, '\n\n');
      for (const para of flat.split('\n')) {
        if (!para.trim()) { y -= 8; continue; }
        for (const line of wrapText(para, font, 11, maxW)) {
          need(19);
          put(line, M, 11, INK, 11);
          y -= 19;
        }
      }
      y -= 4;
    }

    for (const b of sec.bullets || []) {
      const lines = wrapText('· ' + b, font, 11, maxW - 12);
      for (const [i, line] of lines.entries()) {
        need(19);
        put(line, M + 6 + (i ? 8 : 0), 11, INK, 11);
        y -= 19;
      }
    }

    if (sec.table && Array.isArray(sec.table.rows) && sec.table.rows.length) {
      const cols = sec.table.columns || Object.keys(sec.table.rows[0]);
      const colW = maxW / cols.length;
      const rowH = 22;

      const clip = (v, size) => {
        let t = String(v == null ? '' : v);
        while (t && font.widthOfTextAtSize(t, size) > colW - 10) t = t.slice(0, -1);
        return t;
      };
      const rule = () => {
        page.drawLine({ start: { x: M, y: y - 18 }, end: { x: M + maxW, y: y - 18 }, thickness: 0.5, color: RULE });
        y -= rowH;
      };
      const drawHead = () => {
        cols.forEach((c, i) => put(clip(c, 10), M + i * colW + 5, 10, HEAD, 13));
        rule();
      };
      const drawRow = (cells) => {
        cells.forEach((c, i) => put(clip(c, 10), M + i * colW + 5, 10, INK, 13));
        rule();
      };

      y -= 2;
      need(rowH);
      drawHead();
      for (const r of sec.table.rows) {
        const rowArr = Array.isArray(r) ? r : cols.map((c) => r[c]);
        if (need(rowH)) drawHead();
        drawRow(rowArr);
      }
      y -= 6;
    }
  }

  // 页脚页码
  const pages = doc.getPages();
  const total = pages.length;
  pages.forEach((p, i) => {
    const label = `${i + 1} / ${total}`;
    const w = font.widthOfTextAtSize(label, 9);
    p.drawText(label, { x: (W - w) / 2, y: 30, size: 9, font, color: MUTED });
  });

  return Buffer.from(await doc.save());
}

/* ── PPTX ─────────────────────────────────────────────── */

async function makePptx({ title, sections }) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Chrome Agent';
  pptx.title = title;

  const FONT = 'PingFang SC';

  const cover = pptx.addSlide();
  cover.background = { color: 'F5F7FB' };
  cover.addText(title, {
    x: 0.6, y: 2.1, w: 8.8, h: 1.2,
    fontSize: 34, bold: true, color: '1F2937', fontFace: FONT, align: 'center'
  });

  for (const sec of sections) {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };
    slide.addText(sec.heading || title, {
      x: 0.5, y: 0.35, w: 9, h: 0.7,
      fontSize: 24, bold: true, color: '1F3A5F', fontFace: FONT
    });

    let cursor = 1.15;

    if (sec.body) {
      slide.addText(String(sec.body), {
        x: 0.55, y: cursor, w: 8.9, h: 1.2,
        fontSize: 14, color: '374151', fontFace: FONT, valign: 'top'
      });
      cursor += 1.3;
    }

    if (sec.bullets && sec.bullets.length) {
      slide.addText(
        sec.bullets.map((b) => ({ text: String(b), options: { bullet: true } })),
        { x: 0.7, y: cursor, w: 8.6, h: 2.8, fontSize: 14, color: '374151', fontFace: FONT, valign: 'top' }
      );
      cursor += 2.9;
    }

    if (sec.table && Array.isArray(sec.table.rows) && sec.table.rows.length) {
      const cols = sec.table.columns || Object.keys(sec.table.rows[0]);
      const rows = [
        cols.map((c) => ({ text: String(c), options: { bold: true, fill: 'E8EEF8', color: '1F3A5F' } })),
        ...sec.table.rows.map((r) =>
          (Array.isArray(r) ? r : cols.map((c) => r[c])).map((v) => ({ text: String(v == null ? '' : v) }))
        )
      ];
      slide.addTable(rows, {
        x: 0.55, y: Math.min(cursor, 4.6), w: 8.9,
        fontSize: 11, fontFace: FONT, border: { type: 'solid', color: 'D5DCE8', pt: 1 },
        color: '374151', valign: 'middle'
      });
    }
  }

  const buf = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.from(buf);
}

/* ── XLSX ─────────────────────────────────────────────── */

async function makeXlsx(args) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Chrome Agent';

  const sheets = Array.isArray(args.sheets) && args.sheets.length
    ? args.sheets
    : [{ name: 'Sheet1', columns: args.columns || [], rows: args.rows || [] }];

  for (const [i, s] of sheets.entries()) {
    const ws = wb.addWorksheet(String(s.name || `Sheet${i + 1}`));
    const cols = s.columns || (s.rows && s.rows[0] ? Object.keys(s.rows[0]) : []);
    if (cols.length) {
      ws.columns = cols.map((c) => ({
        header: String(c),
        key: String(c),
        width: Math.max(12, Math.min(40, String(c).length * 2 + 6))
      }));
      ws.getRow(1).font = { bold: true, color: { argb: 'FF1F3A5F' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF8' } };
    }
    for (const r of s.rows || []) {
      if (Array.isArray(r)) ws.addRow(r);
      else ws.addRow(cols.map((c) => r[c]));
    }
    ws.eachRow((row) => {
      row.alignment = { vertical: 'middle', wrapText: false };
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/* ── DOCX ─────────────────────────────────────────────── */

async function makeDocx({ title, sections }) {
  const children = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    })
  ];

  for (const sec of sections) {
    if (sec.heading) {
      children.push(new Paragraph({ text: String(sec.heading), heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 120 } }));
    }
    if (sec.body) {
      for (const line of String(sec.body).split('\n')) {
        children.push(new Paragraph({ children: [new TextRun({ text: line, size: 22 })], spacing: { after: 80 } }));
      }
    }
    for (const b of sec.bullets || []) {
      children.push(new Paragraph({ text: String(b), bullet: { level: 0 }, spacing: { after: 60 } }));
    }
    if (sec.table && Array.isArray(sec.table.rows) && sec.table.rows.length) {
      const cols = sec.table.columns || Object.keys(sec.table.rows[0]);
      const rows = [
        new TableRow({
          tableHeader: true,
          children: cols.map((c) => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(c), bold: true })] })]
          }))
        }),
        ...sec.table.rows.map((r) => {
          const cells = Array.isArray(r) ? r : cols.map((c) => r[c]);
          return new TableRow({
            children: cells.map((v) => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(v == null ? '' : v) })] })]
            }))
          });
        })
      ];
      children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      children.push(new Paragraph({ text: '', spacing: { after: 160 } }));
    }
  }

  const doc = new Document({ creator: 'Chrome Agent', sections: [{ children }] });
  const buf = await Packer.toBuffer(doc);
  return Buffer.from(buf);
}

/* ── 工具定义 ─────────────────────────────────────────── */

const SEC = {
  type: 'object',
  properties: {
    heading: { type: 'string', description: '小节标题' },
    body: { type: 'string', description: '正文段落，可含换行' },
    bullets: { type: 'array', items: { type: 'string' }, description: '要点列表' },
    table: {
      type: 'object',
      properties: {
        columns: { type: 'array', items: { type: 'string' } },
        rows: { type: 'array', items: {} }
      }
    }
  }
};

const TOOLS = [
  {
    name: 'gen_pdf',
    description: '把结构化内容生成 PDF 文件，生成后会在对话里出现文件卡片，用户可打开/另存。',
    inputSchema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: '文件名，可不带扩展名' },
        title: { type: 'string' },
        sections: { type: 'array', items: SEC }
      },
      required: ['title']
    }
  },
  {
    name: 'gen_pptx',
    description: '把结构化内容生成 PPT（每节一页），生成后出现文件卡片。',
    inputSchema: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
        title: { type: 'string' },
        sections: { type: 'array', items: SEC }
      },
      required: ['title']
    }
  },
  {
    name: 'gen_xlsx',
    description: '把表格数据生成 Excel 文件。传 sheets（可多工作表）或 columns+rows。',
    inputSchema: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
        sheets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              columns: { type: 'array', items: { type: 'string' } },
              rows: { type: 'array', items: {} }
            }
          }
        },
        columns: { type: 'array', items: { type: 'string' } },
        rows: { type: 'array', items: {} }
      }
    }
  },
  {
    name: 'gen_docx',
    description: '把结构化内容生成 Word 文件，生成后出现文件卡片。',
    inputSchema: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
        title: { type: 'string' },
        sections: { type: 'array', items: SEC }
      },
      required: ['title']
    }
  }
];

async function callTool(name, args) {
  args = args || {};
  const spec = {
    title: String(args.title || args.filename || '文档'),
    sections: Array.isArray(args.sections) ? args.sections : []
  };

  if (name === 'gen_pdf') {
    let buf;
    try {
      buf = await renderPdf(spec);
    } catch (e) {
      console.warn('[gen_pdf] Chrome 排版失败，回退 pdf-lib：', e.message);
      buf = await makePdf(spec);
    }
    return fileResult(baseName(args.filename || spec.title, 'pdf'), 'application/pdf', buf);
  }
  if (name === 'gen_pptx') {
    const buf = await makePptx(spec);
    return fileResult(
      baseName(args.filename || spec.title, 'pptx'),
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      buf
    );
  }
  if (name === 'gen_xlsx') {
    const buf = await makeXlsx(args);
    return fileResult(
      baseName(args.filename || '表格', 'xlsx'),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buf
    );
  }
  if (name === 'gen_docx') {
    const buf = await makeDocx(spec);
    return fileResult(
      baseName(args.filename || spec.title, 'docx'),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buf
    );
  }
  throw new Error('未知工具: ' + name);
}

/* ── HTTP ─────────────────────────────────────────────── */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id'
};

const server = createServer((req, res) => {
  const send = (code, obj) => {
    const body = JSON.stringify(obj);
    res.writeHead(code, { ...CORS, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
    res.end(body);
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }

  if (req.method === 'GET') {
    return send(200, {
      name: 'filegen',
      version: '1.0.0',
      tools: TOOLS.map((t) => t.name),
      note: 'POST JSON-RPC 2.0 到这个地址'
    });
  }

  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    let j;
    try { j = JSON.parse(body || '{}'); } catch { return send(400, { error: 'invalid json' }); }

    const id = j.id;
    try {
      if (j.method === 'initialize') {
        return send(200, {
          jsonrpc: '2.0', id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'filegen', version: '1.0.0' }
          }
        });
      }
      if (j.method === 'notifications/initialized') {
        return send(200, { jsonrpc: '2.0', id, result: {} });
      }
      if (j.method === 'tools/list') {
        return send(200, { jsonrpc: '2.0', id, result: { tools: TOOLS } });
      }
      if (j.method === 'tools/call') {
        const name = j.params?.name;
        const args = j.params?.arguments || {};
        const file = await callTool(name, args);
        const human = `已生成 ${file.name}（${(file.size / 1024).toFixed(1)} KB）。文件卡片已显示在对话里，用户可以直接打开或另存。`;
        return send(200, {
          jsonrpc: '2.0', id,
          result: {
            content: [
              { type: 'text', text: human },
              { type: 'text', text: 'FILE_JSON:' + JSON.stringify(file) }
            ]
          }
        });
      }
      return send(200, { jsonrpc: '2.0', id, error: { code: -32601, message: 'no method: ' + j.method } });
    } catch (e) {
      return send(200, {
        jsonrpc: '2.0', id,
        error: { code: -32000, message: String(e?.message || e) }
      });
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`filegen MCP → http://127.0.0.1:${PORT}/mcp`);
  console.log('字体:', FONT_PATH || '(未找到中文字体，PDF 会失败)');
  console.log('工具:', TOOLS.map((t) => t.name).join(', '));
});
