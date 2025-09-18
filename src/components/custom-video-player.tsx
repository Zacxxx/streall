import { SubtitleOverlay } from './subtitle-overlay';

interface CustomVideoPlayerProps {
  embedUrl: string;
  title: string;
  onBack?: () => void;
  onExtractStreams?: () => void;
  subtitlesVisible?: boolean;
  hasSubtitles?: boolean;
}

export function CustomVideoPlayer({
  embedUrl,
  title,
  subtitlesVisible,
  hasSubtitles,
}: CustomVideoPlayerProps) {
  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        style={{ border: 'none', background: 'black', minHeight: '400px' }}
        allowFullScreen
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope"
        title={title}
      />

      <SubtitleOverlay
        isVisible={true}
        subtitlesVisible={subtitlesVisible}
        hasSubtitles={hasSubtitles}
      />
    </div>
  );
}
