// Minimal single-page PDF generator, no dependencies. parse-travel-doc only
// accepts image/* or application/pdf uploads, so text fixtures get wrapped in
// a real PDF. Helvetica with WinAnsiEncoding covers the latin-1 range (French
// accents); anything outside latin-1 is replaced so xref byte offsets stay
// equal to latin1 string offsets.

function toLatin1(text: string): string {
  // Map common typographic characters into latin-1, replace the rest.
  return text
    .replace(/[—–]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x00-\xFF]/g, '?');
}

function escapePdfText(line: string): string {
  return line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function textToPdf(text: string): Buffer {
  // 45 lines at 16pt leading fits A4 with margins; fixtures must stay short
  // because Gemini reads the rendered page, not overflowed off-page text.
  const lines = toLatin1(text).split('\n').slice(0, 45);

  const ops = ['BT', '/F1 12 Tf', '16 TL', '50 780 Td'];
  lines.forEach((line, i) => {
    if (i > 0) ops.push('T*');
    ops.push(`(${escapePdfText(line)}) Tj`);
  });
  ops.push('ET');
  const stream = ops.join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}
