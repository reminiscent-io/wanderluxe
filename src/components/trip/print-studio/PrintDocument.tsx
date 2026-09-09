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

// The icon ring is the only thing that says what kind of item this is, so the
// same distinction has to reach a screen reader as words.
const ITEM_TYPE_LABELS: Record<Item['type'], string> = {
  accommodation: 'Stay',
  transportation: 'Journey',
  activity: 'Activity',
  dining: 'Reservation',
};

/**
 * Wraps one editable copy slot. Defaults to plain text, so the printed path
 * and the read-only path stay exactly what they were — editing is something
 * the page opts into, not something the document knows about.
 */
export type CopyRenderer = (key: string, value: string) => React.ReactNode;

interface PrintDocumentProps {
  design: PrintDesignSpec;
  data: PdfTripData;
  renderCopy?: CopyRenderer;
  /**
   * Reveal optional slots that are currently empty. Without this an edition
   * whose tagline the model left blank would have nowhere to type one.
   */
  isEditing?: boolean;
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="pd-section-label">
    <span>{children}</span>
  </h2>
);

const PrintDocument: React.FC<PrintDocumentProps> = ({ design, data, renderCopy, isEditing }) => {
  const copy: CopyRenderer = renderCopy ?? ((_key, value) => value);
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
          <h1 className="pd-cover-title">{copy('cover.title', design.cover.title)}</h1>
          {(design.cover.tagline || isEditing) && (
            <p className="pd-cover-tagline">{copy('cover.tagline', design.cover.tagline)}</p>
          )}
          {(design.cover.subtitle || isEditing) && (
            <div className="pd-cover-route">
              <span>{copy('cover.subtitle', design.cover.subtitle)}</span>
            </div>
          )}
          {data.dateRange && <p className="pd-cover-dates">{data.dateRange}</p>}
          {data.coverImageDataUri && (
            <figure className="pd-cover-photo">
              <img
                src={data.coverImageDataUri}
                alt={data.destination ? `Photograph of ${data.destination}` : ''}
              />
            </figure>
          )}
          <div className="pd-cover-foot">
            <div className="pd-theme-plate">
              <strong>The {copy('themeName', design.themeName)} Edition</strong>
              {(design.themeRationale || isEditing) && (
                <em>{copy('themeRationale', design.themeRationale)}</em>
              )}
            </div>
          </div>
        </header>

        {/* ------------------------------------------------ intro */}
        {(design.intro || isEditing) && (
          <section className="pd-section pd-intro">
            <SectionLabel>Welcome</SectionLabel>
            <p>{copy('intro', design.intro)}</p>
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
                  {(caption || isEditing) && (
                    <p className="pd-day-caption">{copy(`day.${day.date}`, caption ?? '')}</p>
                  )}
                </header>
                {day.description && <p className="pd-day-desc">{day.description}</p>}
                {day.items.length > 0 ? (
                  <div className="pd-items">
                    {day.items.map((item, j) => {
                      const Icon = ITEM_ICONS[item.type];
                      return (
                        <div className="pd-item" key={`${day.date}-${j}`}>
                          <span className="pd-item-icon">
                            <span className="pd-sr-only">{ITEM_TYPE_LABELS[item.type]}</span>
                            <Icon aria-hidden />
                          </span>
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
              <table className="pd-table">
                <caption className="pd-sr-only">Where you are staying</caption>
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
              <table className="pd-table">
                <caption className="pd-sr-only">Flights and other journeys</caption>
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
                <caption className="pd-sr-only">Dining reservations</caption>
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
          <p className="pd-closing-line">{copy('closing', design.closing)}</p>
          <p className="pd-credit">Made with WanderLuxe · wanderluxe.io</p>
        </footer>
      </div>
    </article>
  );
};

export default PrintDocument;
