// Rasterize one page of a PDF to a PNG, for scripts/build-print-showcase.ts.
//
//   swift scripts/pdf-page-to-png.swift <in.pdf> <out.png> <page> <scale>
//
// `sips` would be the obvious tool and needs no Xcode Command Line Tools, but
// it only ever converts page one, and page one of the itinerary export is the
// cover. CoreGraphics draws the page vectors straight into a bitmap at the
// requested scale, so a 2x render is genuinely sharp rather than an upscale.

import Foundation
import CoreGraphics
import ImageIO

let args = CommandLine.arguments

func fail(_ message: String) -> Never {
  FileHandle.standardError.write("pdf-page-to-png: \(message)\n".data(using: .utf8)!)
  exit(1)
}

guard args.count == 5 else { fail("usage: pdf-page-to-png.swift <in.pdf> <out.png> <page> <scale>") }
guard let pageNumber = Int(args[3]), let scaleArg = Double(args[4]), scaleArg > 0 else {
  fail("page must be an integer and scale a positive number")
}
guard let doc = CGPDFDocument(URL(fileURLWithPath: args[1]) as CFURL) else { fail("could not open \(args[1])") }
guard let page = doc.page(at: pageNumber) else {
  fail("page \(pageNumber) is out of range; the document has \(doc.numberOfPages)")
}

let box = page.getBoxRect(.mediaBox)
let scale = CGFloat(scaleArg)
let width = Int((box.width * scale).rounded())
let height = Int((box.height * scale).rounded())

guard let ctx = CGContext(
  data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
  space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
) else { fail("could not allocate a \(width)x\(height) bitmap") }

// The export draws on paper, not on transparency: lay down white first.
ctx.setFillColor(gray: 1, alpha: 1)
ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
ctx.scaleBy(x: scale, y: scale)
ctx.translateBy(x: -box.origin.x, y: -box.origin.y)
ctx.drawPDFPage(page)

guard let image = ctx.makeImage() else { fail("could not snapshot the bitmap") }
guard let dest = CGImageDestinationCreateWithURL(
  URL(fileURLWithPath: args[2]) as CFURL, "public.png" as CFString, 1, nil
) else { fail("could not write \(args[2])") }
CGImageDestinationAddImage(dest, image, nil)
guard CGImageDestinationFinalize(dest) else { fail("could not finalize \(args[2])") }

print("page \(pageNumber) of \(doc.numberOfPages) at \(width)x\(height)")
