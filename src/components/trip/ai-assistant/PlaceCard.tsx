import React, { useState } from 'react';
import { Star, MapPin, ExternalLink, Plus, Loader2, Check, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buildExpediaHotelSearchUrl, trackExpediaClick } from '@/lib/expedia';
import type { PlaceCard as PlaceCardType } from '@/types/ai-assistant';

type AddStatus = 'idle' | 'adding' | 'added';

interface PlaceCardProps {
  card: PlaceCardType;
  onAdd?: (card: PlaceCardType) => Promise<void>;
  compact?: boolean;
}

function priceLevelToDollars(level: number | undefined): string | null {
  if (typeof level !== 'number' || level < 1 || level > 4) return null;
  return '$'.repeat(level);
}

function formatRating(rating: number | undefined): string | null {
  if (typeof rating !== 'number') return null;
  return rating.toFixed(1);
}

const PlaceCard: React.FC<PlaceCardProps> = ({ card, onAdd, compact = false }) => {
  const [addStatus, setAddStatus] = useState<AddStatus>('idle');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const canAdd = !!card.suggested_add && !!onAdd;
  const bookingUrl = card.booking_url || card.website;
  const ratingStr = formatRating(card.rating);
  const priceStr = priceLevelToDollars(card.price_level);
  const isHotel = card.is_stay === true || card.suggested_add?.itemType === 'accommodation';
  const expediaUrl = isHotel
    ? buildExpediaHotelSearchUrl({
        name: card.name,
        address: card.address,
        pubref: 'ai_chat_hotel_card',
      })
    : null;

  const handleAdd = async () => {
    if (!canAdd || addStatus !== 'idle') return;
    setAddStatus('adding');
    try {
      await onAdd!(card);
      setAddStatus('added');
    } catch {
      setAddStatus('idle');
    }
  };

  return (
    <article
      className={cn(
        'flex flex-col rounded-card border border-border bg-background overflow-hidden shadow-warm-sm',
        compact ? 'w-[240px]' : 'w-[280px]',
        'flex-none snap-start'
      )}
    >
      {/* Photo */}
      <div className="relative aspect-[16/10] bg-sand-100">
        {card.photo_url && !imageFailed ? (
          <>
            {!imageLoaded && <div className="absolute inset-0 bg-grain bg-sand-100" />}
            <img
              src={card.photo_url}
              alt={card.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              className={cn(
                'h-full w-full object-cover img-warm transition-opacity duration-300',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
            />
            {/* Per Google TOS, photos must carry an attribution. */}
            <span className="absolute bottom-1 right-1.5 text-[10px] text-white/80 drop-shadow">
              Google
            </span>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sand-400">
            <MapPin className="h-8 w-8" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-display text-base text-earth-700 leading-tight tracking-tight line-clamp-2">
            {card.name}
          </h4>
        </div>

        {(ratingStr || priceStr) && (
          <div className="flex items-center gap-2 text-xs text-sand-600">
            {ratingStr && (
              <span className="inline-flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="font-medium tabular-nums text-earth-700">{ratingStr}</span>
              </span>
            )}
            {ratingStr && priceStr && <span className="text-sand-300">·</span>}
            {priceStr && <span className="font-medium tabular-nums text-earth-600">{priceStr}</span>}
          </div>
        )}

        {card.blurb && (
          <p className="text-xs leading-relaxed text-sand-700 line-clamp-3">{card.blurb}</p>
        )}

        {card.address && (
          <p className="mt-auto pt-1 text-[11px] text-sand-500 line-clamp-1" title={card.address}>
            {card.address}
          </p>
        )}

        {/* Actions */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {canAdd && (
            <Button
              size="sm"
              variant="default"
              onClick={handleAdd}
              disabled={addStatus !== 'idle'}
              className="h-8 flex-1 min-w-[96px] text-xs"
            >
              {addStatus === 'adding' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {addStatus === 'added' && <Check className="mr-1 h-3 w-3" />}
              {addStatus === 'idle' && <Plus className="mr-1 h-3 w-3" />}
              {addStatus === 'added' ? 'Added' : addStatus === 'adding' ? 'Adding…' : 'Add to trip'}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            asChild
            className="h-8 flex-none px-2 text-xs"
            title="Open in Google Maps"
          >
            <a href={card.maps_url} target="_blank" rel="noopener noreferrer">
              <MapPin className="h-3 w-3" />
            </a>
          </Button>
          {expediaUrl ? (
            <Button
              size="sm"
              variant="default"
              asChild
              className="h-8 flex-1 min-w-[96px] text-xs"
            >
              <a
                href={expediaUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={() =>
                  trackExpediaClick('ai_chat_hotel_card', { place_id: card.place_id })
                }
              >
                Book on Expedia
              </a>
            </Button>
          ) : bookingUrl ? (
            <Button
              size="sm"
              variant="outline"
              asChild
              className="h-8 flex-none px-2 text-xs"
              title={card.booking_url ? 'Book' : 'Website'}
            >
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          ) : null}
          {card.phone && !bookingUrl && !expediaUrl && (
            <Button
              size="sm"
              variant="outline"
              asChild
              className="h-8 flex-none px-2 text-xs"
              title="Call"
            >
              <a href={`tel:${card.phone.replace(/\s/g, '')}`}>
                <Phone className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};

export default PlaceCard;
