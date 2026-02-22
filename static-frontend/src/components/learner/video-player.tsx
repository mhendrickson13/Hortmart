import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VideoPlayerRef {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (time: number) => void;
}

// Check if URL is an HLS stream (.m3u8)
function isHlsUrl(url: string): boolean {
  return url.includes(".m3u8");
}

/** Completion threshold — video must be nearly finished before marking complete */
const COMPLETION_THRESHOLD = 95;

/** Available playback speed options */
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface VideoPlayerProps {
  src?: string | null;
  poster?: string;
  onProgress?: (progress: number, currentTime: number) => void;
  onComplete?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  initialTime?: number;
  className?: string;
  /** CloudFront signing params for HLS chunk requests */
  signingParams?: {
    Policy: string;
    Signature: string;
    KeyPairId: string;
  } | null;
  /** Preview mode: autoplay muted, no controls, loop first 10 seconds */
  previewMode?: boolean;
}

// Check if URL is a YouTube embed or video URL
function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

// Extract YouTube video ID
function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(function VideoPlayer({
  src,
  poster,
  onProgress,
  onComplete,
  onTimeUpdate,
  initialTime = 0,
  className,
  signingParams,
  previewMode = false,
}, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timeout>();
  const completedRef = useRef(false);
  const initialTimeRef = useRef(initialTime);
  initialTimeRef.current = initialTime;
  const lastReportedSecondRef = useRef(-1);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const isYouTube = src && isYouTubeUrl(src);
  const youtubeId = src && isYouTube ? getYouTubeId(src) : null;

  // Stable refs for callbacks used in effects
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  const PREVIEW_DURATION = 20; // seconds of video content shown in preview
  const PREVIEW_SPEED = 2;     // 2x speed → 20s content plays in ~10s real time

  // Preview mode: autoplay muted at 2x, loop first 20s of video
  useEffect(() => {
    if (!previewMode) return;
    const video = videoRef.current;
    if (!video || isYouTube) return;

    video.muted = true;
    video.playbackRate = PREVIEW_SPEED;
    setIsMuted(true);
    setPlaybackRate(PREVIEW_SPEED);

    // Auto-play once enough data loaded
    const tryPlay = () => {
      video.playbackRate = PREVIEW_SPEED;
      video.play().catch(() => { /* autoplay blocked — silent */ });
    };

    // Loop at PREVIEW_DURATION
    const handleTimeCheck = () => {
      if (video.currentTime >= PREVIEW_DURATION) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    };

    video.addEventListener('canplay', tryPlay, { once: true });
    video.addEventListener('timeupdate', handleTimeCheck);
    // If already ready
    if (video.readyState >= 3) tryPlay();

    return () => {
      video.removeEventListener('canplay', tryPlay);
      video.removeEventListener('timeupdate', handleTimeCheck);
    };
  }, [previewMode, src, isYouTube]);

  // Expose methods via ref — read from DOM element directly to avoid churn
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => videoRef.current?.currentTime ?? currentTime,
    getDuration: () => videoRef.current?.duration ?? duration,
    seekTo: (time: number) => {
      if (videoRef.current && !isYouTube) {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
      }
    },
  }), [isYouTube]); // eslint-disable-line -- stable deps only

  // Reset and initialize video time when src changes (lesson switch)
  useEffect(() => {
    // Reset completion guard and progress dedup on source change
    completedRef.current = false;
    lastReportedSecondRef.current = -1;
    if (!videoRef.current || isYouTube) return;
    const video = videoRef.current;
    // Pause current playback
    video.pause();
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(false);

    // For non-HLS, set the new source
    if (src && !isHlsUrl(src)) {
      video.src = src;
      video.load();
    }

    // Seek to initialTime after metadata is loaded
    const handleLoaded = () => {
      const seekTo = initialTimeRef.current;
      console.log("[VideoPlayer] loadedmetadata — seekTo:", seekTo, "duration:", video.duration);
      if (seekTo > 0) {
        video.currentTime = seekTo;
        setCurrentTime(seekTo);
      }
      const dur = video.duration || 0;
      setDuration(dur);
    };
    video.addEventListener("loadedmetadata", handleLoaded, { once: true });
    // Fallback: if metadata is already loaded (cached video)
    if (video.readyState >= 1) handleLoaded();

    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
    };
  }, [src, isYouTube]); // intentionally omit initialTime - use ref instead

  // NOTE: initialTime is applied via the src-change effect (loadedmetadata handler)
  // and HLS startPosition. We do NOT re-seek when initialTime changes during playback
  // because progress saves update the parent's state which would cause a seek loop.

  // HLS.js integration for .m3u8 streams (with optional CloudFront signed URL support)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || isYouTube) return;
    if (!isHlsUrl(src)) return;

    // Helper: append signing query params to a URL (skip if already signed)
    const appendSigning = (url: string): string => {
      if (!signingParams) return url;
      // Avoid double-appending if URL already contains signing params
      if (url.includes('Key-Pair-Id=')) return url;
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}Policy=${signingParams.Policy}&Signature=${signingParams.Signature}&Key-Pair-Id=${signingParams.KeyPairId}`;
    };

    // If browser supports HLS natively (Safari), just set src
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari handles HLS natively but we can't intercept sub-requests.
      // For signed URLs, we'd need signed cookies instead. Fall through to hls.js if signing is needed.
      if (!signingParams) {
        video.src = src;
        const seekTo = initialTimeRef.current;
        if (seekTo > 0) video.currentTime = seekTo;
        return;
      }
      // NOTE: On iOS Safari, Hls.isSupported() returns false (no MSE).
      // With signingParams, HLS chunks will fail with 403 on iOS.
      // TODO: Implement CloudFront signed cookies for iOS HLS support.
      if (!Hls.isSupported()) {
        // iOS Safari with signed URL — try using the pre-signed manifest URL directly.
        // The master manifest URL is already signed. Segment requests won't have signing params
        // so they may fail. This is a known limitation until signed cookies are implemented.
        console.warn('[VideoPlayer] iOS Safari with signed HLS — playback may fail for chunk requests. Consider using CloudFront signed cookies.');
        video.src = src;
        const seekTo = initialTimeRef.current;
        if (seekTo > 0) video.currentTime = seekTo;
        return;
      }
    }

    // Use hls.js for other browsers (or Safari when signing is needed)
    if (Hls.isSupported()) {
      let networkRetries = 0;
      let mediaRetries = 0;
      const MAX_RETRIES = 5;

      const hls = new Hls({
        startPosition: initialTimeRef.current || -1,
        // ── Buffering — generous for smooth playback ──
        // At 2x speed, video consumes buffer twice as fast (6s segments = 3 real sec).
        // Normal: 30s buffer ≈ 5 segments ahead. Preview 2x: 60s buffer ≈ 10 segments.
        maxBufferLength: previewMode ? 60 : 30,
        maxMaxBufferLength: previewMode ? 120 : 60,
        maxBufferSize: 60 * 1e6,                       // 60 MB — plenty for all qualities
        backBufferLength: 30,                          // keep 30s back-buffer for seeking
        // ── Gap & stall recovery ──
        maxBufferHole: 1,                              // tolerate gaps up to 1s between segments
        nudgeOffset: 0.2,                              // jump 0.2s to recover from stalls
        nudgeMaxRetry: 5,                              // retry nudge up to 5 times
        // ── ABR / quality ──
        startLevel: 0,                                 // always start lowest quality for fast first paint
        capLevelToPlayerSize: true,                    // don't fetch higher than visible size
        testBandwidth: !previewMode,                   // skip bandwidth test in preview
        abrEwmaDefaultEstimate: 1_000_000,             // assume 1 Mbps to start
        abrBandWidthFactor: 0.8,                       // conservative quality selection
        abrBandWidthUpFactor: 0.5,                     // very conservative up-switch
        // ── Loading ──
        lowLatencyMode: false,                         // VOD, not live — disable low-latency mode
        progressive: true,                             // prefetch next fragment while appending current
        // Intercept every XHR to append CloudFront signing params
        ...(signingParams ? {
          xhrSetup: (xhr: XMLHttpRequest, url: string) => {
            xhr.open('GET', appendSigning(url), true);
          },
        } : {}),
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Video is ready to play — reset retry counters
        networkRetries = 0;
        mediaRetries = 0;
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (networkRetries < MAX_RETRIES) {
                networkRetries++;
                console.warn(`[HLS] Network error, retry ${networkRetries}/${MAX_RETRIES}`);
                hls.startLoad();
              } else {
                console.error('[HLS] Network error — max retries reached, destroying');
                hls.destroy();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (mediaRetries < MAX_RETRIES) {
                mediaRetries++;
                console.warn(`[HLS] Media error, retry ${mediaRetries}/${MAX_RETRIES}`);
                hls.recoverMediaError();
              } else {
                console.error('[HLS] Media error — max retries reached, destroying');
                hls.destroy();
              }
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
      return () => {
        hls.destroy();
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- initialTime read from ref to avoid HLS re-init
  }, [src, isYouTube, signingParams]);

  // Simulated progress for YouTube videos
  useEffect(() => {
    if (isYouTube && isPlaying) {
      const estimatedDuration = 600; // Assume 10 min video
      setDuration(estimatedDuration);
      
      progressIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const newTime = prev + 1;
          const newProgress = (newTime / estimatedDuration) * 100;
          setProgress(newProgress);
          
          const sec = Math.floor(newTime);
          if (onProgressRef.current && sec % 5 === 0 && sec !== lastReportedSecondRef.current) {
            lastReportedSecondRef.current = sec;
            onProgressRef.current(newProgress, newTime);
          }
          
          if (newProgress >= COMPLETION_THRESHOLD && onCompleteRef.current && !completedRef.current) {
            completedRef.current = true;
            onCompleteRef.current();
          }
          
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isYouTube, isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || isYouTube) return;

    const dur = video.duration;
    if (!dur || !isFinite(dur)) return;

    const currentProgress = (video.currentTime / dur) * 100;
    setProgress(currentProgress);
    setCurrentTime(video.currentTime);

    // Call onTimeUpdate for real-time tracking
    if (onTimeUpdateRef.current) {
      onTimeUpdateRef.current(video.currentTime);
    }

    // Deduplicated onProgress: fire only once per 5-second mark
    const sec = Math.floor(video.currentTime);
    if (onProgressRef.current && sec >= 1 && sec % 5 === 0 && sec !== lastReportedSecondRef.current) {
      lastReportedSecondRef.current = sec;
      console.log("[VideoPlayer] onProgress fire @", sec, "s, dur:", dur);
      onProgressRef.current(currentProgress, video.currentTime);
    }

    // Mark as complete at threshold (matches backend >=90%)
    if (currentProgress >= COMPLETION_THRESHOLD && onCompleteRef.current && !completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current();
    }
  }, [isYouTube]);

  const togglePlay = useCallback(async () => {
    if (isYouTube) {
      setIsPlaying((p) => !p);
      return;
    }
    
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
      } catch (err: any) {
        // AbortError is expected if play() is interrupted
        if (err?.name !== "AbortError") console.warn("Play failed:", err);
      }
    } else {
      video.pause();
    }
  }, [isYouTube]);

  const toggleMute = useCallback(() => {
    if (isYouTube) {
      setIsMuted((m) => !m);
      return;
    }
    
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, [isYouTube]);

  const changeVolume = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video || isYouTube) return;
    const newVol = Math.max(0, Math.min(1, video.volume + delta));
    video.volume = newVol;
    setVolume(newVol);
    if (newVol === 0) { video.muted = true; setIsMuted(true); }
    else if (video.muted) { video.muted = false; setIsMuted(false); }
  }, [isYouTube]);

  const skipTime = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || isYouTube) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
  }, [isYouTube]);

  // Seek via progress bar (click or drag)
  const seekToPercent = useCallback((clientX: number, bar: HTMLDivElement) => {
    const video = videoRef.current;
    if (!video || isYouTube || !video.duration) return;
    const rect = bar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = percent * video.duration;
    video.currentTime = time;
    setCurrentTime(time);
    setProgress(percent * 100);
  }, [isYouTube]);

  const handleSeekMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isYouTube || !progressBarRef.current) return;
    setIsDragging(true);
    seekToPercent(e.clientX, progressBarRef.current);
  }, [isYouTube, seekToPercent]);

  // Drag seek via document-level listeners
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (progressBarRef.current) seekToPercent(e.clientX, progressBarRef.current);
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, seekToPercent]);

  // Touch drag for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (isYouTube || !progressBarRef.current) return;
    setIsDragging(true);
    seekToPercent(e.touches[0].clientX, progressBarRef.current);
  }, [isYouTube, seekToPercent]);

  useEffect(() => {
    if (!isDragging) return;
    const handleTouchMove = (e: TouchEvent) => {
      if (progressBarRef.current) seekToPercent(e.touches[0].clientX, progressBarRef.current);
    };
    const handleTouchEnd = () => setIsDragging(false);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, seekToPercent]);

  const changePlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current;
    if (video) video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (!isDragging) setShowControls(false);
    }, 3000);
  }, [isDragging]);

  // Keyboard shortcuts
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipTime(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          skipTime(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(-0.1);
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };
    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, skipTime, changeVolume, toggleMute, toggleFullscreen]);

  // Close speed menu on outside click
  useEffect(() => {
    if (!showSpeedMenu) return;
    const handleClick = () => setShowSpeedMenu(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showSpeedMenu]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // If no video URL, show placeholder with message
  if (!src) {
    return (
      <div
        className={cn(
          "relative aspect-video rounded-3xl bg-gradient-to-br from-muted to-surface-3 border border-border/90 overflow-hidden flex flex-col items-center justify-center gap-3",
          className
        )}
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Play className="w-7 h-7 text-text-3 ml-0.5" />
        </div>
        <p className="text-body-sm font-medium text-text-3">No video available for this lesson</p>
      </div>
    );
  }

  // YouTube embed player
  if (isYouTube && youtubeId) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "relative aspect-video rounded-3xl overflow-hidden bg-black group",
          className
        )}
        tabIndex={0}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=${isPlaying ? 1 : 0}&mute=${isMuted ? 1 : 0}&start=${Math.floor(initialTime)}&enablejsapi=1&rel=0&modestbranding=1`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />

        {/* Overlay Controls for YouTube */}
        {!isPlaying && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
            onClick={togglePlay}
          >
            <button
              className="w-20 h-20 rounded-full bg-white/70 backdrop-blur-sm border border-white/85 flex items-center justify-center shadow-soft-2 hover:bg-white/90 transition-colors"
            >
              <Play className="w-8 h-8 text-text-1 ml-1" fill="currentColor" />
            </button>
          </div>
        )}

        {/* Controls Overlay */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12 transition-opacity duration-300 pointer-events-none",
            showControls || !isPlaying ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Progress Bar */}
          <div className="h-1.5 bg-white/30 rounded-full mb-3">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center gap-4 pointer-events-auto">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" fill="currentColor" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
              )}
            </button>

            <button
              onClick={toggleMute}
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            <span className="text-caption text-white/80 font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Native HTML5 video player
  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={cn(
        "relative aspect-video rounded-3xl overflow-hidden bg-black group outline-none",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { if (isPlaying && !isDragging) setShowControls(false); }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          // Save progress immediately on pause
          if (videoRef.current && onProgressRef.current && videoRef.current.currentTime >= 1) {
            const prog = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            console.log("[VideoPlayer] onPause save @", Math.floor(videoRef.current.currentTime), "s");
            onProgressRef.current(prog, videoRef.current.currentTime);
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onSeeking={() => setIsBuffering(true)}
        onSeeked={() => setIsBuffering(false)}
        onClick={togglePlay}
      />

      {/* Buffering Indicator */}
      {isBuffering && isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-12 h-12 text-white/80 animate-spin" />
        </div>
      )}

      {/* Play Overlay (when paused & not buffering) — hidden in preview mode */}
      {!previewMode && !isPlaying && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <button
            onClick={togglePlay}
            className="w-20 h-20 rounded-full bg-white/70 backdrop-blur-sm border border-white/85 flex items-center justify-center shadow-soft-2 hover:bg-white/90 transition-colors"
          >
            <Play className="w-8 h-8 text-text-1 ml-1" fill="currentColor" />
          </button>
        </div>
      )}

      {/* Controls Overlay — hidden in preview mode */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12 transition-opacity duration-300",
          previewMode ? "opacity-0 pointer-events-none" : (showControls || !isPlaying || isDragging ? "opacity-100" : "opacity-0")
        )}
      >
        {/* Progress Bar — supports click + drag */}
        <div
          ref={progressBarRef}
          className="h-2 bg-white/30 rounded-full mb-3 cursor-pointer group/progress hover:h-3 transition-all"
          onMouseDown={handleSeekMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div
            className="h-full bg-primary rounded-full relative pointer-events-none"
            style={{ width: `${progress}%` }}
          >
            <div className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md transition-opacity",
              isDragging ? "opacity-100 scale-110" : "opacity-0 group-hover/progress:opacity-100"
            )} />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" fill="currentColor" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
            )}
          </button>

          {/* Skip -10s */}
          <button
            onClick={() => skipTime(-10)}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title="Rewind 10s (←)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Skip +10s */}
          <button
            onClick={() => skipTime(10)}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title="Forward 10s (→)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Mute */}
          <button
            onClick={toggleMute}
            className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title="Mute (M)"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>

          {/* Time */}
          <span className="text-caption text-white/80 font-medium whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Playback Speed */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowSpeedMenu((s) => !s); }}
              className="h-9 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-caption font-semibold transition-colors"
              title="Playback speed"
            >
              {playbackRate === 1 ? "1x" : `${playbackRate}x`}
            </button>
            {showSpeedMenu && (
              <div
                className="absolute bottom-full mb-2 right-0 bg-black/90 backdrop-blur-sm rounded-xl border border-white/10 py-1.5 min-w-[80px] shadow-lg z-10"
                onClick={(e) => e.stopPropagation()}
              >
                {SPEED_OPTIONS.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={cn(
                      "w-full px-3.5 py-1.5 text-caption text-left hover:bg-white/10 transition-colors",
                      rate === playbackRate ? "text-primary font-bold" : "text-white/80"
                    )}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title="Fullscreen (F)"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
});
