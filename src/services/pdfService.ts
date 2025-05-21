import { jsPDF } from 'jspdf';
import puppeteer from 'puppeteer';
import { Itinerary, ItineraryData } from '@/types/itinerary';
import { tripDataToItinerary } from '@/utils/itineraryUtils';
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

// Get the template path - this needs to be loaded from the client
// We'll use an inline template approach instead for simplicity
const itineraryTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip Itinerary</title>
  <style>
    :root {
      --bg-sand-50: #faf7f4;
      --bg-sand-100: #f2ede6;
      --border-sand-100: #e9e2d8;
      --border-sand-200: #d6ccbd;
      --bg-earth-100: #e6dfd0;
      --text-foreground: #333333;
      --text-muted: #6b6b6b;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
      color: var(--text-foreground);
      background-color: white;
      line-height: 1.5;
      padding: 0;
      margin: 0;
    }
    
    .h1 {
      font-size: 2.25rem;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 0.5rem;
    }
    
    .h2 {
      font-size: 1.75rem;
      font-weight: 600;
      line-height: 1.3;
      margin-bottom: 0.5rem;
    }
    
    .h3 {
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.4;
    }
    
    .small {
      font-size: 0.875rem;
    }
    
    .muted {
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    
    .break-inside-avoid-page {
      break-inside: avoid-page;
    }
    
    .hero {
      padding: 2rem 1.5rem;
      margin-bottom: 2rem;
      background-color: var(--bg-sand-50);
    }
    
    .banner {
      width: 100%;
      height: 10rem;
      object-fit: cover;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
    }
    
    .day {
      position: relative;
      margin-top: 2.5rem;
      padding: 0 1.5rem;
      break-inside: avoid-page;
    }
    
    .timeline-container {
      display: grid;
      grid-template-columns: 25% 1fr;
      gap: 0.5rem;
      position: relative;
    }
    
    .timeline-rail {
      position: absolute;
      left: 25%;
      transform: translateX(-50%);
      top: 0;
      bottom: 0;
      width: 2px;
      background-color: var(--border-sand-200);
    }
    
    .item {
      position: relative;
      grid-column: span 2;
      display: flex;
      gap: 1rem;
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: 0.75rem;
      background-color: var(--bg-sand-50);
      border: 1px solid var(--border-sand-100);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
      break-inside: avoid-page;
    }
    
    .time {
      position: absolute;
      left: 0;
      transform: translateX(-110%);
      width: 20%;
      text-align: right;
    }
    
    .content {
      flex: 1;
    }
    
    .meta-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
      list-style: none;
    }
    
    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    
    .thumb {
      width: 6rem;
      height: 6rem;
      object-fit: cover;
      border-radius: 0.5rem;
      margin-left: auto;
    }
    
    @media print {
      .print-hidden {
        display: none !important;
      }
      
      .page-break {
        break-after: page;
      }
    }
  </style>
</head>
<body>
  <header class="hero">
    {{#if hero.bannerUrl}}
    <img src="{{hero.bannerUrl}}" alt="" class="banner print-hidden">
    {{/if}}
    <h1 class="h1">{{hero.title}}</h1>
    <p class="muted">{{hero.dateRange}}</p>
  </header>

  {{#each days}}
  <section class="day break-inside-avoid-page">
    <h2 class="h2">{{date}}</h2>
    
    <div class="timeline-container">
      <div class="timeline-rail"></div>
      
      {{#each items}}
      <article class="item">
        {{#if time}}
        <span class="time small muted">{{time}}</span>
        {{/if}}
        
        <div class="content">
          <h3 class="h3">{{title}}</h3>
          {{#if subtitle}}
          <p class="muted">{{subtitle}}</p>
          {{/if}}
          
          {{#if meta.length}}
          <ul class="meta-list small">
            {{#each meta}}
            <li class="meta-item">
              {{#if icon}}
              <span class="icon">{{icon}}</span>
              {{/if}}
              <span>{{label}}</span>
            </li>
            {{/each}}
          </ul>
          {{/if}}
        </div>
        
        {{#if thumb}}
        <img src="{{thumb}}" alt="" class="thumb print-hidden">
        {{/if}}
      </article>
      {{/each}}
    </div>
  </section>
  {{/each}}
</body>
</html>
`;

// Compile the template
const template = Handlebars.compile(itineraryTemplate);

/**
 * Generate PDF from trip itinerary data
 * @param data The trip itinerary data
 * @param options Options for PDF generation
 * @returns Promise resolving to PDF buffer
 */
export const generateItineraryPDF = async (
  data: ItineraryData,
  options: { plain?: boolean } = {}
): Promise<Buffer> => {
  try {
    // Convert trip data to itinerary format
    const itinerary: Itinerary = tripDataToItinerary(data);
    
    // Render HTML with the data
    const renderedHtml = template(itinerary);
    
    // Launch a headless browser
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set viewport to A4 size at 96 DPI
    await page.setViewport({ width: 794, height: 1123 });
    
    // Set content
    await page.setContent(renderedHtml, { waitUntil: 'networkidle0' });
    
    // Add style to hide images for plain PDF
    if (options.plain) {
      await page.addStyleTag({ content: '.print-hidden{display:none!important}' });
    }
    
    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
      printBackground: true
    });
    
    // Close the browser
    await browser.close();
    
    return pdf as Buffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};

/**
 * Get a unique filename for the PDF
 * @param destination Trip destination
 * @param plain Whether this is a plain PDF
 * @returns Filename string
 */
export const getPDFFilename = (destination: string, plain: boolean = false): string => {
  const prefix = plain ? 'plain' : 'visual';
  const safeName = destination.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14);
  
  return `${prefix}-${safeName}-itinerary-${timestamp}.pdf`;
};