import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const anyDocument = document as Document & {
        webkitFullscreenElement?: Element | null;
        mozFullScreenElement?: Element | null;
        msFullscreenElement?: Element | null;
      };

      const fullscreenElement =
        document.fullscreenElement ??
        anyDocument.webkitFullscreenElement ??
        anyDocument.mozFullScreenElement ??
        anyDocument.msFullscreenElement ??
        null;

      setIsFullscreen(fullscreenElement === containerRef.current);
    };

    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange',
    ];

    events.forEach((event) => {
      document.addEventListener(event, handleFullscreenChange);
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleFullscreenChange);
      });
    };
  }, []);

  const requestContainerFullscreen = () => {
    const element = containerRef.current;
    if (!element) return;

    const anyElement = element as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      mozRequestFullScreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    };

    if (element.requestFullscreen) {
      void element.requestFullscreen();
    } else if (anyElement.webkitRequestFullscreen) {
      void anyElement.webkitRequestFullscreen();
    } else if (anyElement.mozRequestFullScreen) {
      void anyElement.mozRequestFullScreen();
    } else if (anyElement.msRequestFullscreen) {
      void anyElement.msRequestFullscreen();
    }
  };

  const exitContainerFullscreen = () => {
    const anyDocument = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      mozCancelFullScreen?: () => Promise<void> | void;
      msExitFullscreen?: () => Promise<void> | void;
    };

    if (document.exitFullscreen) {
      void document.exitFullscreen();
    } else if (anyDocument.webkitExitFullscreen) {
      void anyDocument.webkitExitFullscreen();
    } else if (anyDocument.mozCancelFullScreen) {
      void anyDocument.mozCancelFullScreen();
    } else if (anyDocument.msExitFullscreen) {
      void anyDocument.msExitFullscreen();
    }
  };

  const handleToggleFullscreen = () => {
    if (isFullscreen) {
      exitContainerFullscreen();
    } else {
      requestContainerFullscreen();
    }
  };

  const containerClassName = `relative w-full h-full bg-black overflow-hidden ${isFullscreen ? 'rounded-none' : 'rounded-lg'}`;

  return (
    <div ref={containerRef} className={containerClassName}>
      <button
        type="button"
        onClick={handleToggleFullscreen}
        className="absolute top-3 right-3 z-40 rounded-full bg-black/60 p-2 text-white transition hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>

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
