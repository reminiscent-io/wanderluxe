import React from 'react';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SPEEDS = [0.5, 1, 2] as const;

export interface PlaybackControlsProps {
  isPlaying: boolean;
  index: number;
  count: number;
  speed: number;
  onToggle: () => void;
  onStep: (delta: number) => void;
  onSpeed: (speed: number) => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  index,
  count,
  speed,
  onToggle,
  onStep,
  onSpeed,
}) => {
  if (count < 2) return null;

  return (
    <div
      className="flex items-center gap-1 rounded-card border border-border bg-card/95 p-1 shadow-warm-sm backdrop-blur"
      data-testid="map-playback"
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => onStep(-1)}
        disabled={index === 0}
        aria-label="Previous stop"
      >
        <SkipBack className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={onToggle}
        aria-label={isPlaying ? 'Pause tour' : 'Play tour'}
        aria-pressed={isPlaying}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => onStep(1)}
        disabled={index >= count - 1}
        aria-label="Next stop"
      >
        <SkipForward className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

      {SPEEDS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSpeed(s)}
          aria-pressed={speed === s}
          className={`rounded-md px-1.5 py-1 text-xs tabular-nums transition-colors ${
            speed === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {s}×
        </button>
      ))}
    </div>
  );
};

export default PlaybackControls;
