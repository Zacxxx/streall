export interface SubtitleCue {
  start: number; // seconds
  end: number; // seconds
  text: string;
}

export interface SubtitleTrack {
  id: string;
  language: string;
  label: string;
  cues: SubtitleCue[];
}

class SubtitleService {
  private currentTrack: SubtitleTrack | null = null;
  private isPlaying = false;
  private currentTime = 0;
  private updateInterval: NodeJS.Timeout | null = null;
  private onCueChangeCallback: ((cue: SubtitleCue | null) => void) | null = null;

  /**
   * Parse SRT subtitle file
   */
  parseSRT(content: string, language = 'en', label = 'Subtitles'): SubtitleTrack {
    const cues: SubtitleCue[] = [];
    const blocks = content.trim().split('\n\n');

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 3) continue;

      // Skip sequence number (first line)
      const timecodeLine = lines[1];
      const textLines = lines.slice(2);

      // Parse timecode: "00:01:23,456 --> 00:01:26,789"
      if (!timecodeLine) continue;
      const timeMatch = timecodeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      if (!timeMatch) continue;

      const startTime = this.parseTime(timeMatch[1]!, timeMatch[2]!, timeMatch[3]!, timeMatch[4]!);
      const endTime = this.parseTime(timeMatch[5]!, timeMatch[6]!, timeMatch[7]!, timeMatch[8]!);

      const text = textLines.join('\n').replace(/<[^>]*>/g, ''); // Remove HTML tags

      cues.push({
        start: startTime,
        end: endTime,
        text: text.trim()
      });
    }

    return {
      id: `srt-${Date.now()}`,
      language,
      label,
      cues: cues.sort((a, b) => a.start - b.start)
    };
  }

  /**
   * Parse VTT subtitle file
   */
  parseVTT(content: string, language = 'en', label = 'Subtitles'): SubtitleTrack {
    const cues: SubtitleCue[] = [];
    const lines = content.split('\n');
    let i = 0;

    // Skip WEBVTT header
    while (i < lines.length) {
      const line = lines[i];
      if (line && !line.includes('-->')) {
        i++;
      } else {
        break;
      }
    }

    while (i < lines.length) {
      const line = lines[i];
      if (!line) {
        i++;
        continue;
      }
      const trimmedLine = line.trim();
      
      // Look for timecode line
      if (trimmedLine.includes('-->')) {
        const timeMatch = trimmedLine.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
        if (timeMatch) {
          const startTime = this.parseTime(timeMatch[1]!, timeMatch[2]!, timeMatch[3]!, timeMatch[4]!);
          const endTime = this.parseTime(timeMatch[5]!, timeMatch[6]!, timeMatch[7]!, timeMatch[8]!);

          // Collect text lines
          const textLines: string[] = [];
          i++;
          while (i < lines.length) {
            const textLine = lines[i];
            if (!textLine || textLine.trim() === '') break;
            textLines.push(textLine.trim());
            i++;
          }

          if (textLines.length > 0) {
            const text = textLines.join('\n').replace(/<[^>]*>/g, ''); // Remove HTML tags
            cues.push({
              start: startTime,
              end: endTime,
              text: text.trim()
            });
          }
        }
      }
      i++;
    }

    return {
      id: `vtt-${Date.now()}`,
      language,
      label,
      cues: cues.sort((a, b) => a.start - b.start)
    };
  }

  /**
   * Load subtitle file from File object
   */
  async loadSubtitleFile(file: File, language?: string): Promise<SubtitleTrack> {
    const content = await file.text();
    const fileName = file.name.toLowerCase();
    const label = file.name.replace(/\.[^/.]+$/, ''); // Remove extension

    if (fileName.endsWith('.srt')) {
      return this.parseSRT(content, language || 'en', label);
    } else if (fileName.endsWith('.vtt')) {
      return this.parseVTT(content, language || 'en', label);
    } else {
      throw new Error('Unsupported subtitle format. Please use .srt or .vtt files.');
    }
  }

  /**
   * Set the current subtitle track
   */
  setTrack(track: SubtitleTrack | null) {
    this.currentTrack = track;
    if (!track) {
      this.onCueChangeCallback?.(null);
    }
  }

  /**
   * Get current subtitle track
   */
  getCurrentTrack(): SubtitleTrack | null {
    return this.currentTrack;
  }

  /**
   * Set playback state
   */
  setPlaying(playing: boolean) {
    this.isPlaying = playing;
    if (playing) {
      this.startUpdateLoop();
    } else {
      this.stopUpdateLoop();
    }
  }

  /**
   * Update current time
   */
  setCurrentTime(time: number) {
    this.currentTime = time;
    this.updateCurrentCue();
  }

  /**
   * Set callback for cue changes
   */
  onCueChange(callback: (cue: SubtitleCue | null) => void) {
    this.onCueChangeCallback = callback;
  }

  /**
   * Get current active cue
   */
  getCurrentCue(): SubtitleCue | null {
    if (!this.currentTrack) return null;

    return this.currentTrack.cues.find(cue => 
      this.currentTime >= cue.start && this.currentTime <= cue.end
    ) || null;
  }

  /**
   * Start automatic time updates (for when we can't get iframe time)
   */
  startAutoTimer() {
    this.setPlaying(true);
    this.setCurrentTime(0);
  }

  /**
   * Stop and reset
   */
  stop() {
    this.setPlaying(false);
    this.setCurrentTime(0);
  }

  /**
   * Parse time components to seconds
   */
  private parseTime(hours: string, minutes: string, seconds: string, milliseconds: string): number {
    return parseInt(hours) * 3600 + 
           parseInt(minutes) * 60 + 
           parseInt(seconds) + 
           parseInt(milliseconds) / 1000;
  }

  /**
   * Start the update loop
   */
  private startUpdateLoop() {
    if (this.updateInterval) return;
    
    this.updateInterval = setInterval(() => {
      if (this.isPlaying) {
        this.currentTime += 0.1; // Update every 100ms
        this.updateCurrentCue();
      }
    }, 100);
  }

  /**
   * Stop the update loop
   */
  private stopUpdateLoop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update current cue based on time
   */
  private updateCurrentCue() {
    const currentCue = this.getCurrentCue();
    this.onCueChangeCallback?.(currentCue);
  }
}

export const subtitleService = new SubtitleService(); 