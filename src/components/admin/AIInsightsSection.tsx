import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminInsights, type AdminInsight } from '@/hooks/useAdminInsights';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const COOLDOWN_SECONDS = 60;

function InsightContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-earth max-w-full break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children, ...props }) => (
            <h2 className="text-base font-semibold text-earth-900 mt-5 mb-2 first:mt-0" {...props}>
              {children}
            </h2>
          ),
          ul: ({ children, ...props }) => (
            <ul className="list-disc pl-5 space-y-1 text-earth-700" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal pl-5 space-y-1 text-earth-700" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-sm leading-relaxed" {...props}>{children}</li>
          ),
          p: ({ children, ...props }) => (
            <p className="text-sm text-earth-700 leading-relaxed mb-2" {...props}>{children}</p>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-earth-900" {...props}>{children}</strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function InsightCard({ insight }: { insight: AdminInsight }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-sand-200 bg-white p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2 text-xs text-earth-500">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(insight.created_at), { addSuffix: true })}
          <span className="text-earth-400">via {insight.model}</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-earth-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-earth-400" />
        )}
      </button>
      {expanded && (
        <div className="mt-3 border-t border-sand-100 pt-3">
          <InsightContent content={insight.insight_text} />
        </div>
      )}
    </div>
  );
}

export function AIInsightsSection() {
  const {
    insights,
    isLoadingHistory,
    isGenerating,
    streamingContent,
    error,
    generateInsight
  } = useAdminInsights();

  const [cooldown, setCooldown] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  // Cooldown timer after generation
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleGenerate = useCallback(async () => {
    await generateInsight();
    setCooldown(COOLDOWN_SECONDS);
  }, [generateInsight]);

  const latestInsight = insights[0];
  const olderInsights = insights.slice(1);
  const isDisabled = isGenerating || cooldown > 0;

  // Content to display: streaming content takes priority, then latest saved insight
  const displayContent = streamingContent || latestInsight?.insight_text;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-sunset-500" />
          <h2 className="text-lg font-semibold text-earth-900">AI Insights</h2>
        </div>
        <Button
          variant="sunset"
          size="sm"
          onClick={handleGenerate}
          disabled={isDisabled}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Analyzing...
            </>
          ) : cooldown > 0 ? (
            <>
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              {cooldown}s
            </>
          ) : (
            <>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Generate Insight
            </>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Main insight card */}
      {displayContent ? (
        <div className="rounded-xl border border-sand-200 bg-white p-5 shadow-warm-sm">
          {!streamingContent && latestInsight && (
            <div className="mb-3 flex items-center gap-2 text-xs text-earth-500">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(latestInsight.created_at), { addSuffix: true })}
              <span className="text-earth-400">via {latestInsight.model}</span>
            </div>
          )}
          {streamingContent && (
            <div className="mb-3 flex items-center gap-2 text-xs text-sunset-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating fresh analysis...
            </div>
          )}
          <InsightContent content={displayContent} />
          {isGenerating && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-sunset-500 animate-pulse rounded-sm" />
          )}
        </div>
      ) : !isLoadingHistory ? (
        <div className="rounded-xl border border-dashed border-sand-300 bg-sand-50/50 p-8 text-center">
          <Sparkles className="mx-auto mb-2 h-8 w-8 text-sand-400" />
          <p className="text-sm text-earth-500">
            No insights yet. Generate your first AI analysis to get actionable recommendations.
          </p>
        </div>
      ) : null}

      {/* History */}
      {olderInsights.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs font-medium text-earth-500 hover:text-earth-700 transition-colors"
          >
            {showHistory ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {olderInsights.length} previous insight{olderInsights.length !== 1 ? 's' : ''}
          </button>
          {showHistory && (
            <div className="mt-3 space-y-2">
              {olderInsights.map(insight => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
