import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, Maximize, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VideoPlayerRef {
  getCurrentTime: () => number;
  seekTo: (time: number) => void;
}

// Check if URL is an HLS stream (.m3u8)
function isHlsUrl(url: string): boolean {
  return url.includes(".m3u8");
}

interface VideoPlayerProps {
  src?: string | null;
  poster?: string;
  onProgress?: (progress: number, currentTime: number) => void;
  onComplete?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  initialTime?: number;
  className?: string;
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
}, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timeout>();

  const isYouTube = src && isYouTubeUrl(src);
  const youtubeId = src && isYouTube ? getYouTubeId(src) : null;

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => currentTime,
    seekTo: (time: number) => {
      if (videoRef.current && !isYouTube) {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
      }
    },
  }), [currentTime, isYouTube]);

  // Reset and initialize video time when src changes (lesson switch)
  useEffect(() => {
    if (!videoRef.current || isYouTube) return;
    const video = videoRef.current;
    // Pause current playback
    video.pause();
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);

    // For non-HLS, set the new source
    if (src && !isHlsUrl(src)) {
      video.src = src;
      video.load();
    }

    // Seek to initialTime after metadata is loaded
    const handleLoaded = () => {
      if (initialTime > 0) {
        video.currentTime = initialTime;
      }
      setDuration(video.duration || 0);
    };
    video.addEventListener("loadedmetadata", handleLoaded, { once: true });

    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
    };
  }, [src, isYouTube]); // intentionally omit initialTime - only reset on src change

  // Apply initialTime changes (e.g. from resume position) without resetting
  useEffect(() => {
    if (videoRef.current && initialTime > 0 && !isYouTube && videoRef.current.readyState >= 1) {
      videoRef.current.currentTime = initialTime;
    }
  }, [initialTime, isYouTube]);

  // HLS.js integration for .m3u8 streams
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || isYouTube) return;
    if (!isHlsUrl(src)) return;

    // If browser supports HLS natively (Safari), just set src
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      if (initialTime > 0) video.currentTime = initialTime;
      return;
    }

    // Use hls.js for other browsers
    if (Hls.isSupported()) {
      const hls = new Hls({
        startPosition: initialTime || -1,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Video is ready to play
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
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
  }, [src, isYouTube, initialTime]);

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
          
          if (onProgress && Math.floor(newTime) % 5 === 0) {
            onProgress(newProgress, newTime);
          }
          
          if (newProgress >= 95 && onComplete) {
            onComplete();
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
  }, [isYouTube, isPlaying, onProgress, onComplete]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || isYouTube) return;

    const currentProgress = (video.currentTime / video.duration) * 100;
    setProgress(currentProgress);
    setCurrentTime(video.currentTime);

    // Call onTimeUpdate for real-time tracking
    if (onTimeUpdate) {
      onTimeUpdate(video.currentTime);
    }

    // Call onProgress every 5 seconds or when significant progress is made
    if (onProgress && Math.floor(video.currentTime) % 5 === 0) {
      onProgress(currentProgress, video.currentTime);
    }

    // Mark as complete at 95%
    if (currentProgress >= 95 && onComplete) {
      onComplete();
    }
  }, [onProgress, onComplete, onTimeUpdate, isYouTube]);

  const togglePlay = () => {
    if (isYouTube) {
      setIsPlaying(!isPlaying);
      return;
    }
    
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (isYouTube) {
      setIsMuted(!isMuted);
      return;
    }
    
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isYouTube) return;
    
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * video.duration;
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  // If no video URL, show placeholder
  if (!src) {
    return (
      <div
        className={cn(
          "relative aspect-video rounded-3xl bg-gradient-to-br from-primary/20 to-accent/15 border border-border/90 overflow-hidden flex items-center justify-center",
          className
        )}
      >
        <button
          onClick={togglePlay}
          className="w-20 h-20 rounded-full bg-white/70 backdrop-blur-sm border border-white/85 flex items-center justify-center shadow-soft-2 hover:bg-white/90 transition-colors"
        >
          <Play className="w-8 h-8 text-text-1 ml-1" fill="currentColor" />
        </button>
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
      className={cn(
        "relative aspect-video rounded-3xl overflow-hidden bg-black group",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
      />

      {/* Play Overlay (when paused) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <button
            onClick={togglePlay}
            className="w-20 h-20 rounded-full bg-white/70 backdrop-blur-sm border border-white/85 flex items-center justify-center shadow-soft-2 hover:bg-white/90 transition-colors"
          >
            <Play className="w-8 h-8 text-text-1 ml-1" fill="currentColor" />
          </button>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12 transition-opacity duration-300",
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Progress Bar */}
        <div
          className="h-1.5 bg-white/30 rounded-full mb-3 cursor-pointer group/progress"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary rounded-full relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-4">
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
});
