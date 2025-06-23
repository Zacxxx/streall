import React, { useState, useEffect } from 'react';
import { subtitleService, SubtitleCue } from '../services/subtitle-service';

interface SubtitleOverlayProps {
  isVisible?: boolean;
  subtitlesVisible?: boolean;
  hasSubtitles?: boolean;
  className?: string;
}

export function SubtitleOverlay({ 
  isVisible = true, 
  subtitlesVisible = true, 
  hasSubtitles = false,
  className = '' 
}: SubtitleOverlayProps) {
  const [currentCue, setCurrentCue] = useState<SubtitleCue | null>(null);

  useEffect(() => {
    // Subscribe to subtitle cue changes
    subtitleService.onCueChange((cue) => {
      setCurrentCue(cue);
    });

    return () => {
      // Cleanup
      subtitleService.onCueChange(() => {});
    };
  }, []);

  // Only show if all conditions are met
  if (!isVisible || !subtitlesVisible || !hasSubtitles || !currentCue) {
    return null;
  }

  return (
    <div
      className={`
        absolute bottom-8 left-4 right-4 z-30 
        flex justify-center pointer-events-none
        ${className}
      `}
    >
      <div
        className="
          bg-black/80 backdrop-blur-sm 
          px-4 py-2 rounded-lg 
          max-w-4xl text-center
          border border-white/10
          shadow-2xl
        "
      >
        <div
          className="
            text-white text-lg font-medium 
            leading-relaxed tracking-wide
            drop-shadow-lg
          "
          style={{
            textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)'
          }}
        >
          {currentCue.text.split('\n').map((line, index) => (
            <div key={index}>
              {line}
              {index < currentCue.text.split('\n').length - 1 && <br />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SubtitleControlsProps {
  onUploadSubtitles: (file: File) => void;
  onToggleSubtitles: () => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  hasSubtitles: boolean;
  isVisible: boolean;
  isTimerRunning: boolean;
}

export function SubtitleControls({
  onUploadSubtitles,
  onToggleSubtitles,
  onStartTimer,
  onStopTimer,
  hasSubtitles,
  isVisible,
  isTimerRunning
}: SubtitleControlsProps) {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUploadSubtitles(file);
      // Reset input
      event.target.value = '';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Upload Button */}
      <div className="relative">
        <input
          type="file"
          accept=".srt,.vtt"
          onChange={handleFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <button
          className="
            px-3 py-2 bg-blue-900/30 border border-blue-400 
            text-white text-sm font-medium rounded-md
            hover:bg-blue-700/40 hover:border-blue-300
            transition-all duration-200
            flex items-center space-x-2
          "
        >
          <span>📁</span>
          <span>Upload Subtitles</span>
        </button>
      </div>

      {/* Toggle Visibility */}
      {hasSubtitles && (
        <button
          onClick={onToggleSubtitles}
          className={`
            px-3 py-2 text-sm font-medium rounded-md
            transition-all duration-200
            flex items-center space-x-2
            ${isVisible 
              ? 'bg-green-900/30 border border-green-400 text-white hover:bg-green-700/40 hover:border-green-300'
              : 'bg-gray-900/30 border border-gray-400 text-gray-300 hover:bg-gray-700/40 hover:border-gray-300'
            }
          `}
        >
          <span>{isVisible ? '👁️' : '👁️‍🗨️'}</span>
          <span>{isVisible ? 'Hide' : 'Show'}</span>
        </button>
      )}

      {/* Timer Controls */}
      {hasSubtitles && (
        <button
          onClick={isTimerRunning ? onStopTimer : onStartTimer}
          className={`
            px-3 py-2 text-sm font-medium rounded-md
            transition-all duration-200
            flex items-center space-x-2
            ${isTimerRunning
              ? 'bg-red-900/30 border border-red-400 text-white hover:bg-red-700/40 hover:border-red-300'
              : 'bg-yellow-900/30 border border-yellow-400 text-white hover:bg-yellow-700/40 hover:border-yellow-300'
            }
          `}
        >
          <span>{isTimerRunning ? '⏸️' : '▶️'}</span>
          <span>{isTimerRunning ? 'Pause' : 'Start'}</span>
        </button>
      )}
    </div>
  );
} 