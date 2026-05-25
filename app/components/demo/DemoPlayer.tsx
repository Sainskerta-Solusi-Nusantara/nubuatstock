"use client";

import * as React from "react";
import Link from "next/link";
import { Play, Pause, SkipForward, SkipBack, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SceneVisualMock } from "./SceneVisuals";
import { DEMO_SCENES, TOTAL_DURATION_MS } from "@/lib/demo/scenes";
import { cn } from "@/lib/utils/cn";

const TICK_MS = 100;

export function DemoPlayer() {
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-tick saat playing
  React.useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsedMs((prev) => {
        if (prev >= TOTAL_DURATION_MS) {
          setIsPlaying(false);
          return TOTAL_DURATION_MS;
        }
        return prev + TICK_MS;
      });
    }, TICK_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  // Current scene compute
  const { scene, sceneStartMs } = React.useMemo(() => {
    let cum = 0;
    for (const s of DEMO_SCENES) {
      if (elapsedMs < cum + s.durationMs) {
        return { scene: s, sceneStartMs: cum };
      }
      cum += s.durationMs;
    }
    return { scene: DEMO_SCENES[DEMO_SCENES.length - 1]!, sceneStartMs: cum - (DEMO_SCENES[DEMO_SCENES.length - 1]?.durationMs ?? 0) };
  }, [elapsedMs]);

  const sceneProgress = scene
    ? Math.min(1, (elapsedMs - sceneStartMs) / scene.durationMs)
    : 0;

  const overallProgress = elapsedMs / TOTAL_DURATION_MS;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const totalSec = Math.floor(TOTAL_DURATION_MS / 1000);

  const skipToScene = (idx: number) => {
    let cum = 0;
    for (let i = 0; i < idx; i += 1) {
      cum += DEMO_SCENES[i]!.durationMs;
    }
    setElapsedMs(cum);
  };

  const restart = () => {
    setElapsedMs(0);
    setIsPlaying(true);
  };

  const next = () => skipToScene(Math.min(DEMO_SCENES.length - 1, scene.index + 1));
  const prev = () => skipToScene(Math.max(0, scene.index - 1));

  return (
    <div className="space-y-4">
      {/* Player */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid lg:grid-cols-[1fr_360px]">
            {/* Left: Visual mockup */}
            <div className="aspect-video bg-secondary/30 lg:aspect-auto lg:min-h-[500px] relative">
              <div key={scene.id} className="absolute inset-0 animate-fade-in">
                <SceneVisualMock visual={scene.visual} />
              </div>
            </div>

            {/* Right: Narration panel */}
            <div className="flex flex-col gap-4 border-t border-border bg-card p-5 lg:border-l lg:border-t-0">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Scene {scene.index + 1} / {DEMO_SCENES.length}
                </div>
                <h2 className="mt-1 text-xl font-bold tracking-tight">{scene.title}</h2>
              </div>

              <p className="text-sm leading-relaxed text-foreground" key={scene.id + "-narration"}>
                {scene.narration}
              </p>

              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Yang dilihat:
                </div>
                <ul className="space-y-1 text-xs">
                  {scene.keyActions.map((action, i) => (
                    <li
                      key={i}
                      className="animate-fade-in flex items-start gap-1.5"
                      style={{ animationDelay: `${i * 200}ms` }}
                    >
                      <span className="text-primary">→</span>
                      <span className="text-muted-foreground">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {scene.cta && (
                <Link
                  href={scene.cta.href}
                  className="inline-flex w-fit items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                >
                  {scene.cta.label} <ExternalLink className="h-3 w-3" />
                </Link>
              )}

              {/* Scene progress */}
              <div className="mt-auto">
                <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{formatTime(elapsedSec)}</span>
                  <span>{formatTime(totalSec)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-100"
                    style={{ width: `${overallProgress * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Controls bar */}
          <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={prev} disabled={scene.index === 0}>
                <SkipBack className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (elapsedMs >= TOTAL_DURATION_MS) {
                    restart();
                  } else {
                    setIsPlaying(!isPlaying);
                  }
                }}
                className="gap-1"
              >
                {elapsedMs >= TOTAL_DURATION_MS ? (
                  <><RotateCcw className="h-3.5 w-3.5" /> Replay</>
                ) : isPlaying ? (
                  <><Pause className="h-3.5 w-3.5 fill-current" /> Pause</>
                ) : (
                  <><Play className="h-3.5 w-3.5 fill-current" /> Play</>
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={next} disabled={scene.index >= DEMO_SCENES.length - 1}>
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Scene dots */}
            <div className="flex items-center gap-1">
              {DEMO_SCENES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => skipToScene(i)}
                  title={s.title}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all",
                    scene.index === i ? "w-6 bg-primary" : "bg-muted hover:bg-muted-foreground/30",
                  )}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scene-by-scene index */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Daftar Scene ({DEMO_SCENES.length} bagian, ~{Math.round(TOTAL_DURATION_MS / 60000)} menit)
          </div>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_SCENES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => skipToScene(i)}
                className={cn(
                  "flex items-start gap-2 rounded-md p-2 text-left transition",
                  scene.index === i
                    ? "bg-primary/10 ring-1 ring-primary"
                    : "hover:bg-accent",
                )}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold">{s.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {Math.round(s.durationMs / 1000)}s
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
