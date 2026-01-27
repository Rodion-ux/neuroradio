"use client";

import { memo, useEffect, useRef } from "react";

type AudioWaveProps = {
  isPlaying: boolean;
  className?: string;
  canvasClassName?: string;
  lineWidth?: number;
  levelRef?: React.MutableRefObject<number>;
};

type WaveConfig = {
  color: string;
  speed: number;
  amplitude: number;
  phaseOffset: number;
  yOffset: number;
};

export const AudioWave = memo(function AudioWave({
  isPlaying,
  className,
  canvasClassName,
  lineWidth = 2,
  levelRef,
}: AudioWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const waveConfigsRef = useRef<WaveConfig[]>([]);
  const beatIntensityRef = useRef(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (waveConfigsRef.current.length) return;
    const colors = ["#ff77a8", "#6bf3ff", "#ffb35c", "#a57cff"];
    waveConfigsRef.current = colors.map((color) => ({
      color,
      speed: 0.6 + Math.random() * 1.4,
      amplitude: 0.2 + Math.random() * 0.45,
      phaseOffset: Math.random() * Math.PI * 2,
      yOffset: (Math.random() - 0.5) * 0.18,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frameId = 0;
    let width = 0;
    let height = 0;
    let amplitudeScale = 0.12;

    const resize = () => {
      const nextWidth = canvas.offsetWidth;
      const nextHeight = canvas.offsetHeight;
      if (!nextWidth || !nextHeight) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(nextWidth * dpr);
      canvas.height = Math.floor(nextHeight * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      width = nextWidth;
      height = nextHeight;
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const render = (time: number) => {
      const energy = levelRef?.current ?? 0.35;
      const isActive = isPlayingRef.current;

      // "Удар" по бочке: если уровень энергии выше порога — резко поднимаем beatIntensity.
      if (isActive && energy > 0.7) {
        beatIntensityRef.current = Math.min(
          1.8,
          beatIntensityRef.current + (energy - 0.7) * 2.2
        );
      } else {
        beatIntensityRef.current *= 0.86;
      }

      const beatBoost = 1.2 + beatIntensityRef.current * 1.4;

      const target = isActive
        ? Math.min(2.1, Math.max(0.08, energy * beatBoost))
        : 0.01; // когда пауза — почти плоская линия
      amplitudeScale += (target - amplitudeScale) * 0.35;

      context.clearRect(0, 0, width, height);
      context.lineCap = "square";
      context.globalCompositeOperation = "lighter";

      const centerY = height / 2;
      const t = time * 0.001;

      const configs = waveConfigsRef.current;
      configs.forEach((wave, waveIndex) => {
        // При паузе амплитуда принудительно обнуляется — получаем почти ровную линию.
        const amplitude = isActive
          ? wave.amplitude * amplitudeScale * height * 0.7
          : 0;
        const step = Math.max(2, Math.floor(width / 120));
        context.beginPath();
        let prevY = centerY;
        for (let x = 0; x <= width; x += step) {
          const progress = x / Math.max(width, 1);
          const angle =
            progress * Math.PI * 2 * 2.4 +
            wave.phaseOffset +
            t * wave.speed * (1.2 + waveIndex * 0.15);
          // Хаос по вертикали: чем выше энергия, тем сильнее дрожание.
          const jitterBase =
            isActive && amplitude > 0
              ? (levelRef?.current ?? 0.35) * (0.6 + waveIndex * 0.25)
              : 0;
          const jitter = (Math.random() - 0.5) * jitterBase * height;
          const y =
            centerY +
            wave.yOffset * height +
            Math.sin(angle) * amplitude +
            jitter;
          if (x === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, prevY);
            context.lineTo(x, y);
          }
          prevY = y;
        }
        context.strokeStyle = wave.color;
        context.shadowBlur = 16;
        context.shadowColor = wave.color;
        // Толщина линий тоже реагирует на удары бочки. На паузе возвращаемся к базовой.
        context.lineWidth = isActive
          ? lineWidth * (1.2 + beatIntensityRef.current * 1.4)
          : lineWidth;
        context.stroke();
      });

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [lineWidth, levelRef]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className={canvasClassName ?? "h-32 w-full max-w-2xl sm:h-40"}
        aria-hidden="true"
      />
    </div>
  );
});
