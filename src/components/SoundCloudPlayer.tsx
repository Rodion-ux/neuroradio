"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type SoundCloudWidget = {
  load: (url: string, options?: { auto_play?: boolean; buying?: boolean }) => void;
  play: () => void;
  pause: () => void;
  setVolume: (volume: number) => void; // 0..100
  seekTo: (milliseconds: number) => void;
  getDuration: (callback: (milliseconds: number) => void) => void;
  bind: (event: string, listener: ((...args: any[]) => void) | (() => void)) => void;
  unbind: (event: string, listener?: ((...args: any[]) => void) | (() => void)) => void;
};

declare global {
  interface Window {
    SC?: {
      Widget: {
        (element: HTMLIFrameElement): SoundCloudWidget;
        Events: {
          READY: string;
          FINISH: string;
          PLAY_PROGRESS: string;
        };
      };
    };
  }
}

export type SoundCloudPlayerHandle = {
  loadTrack: (trackId: number, autoPlay?: boolean) => void;
  play: () => void;
  pause: () => void;
  setVolume: (volume: number) => void; // 0..1
  seekTo: (seconds: number) => void;
};

type SoundCloudPlayerProps = {
  trackId?: number | null;
  onFinish?: () => void;
  onProgress?: (positionMs: number, durationMs: number) => void;
};

// Невидимый SoundCloud-плеер на базе официального виджета.
export const SoundCloudPlayer = forwardRef<SoundCloudPlayerHandle, SoundCloudPlayerProps>(
  ({ trackId, onFinish, onProgress }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const widgetRef = useRef<SoundCloudWidget | null>(null);
    const [ready, setReady] = useState(false);
    const finishHandlerRef = useRef<(() => void) | undefined>(undefined);
    const progressHandlerRef = useRef<
      ((positionMs: number, durationMs: number) => void) | undefined
    >(undefined);
    const durationRef = useRef(0);

    const initializeWidget = () => {
      if (!iframeRef.current) return;
      if (widgetRef.current) return;
      if (typeof window === "undefined" || !window.SC || !window.SC.Widget) return;

      const widget = window.SC.Widget(iframeRef.current);
      widgetRef.current = widget;

      const handleReady = () => {
        setReady(true);
        widget.getDuration((ms) => {
          durationRef.current = ms;
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/574a7f99-6c21-48ad-9731-30948465c78f',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            sessionId:'debug-session',
            runId:'pre-fix',
            hypothesisId:'H6',
            location:'SoundCloudPlayer.tsx:READY',
            message:'SoundCloud widget READY',
            data:{ trackIdProp: trackId ?? null },
            timestamp:Date.now()
          })
        }).catch(()=>{});
        // #endregion agent log
      };

      const handleFinish = () => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/574a7f99-6c21-48ad-9731-30948465c78f',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            sessionId:'debug-session',
            runId:'pre-fix',
            hypothesisId:'H1',
            location:'SoundCloudPlayer.tsx:FINISH',
            message:'SoundCloud widget FINISH event',
            data:{ currentTrackIdProp: trackId ?? null },
            timestamp:Date.now()
          })
        }).catch(()=>{});
        // #endregion agent log
        if (finishHandlerRef.current) {
          finishHandlerRef.current();
        }
      };

      widget.bind(window.SC.Widget.Events.READY, handleReady);
      widget.bind(window.SC.Widget.Events.FINISH, handleFinish);
      widget.bind(window.SC.Widget.Events.PLAY_PROGRESS, (event: any) => {
        const position = typeof event?.currentPosition === "number" ? event.currentPosition : 0;
        const duration =
          durationRef.current && durationRef.current > 0
            ? durationRef.current
            : typeof event?.duration === "number"
            ? event.duration
            : 0;
        if (progressHandlerRef.current) {
          progressHandlerRef.current(position, duration);
        }
      });
    };

    // Загружаем SDK один раз или используем уже загруженный, затем инициализируем виджет.
    useEffect(() => {
      if (typeof window === "undefined") return;

      // Если SDK уже есть (например, его добавили статически), просто инициализируем виджет.
      if (window.SC && window.SC.Widget) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/574a7f99-6c21-48ad-9731-30948465c78f',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            sessionId:'debug-session',
            runId:'pre-fix',
            hypothesisId:'H6',
            location:'SoundCloudPlayer.tsx:SDK_ALREADY_PRESENT',
            message:'SoundCloud SDK already present on mount',
            data:{},
            timestamp:Date.now()
          })
        }).catch(()=>{});
        // #endregion agent log
        initializeWidget();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://w.soundcloud.com/player/api.js";
      script.async = true;
      document.body.appendChild(script);

      const onLoad = () => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/574a7f99-6c21-48ad-9731-30948465c78f',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            sessionId:'debug-session',
            runId:'pre-fix',
            hypothesisId:'H6',
            location:'SoundCloudPlayer.tsx:SDK_LOAD',
            message:'SoundCloud SDK script loaded',
            data:{},
            timestamp:Date.now()
          })
        }).catch(()=>{});
        // #endregion agent log
        // Инициализируем виджет после загрузки SDK, если iframe уже есть.
        initializeWidget();
      };

      script.addEventListener("load", onLoad);

      return () => {
        script.removeEventListener("load", onLoad);
      };
    }, []);

    // Инициализация виджета при наличии iframe и уже загруженного SDK.
    useEffect(() => {
      initializeWidget();
    }, []);

    // Сохраняем onFinish в ref, чтобы не переинициализировать слушатели.
    useEffect(() => {
      finishHandlerRef.current = onFinish;
      progressHandlerRef.current = onProgress;
    }, [onFinish, onProgress]);

    // Императивный API для родителя.
    useImperativeHandle(
      ref,
      () => ({
        loadTrack: (id: number, autoPlay = true) => {
          const widget = widgetRef.current;
          if (!widget) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/574a7f99-6c21-48ad-9731-30948465c78f',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({
                sessionId:'debug-session',
                runId:'pre-fix',
                hypothesisId:'H2',
                location:'SoundCloudPlayer.tsx:loadTrack[no-widget]',
                message:'loadTrack called before widget init',
                data:{ id, autoPlay },
                timestamp:Date.now()
              })
            }).catch(()=>{});
            // #endregion agent log
            return;
          }
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/574a7f99-6c21-48ad-9731-30948465c78f',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
              sessionId:'debug-session',
              runId:'pre-fix',
              hypothesisId:'H2',
              location:'SoundCloudPlayer.tsx:loadTrack',
              message:'loadTrack called',
              data:{ id, autoPlay },
              timestamp:Date.now()
            })
          }).catch(()=>{});
          // #endregion agent log
          const url = `https://api.soundcloud.com/tracks/${id}`;
          widget.load(url, {
            auto_play: autoPlay,
            buying: false,
          });
        },
        play: () => {
          widgetRef.current?.play();
        },
        pause: () => {
          widgetRef.current?.pause();
        },
        setVolume: (volume: number) => {
          const clamped = Math.min(1, Math.max(0, volume));
          widgetRef.current?.setVolume(clamped * 100);
        },
        seekTo: (seconds: number) => {
          if (!widgetRef.current) return;
          const clamped = Math.max(0, seconds);
          widgetRef.current.seekTo(clamped * 1000);
        },
      }),
      []
    );

    // Если в пропах пришёл trackId, инициализируем его после готовности виджета.
    useEffect(() => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/574a7f99-6c21-48ad-9731-30948465c78f',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'debug-session',
          runId:'pre-fix',
          hypothesisId:'H7',
          location:'SoundCloudPlayer.tsx:effect[ready,trackId]',
          message:'Effect fired for ready/trackId',
          data:{
            ready,
            trackId: trackId ?? null,
            hasWidget: !!widgetRef.current
          },
          timestamp:Date.now()
        })
      }).catch(()=>{});
      // #endregion agent log
      if (!ready) return;
      if (!trackId) return;
      const widget = widgetRef.current;
      if (!widget) return;
      const url = `https://api.soundcloud.com/tracks/${trackId}`;
      widget.load(url, {
        auto_play: true,
        buying: false,
      });
    }, [ready, trackId]);

    // iframe остаётся невидимым, но присутствует в DOM.
    return (
      <iframe
        ref={iframeRef}
        title="soundcloud-player"
        src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/0&auto_play=false"
        width="0"
        height="0"
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: "none",
          border: "none",
        }}
      />
    );
  }
);

SoundCloudPlayer.displayName = "SoundCloudPlayer";

