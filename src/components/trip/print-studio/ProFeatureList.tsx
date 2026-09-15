// What Pro buys, in words. Now the Studio section's fallback: the preview
// shows this instead of an error when a trip's data cannot be loaded, because
// an upsell that looks broken is worse than an upsell that only tells.

import React from 'react';
import { Check } from 'lucide-react';

export const PRO_FEATURES = [
  'A custom theme designed for each trip',
  'Every activity, stay, and reservation included',
  'Every line of copy is yours to rewrite',
  'Print it, or save it as a PDF',
  'Cancel anytime',
];

const ProFeatureList: React.FC = () => (
  <div className="rounded-card border border-border bg-sand-50 p-4">
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <span className="text-base font-semibold text-foreground">WanderLuxe Pro</span>
      <span className="shrink-0 text-sm text-muted-foreground">
        <span className="text-lg font-semibold tabular-nums text-foreground">$3.99</span> / month
      </span>
    </div>
    <ul className="m-0 list-none space-y-2 p-0">
      {PRO_FEATURES.map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm text-earth-600">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default ProFeatureList;
