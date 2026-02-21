/**
 * Lazy font loader for PDF export.
 * Downloads DM Serif Display + DM Sans TTFs on first use,
 * converts to base64, and registers them with pdfmake.
 */
import pdfMake from 'pdfmake/build/pdfmake';

import dmSerifRegularUrl from '@/assets/fonts/pdf/DMSerifDisplay-Regular.ttf?url';
import dmSerifItalicUrl from '@/assets/fonts/pdf/DMSerifDisplay-Italic.ttf?url';
import dmSansRegularUrl from '@/assets/fonts/pdf/DMSans-Regular.ttf?url';
import dmSansItalicUrl from '@/assets/fonts/pdf/DMSans-Italic.ttf?url';
import dmSansMediumUrl from '@/assets/fonts/pdf/DMSans-Medium.ttf?url';
import dmSansMediumItalicUrl from '@/assets/fonts/pdf/DMSans-MediumItalic.ttf?url';

let fontsLoaded = false;

async function fetchAsBase64(url: string): Promise<string> {
  const resp = await fetch(url);
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function loadPdfFonts(): Promise<void> {
  if (fontsLoaded) return;

  const [
    serifRegular,
    serifItalic,
    sansRegular,
    sansItalic,
    sansMedium,
    sansMediumItalic,
  ] = await Promise.all([
    fetchAsBase64(dmSerifRegularUrl),
    fetchAsBase64(dmSerifItalicUrl),
    fetchAsBase64(dmSansRegularUrl),
    fetchAsBase64(dmSansItalicUrl),
    fetchAsBase64(dmSansMediumUrl),
    fetchAsBase64(dmSansMediumItalicUrl),
  ]);

  const vfs: Record<string, string> = {
    'DMSerifDisplay-Regular.ttf': serifRegular,
    'DMSerifDisplay-Italic.ttf': serifItalic,
    'DMSans-Regular.ttf': sansRegular,
    'DMSans-Italic.ttf': sansItalic,
    'DMSans-Medium.ttf': sansMedium,
    'DMSans-MediumItalic.ttf': sansMediumItalic,
  };

  // Register VFS and font families with pdfmake
  pdfMake.addVirtualFileSystem(vfs);
  pdfMake.addFonts({
    DMSerifDisplay: {
      normal: 'DMSerifDisplay-Regular.ttf',
      bold: 'DMSerifDisplay-Regular.ttf', // no bold variant; use regular
      italics: 'DMSerifDisplay-Italic.ttf',
      bolditalics: 'DMSerifDisplay-Italic.ttf',
    },
    DMSans: {
      normal: 'DMSans-Regular.ttf',
      bold: 'DMSans-Medium.ttf',
      italics: 'DMSans-Italic.ttf',
      bolditalics: 'DMSans-MediumItalic.ttf',
    },
  });

  fontsLoaded = true;
}
