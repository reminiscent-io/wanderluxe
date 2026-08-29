// Print Studio document renderer — pure presentation.
//
// Takes the AI design spec + the same trip data module the PDF export uses,
// and renders the keepsake document. Every itinerary item comes from the
// database via fetchPdfTripData, so the document is complete regardless of
// what the model wrote; the spec only styles and captions it.

import React from 'react';
import { BedDouble, Compass, UtensilsCrossed, Plane } from 'lucide-react';
import { fmtDate, fmtMoney } from '@/services/pdf/format';
import type { PdfTripData, Item } from '@/services/pdf/types';
import { getFontPairing, type PrintDesignSpec } from '@/lib/printDesign/spec';
import { MotifBand, MotifMark } from './motifs';
import './printDocument.css';

const ITEM_ICONS: Record<Item['type'], React.ComponentType<{ className?: string }>> = {
  accommodation: BedDouble,
  transportation: Plane,
  activity: Compass,
  dining: UtensilsCrossed,
};

interface PrintDocumentProps {
  design: PrintDesignSpec;
  data: PdfTripData;
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="pd-section-label">
    <span>{children}</span>
  </h2>
);

const PrintDocument: React.FC<PrintDocumentProps> = ({ design, data }) => {
  const pairing = getFontPairing(design.fontPairing);
  const { palette } = design;

  const styleVars = {
    '--pd-primary': palette.primary,
    '--pd-secondary': palette.secondary,
    '--pd-bg': palette.background,
    '--pd-surface': palette.surface,
    '--pd-ink': palette.ink,
    '--pd-muted': palette.muted,
    '--pd-accent': palette.accent,
    '--pd-display': pairing.display,
    '--pd-body': pairing.body,
  } as React.CSSProperties;

  const diningCount = data.days.reduce((n, d) => n + d.items.filter((i) => i.type === 'dining').length, 0);
  const activityCount = data.days.reduce((n, d) => n + d.items.filter((i) => i.type === 'activity').length, 0);

  const facts: Array<{ label: string; value: string }> = [
    { label: 'Days', value: String(data.days.length) },
    ...(data.stays.length ? [{ label: data.stays.length === 1 ? 'Stay' : 'Stays', value: String(data.stays.length) }] : []),
    ...(activityCount ? [{ label: 'Activities', value: String(activityCount) }] : []),
    ...(diningCount ? [{ label: 'Reservations', value: String(diningCount) }] : []),
    ...(data.transports.length ? [{ label: 'Journeys', value: String(data.transports.length) }] : []),
  ];

  const hasParticulars = data.stays.length > 0 || data.transports.length > 0 || data.diningRefs.length > 0;
  const hasLedger = data.budgetData.total > 0 || data.budgetData.budget != null;

  return (
    <article className="print-doc" style={styleVars} lang="en">
      <div className="pd-page">
        {/* ------------------------------------------------ cover */}
        <header className="pd-cover">
          <MotifBand motif={design.motif} height={16} className="pd-cover-band" />
          <p className="pd-eyebrow">WanderLuxe · Print Studio Edition</p>
          <h1 className="pd-cover-title">{design.cover.title}</h1>
          {design.cover.tagline && <p className="pd-cover-tagline">{design.cover.tagline}</p>}
          {design.cover.subtitle && (
            <div className="pd-cover-route">
              <span>{design.cover.subtitle}</span>
            </div>
          )}
          {data.dateRange && <p className="pd-cover-dates">{data.dateRange}</p>}
          {data.coverImageDataUri && (
            <figure className="pd-cover-photo">
              <img src={data.coverImageDataUri} alt={data.destination} />
            </figure>
          )}
          <div className="pd-cover-foot">
            <div className="pd-theme-plate">
              <strong>The {design.themeName} Edition</strong>
              {design.themeRationale && <em>{design.themeRationale}</em>}
            </div>
          </div>
        </header>

        {/* ------------------------------------------------ intro */}
        {design.intro && (
          <section className="pd-section pd-intro">
            <SectionLabel>Welcome</SectionLabel>
            <p>{design.intro}</p>
            {facts.length > 1 && (
              <dl className="pd-facts">
                {facts.map((f) => (
                  <div className="pd-fact" key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        )}

        {/* ------------------------------------------------ days */}
        <section className="pd-section">
          <SectionLabel>The Itinerary</SectionLabel>
          {data.days.map((day, i) => {
            const caption = design.dayCaptions[day.date];
            return (
              <section className="pd-day" key={day.date}>
                <header className="pd-day-head">
                  <span className="pd-day-num">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="pd-day-date">{fmtDate(day.date, 'EEEE · MMMM d')}</p>
                    {day.title && <p className="pd-day-title">{day.title}</p>}
                  </div>
                  {caption && <p className="pd-day-caption">{caption}</p>}
                </header>
                {day.description && <p className="pd-day-desc">{day.description}</p>}
                {day.items.length > 0 ? (
                  <div className="pd-items">
                    {day.items.map((item, j) => {
                      const Icon = ITEM_ICONS[item.type];
                      return (
                        <div className="pd-item" key={`${day.date}-${j}`}>
                          <span className="pd-item-icon"><Icon /></span>
                          <span className="pd-item-time">{item.time}</span>
                          <div className="pd-item-body">
                            <div className="pd-item-title-row">
                              <span className="pd-item-title">{item.title}</span>
                              {item.cost && <span className="pd-item-cost">{item.cost}</span>}
                            </div>
                            {item.details && <p className="pd-item-details">{item.details}</p>}
                            {item.location && <p className="pd-item-location">{item.location}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="pd-day-empty">An open day — no plans yet, and that is the point.</p>
                )}
              </section>
            );
          })}
        </section>

        {/* ------------------------------------------------ particulars */}
        {hasParticulars && (
          <section className="pd-section pd-break-before">
            <SectionLabel>The Particulars</SectionLabel>

            {data.stays.length > 0 && (
              <table className="pd-table" style={{ marginBottom: '2rem' }}>
                <thead>
                  <tr>
                    <th>Stay</th>
                    <th>Dates</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stays.map((s, i) => (
                    <tr key={`${s.hotel}-${i}`}>
                      <td>{s.hotel}{s.phone ? <div className="pd-cell-muted">{s.phone}</div> : null}</td>
                      <td className="pd-cell-num">{s.checkIn} – {s.checkOut}</td>
                      <td className="pd-cell-muted">{s.address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {data.transports.length > 0 && (
              <table className="pd-table" style={{ marginBottom: '2rem' }}>
                <thead>
                  <tr>
                    <th>Journey</th>
                    <th>Date</th>
                    <th>Confirmation</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transports.map((t, i) => (
                    <tr key={`${t.from}-${t.to}-${i}`}>
                      <td>{t.type}: {t.from} → {t.to}</td>
                      <td className="pd-cell-num">{t.date}</td>
                      <td>{t.confirmationNumber ? <span className="pd-confirmation">{t.confirmationNumber}</span> : <span className="pd-cell-muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {data.diningRefs.length > 0 && (
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Reservation</th>
                    <th>Confirmation</th>
                  </tr>
                </thead>
                <tbody>
                  {data.diningRefs.map((r, i) => (
                    <tr key={`${r.restaurant}-${i}`}>
                      <td>{r.restaurant}</td>
                      <td>{r.confirmationNumber ? <span className="pd-confirmation">{r.confirmationNumber}</span> : <span className="pd-cell-muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* ------------------------------------------------ ledger */}
        {hasLedger && (
          <section className="pd-section">
            <SectionLabel>The Ledger</SectionLabel>
            {data.budgetData.categories.map((c) => (
              <div className="pd-ledger-row" key={c.category}>
                <span>{c.category}</span>
                <span className="pd-leader" />
                <span className="pd-ledger-amount">{fmtMoney(c.amount)}</span>
              </div>
            ))}
            <div className="pd-ledger-row pd-ledger-total">
              <span>Planned spend</span>
              <span className="pd-leader" />
              <span className="pd-ledger-amount">{fmtMoney(data.budgetData.total)}</span>
            </div>
            {data.budgetData.budget != null && (
              <p className="pd-ledger-note">
                Against a trip budget of {fmtMoney(data.budgetData.budget)}.
              </p>
            )}
          </section>
        )}

        {/* ------------------------------------------------ closing */}
        <footer className="pd-closing">
          <div className="pd-closing-mark">
            <MotifMark motif={design.motif} size={44} />
          </div>
          <p className="pd-closing-line">{design.closing}</p>
          <p className="pd-credit">Made with WanderLuxe · wanderluxe.io</p>
        </footer>
      </div>
    </article>
  );
};

export default PrintDocument;
