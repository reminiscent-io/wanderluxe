import React from 'react';
import PlaceCard from './PlaceCard';
import type { PlaceCard as PlaceCardType } from '@/types/ai-assistant';

interface PlaceCardCarouselProps {
  cards: PlaceCardType[];
  onAdd?: (card: PlaceCardType) => Promise<void>;
}

const PlaceCardCarousel: React.FC<PlaceCardCarouselProps> = ({ cards, onAdd }) => {
  if (!cards || cards.length === 0) return null;

  // Single card: render without a scroller so it can breathe in the bubble.
  if (cards.length === 1) {
    return (
      <div className="mt-2 max-w-[320px]">
        <PlaceCard card={cards[0]} onAdd={onAdd} />
      </div>
    );
  }

  return (
    <div
      className="mt-2 -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="list"
      aria-label="Place recommendations"
    >
      {cards.map((card) => (
        <div key={card.id} role="listitem">
          <PlaceCard card={card} onAdd={onAdd} compact={cards.length > 3} />
        </div>
      ))}
    </div>
  );
};

export default PlaceCardCarousel;
