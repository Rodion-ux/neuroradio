"use client";

import { memo, useEffect, useMemo, useRef } from "react";

type AudioWaveProps = {
  isPlaying: boolean;
  className?: string;
  canvasClassName?: string;
  lineWidth?: number;
  colors?: Array<[number, number, number]>;
  levelRef?: React.MutableRefObject<number>;
};

const DEFAULT_COLORS: Array<[number, number, number]> = [];

const hslToRgb = (hue: number, saturation: number, lightness: number) => {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue >= 0 && hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ] as [number, number, number];
};

const randomNeonColor = (): [number, number, number] => {
  const hue = Math.random() * 360;
  const saturation = 75 + Math.random() * 25;
  const lightness = 45 + Math.random() * 20;
  return hslToRgb(hue, saturation, lightness);
};

const createWaves = (count: number, colors: Array<[number, number, number]>) =>
  Array.from({ length: count }, (_, index) => ({
    amplitude: 0.18 + Math.random() * 0.38,
    frequency: 1.2 + Math.random() * 2.4,
    speed: 0.6 + Math.random() * 1.4,
    phase: Math.random() * Math.PI * 2,
    color: colors.length ? colors[index % colors.length] : randomNeonColor(),
    opacity: 0.12 + Math.random() * 0.3,
  }));

export const AudioWave = memo(function AudioWave({
  isPlaying,
  className,
  canvasClassName,
  lineWidth = 2,
  colors = DEFAULT_COLORS,
  levelRef,
}: AudioWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const waveCountRef = useRef(4 + Math.floor(Math.random() * 3));
  const waves = useMemo(() => createWaves(waveCountRef.current, colors), [colors]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frameId = 0;
    let width = 0;
    let height = 0;
    let amplitudeScale = 0.08;

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
      const target = isPlayingRef.current
        ? Math.min(1.4, Math.max(0.05, energy))
        : 0.04;
      amplitudeScale += (target - amplitudeScale) * 0.26;

      context.clearRect(0, 0, width, height);
      context.lineCap = "square";
      context.globalCompositeOperation = "lighter";

      const centerY = height / 2;
      const t = time * 0.001;

      waves.forEach((wave) => {
        const [r, g, b] = wave.color;
        const amplitude = wave.amplitude * amplitudeScale * height * 0.5;
        const step = Math.max(4, Math.floor(width / 80));
        context.beginPath();
        let prevY = centerY;
        for (let x = 0; x <= width; x += step) {
          const progress = x / Math.max(width, 1);
          const angle =
            progress * Math.PI * 2 * wave.frequency + wave.phase + t * wave.speed;
          const y = centerY + Math.sin(angle) * amplitude;
          if (x === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, prevY);
            context.lineTo(x, y);
          }
          prevY = y;
        }
        context.strokeStyle = `rgba(${r}, ${g}, ${b}, ${wave.opacity + 0.2})`;
        context.shadowBlur = 12;
        context.shadowColor = `rgba(${r}, ${g}, ${b}, ${wave.opacity})`;
        context.lineWidth = lineWidth;
        context.stroke();
      });

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [waves, lineWidth, levelRef]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className={canvasClassName ?? "h-20 w-full max-w-2xl sm:h-24"}
        aria-hidden="true"
      />
    </div>
  );
});
