import { ImageResponse } from "next/og";

// PWA manifest icon (512x512), maskable + any. Generated via next/og — no static
// asset or extra dependency required. Padding keeps the "N" inside the maskable
// safe zone (~80% of the canvas) so it is not clipped on Android adaptive icons.
export const contentType = "image/png";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0c1117 0%, #111a22 100%)",
          color: "#34d399",
          fontSize: 300,
          fontWeight: 800,
          fontFamily: "sans-serif",
          letterSpacing: "-0.04em",
        }}
      >
        N
      </div>
    ),
    { width: 512, height: 512 },
  );
}
