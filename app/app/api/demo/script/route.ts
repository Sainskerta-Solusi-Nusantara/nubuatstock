import { NextResponse } from "next/server";
import { DEMO_SCENES, TOTAL_DURATION_MS } from "@/lib/demo/scenes";

/**
 * Generate Markdown script untuk video production team.
 * Format: structured per scene dengan narration, duration, key actions, B-roll suggestions.
 */
export async function GET() {
  const totalMinutes = (TOTAL_DURATION_MS / 60000).toFixed(1);

  const md = `# Nubuat Demo Video Script
**Duration target:** ~${totalMinutes} menit
**Language:** Bahasa Indonesia
**Tone:** Profesional, informatif, tidak hype
**Voice:** Slow-paced (~140 kata/menit), clear articulation

---

## Production Notes

- **Recording:** OBS Studio atau Loom dengan 1920×1080 60fps
- **Voice-over:** Studio quality mic (Rode NT-USB+ or similar), pop filter, treated room
- **Music:** Background ambient (royalty-free, mis. epidemicsound) — volume max -18dB
- **Cuts:** Hard cut antar scene, 0.3s fade
- **Subtitle:** Bilingual ID + EN burn-in (size 24pt, position bottom-center)
- **Brand element:** Logo Nubuat di pojok kanan atas (12% opacity)

---

${DEMO_SCENES.map((s, i) => `## Scene ${i + 1}: ${s.title}
**Duration:** ${Math.round(s.durationMs / 1000)} detik
**Visual:** \`${s.visual}\`

### Narration (Voice-Over)
${s.narration}

### Yang harus tampil di layar (Key Actions)
${s.keyActions.map((a) => `- ${a}`).join("\n")}

### B-Roll Suggestions
- Open: ${getBRollOpen(s.visual)}
- Mid: Smooth pan/zoom ke detail yang sedang dibicarakan narrator
- End: ${i < DEMO_SCENES.length - 1 ? `Transition wipe ke scene berikutnya (${DEMO_SCENES[i + 1]!.title})` : "Fade ke logo + CTA"}

${s.cta ? `### Call-to-Action Overlay
"${s.cta.label}" → ${s.cta.href}` : ""}

---
`).join("\n")}

## Post-Production Checklist

- [ ] Color grading (warm but professional)
- [ ] Audio levels normalized -16 LUFS
- [ ] Subtitle review oleh native ID speaker
- [ ] Subtitle EN translation
- [ ] Export 4K master + 1080p web + 720p mobile
- [ ] Thumbnail design dengan strong visual hook
- [ ] Upload ke YouTube + embed di /demo dan /

## Distribution Plan

| Platform | Format | Duration |
|---|---|---|
| Website hero (/demo) | 1080p MP4 | Full (~3 min) |
| YouTube | 1080p MP4 + chapters | Full |
| Instagram Reels | 9:16 vertical crop | 60s teaser cut |
| LinkedIn | 16:9 native | Full + 60s clip |
| TikTok | 9:16 vertical | Best 30s scene-by-scene |
| Email onboarding | Embedded thumbnail → YouTube link | Full |

`;

  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="nubuat-demo-script-${new Date().toISOString().slice(0, 10)}.md"`,
    },
  });
}

function getBRollOpen(visual: string): string {
  const map: Record<string, string> = {
    intro: "Logo Nubuat zoom-in dengan particle animation. Background gradient biru ke ungu.",
    dashboard: "Cursor click ke menu Dashboard, page transition fade. Smooth scroll dari atas ke Morning Brief card.",
    daily_picks: "Hover ke pick card pertama, animated tooltip muncul dengan entry/SL/TP highlight.",
    ticker_overview: "Screen recording: typing 'BBRI' di Cmd+K palette, instant navigation ke /ticker/BBRI.",
    verdict: "Verdict gauge animation dari 0 ke 7.5. Each factor bar fill-in sequentially 0.5s gap.",
    wyckoff: "Wyckoff phase emoji animation. Elliott Wave numbers (1-2-3-4-5) appear sequentially di sebelah pivot points.",
    screener: "Click preset 'Mode Swing Santai' button. Result table populate dengan stagger animation 100ms per row.",
    ai_copilot: "Typing 'Bandingkan BBRI vs BMRI' di chat input. Tool call chips appear pertama, then streaming response.",
    paper_trading: "Click 'Paper Buy' di ticker page. Modal slide-in dengan quantity input. Confirm. Toast notification + portfolio update.",
    outro: "Logo + tagline reveal. CTA button pulse animation. Pricing badge slide-in.",
  };
  return map[visual] ?? "Screen recording flow natural di feature";
}
