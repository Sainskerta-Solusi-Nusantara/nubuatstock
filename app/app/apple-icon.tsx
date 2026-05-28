import { ImageResponse } from "next/og";

// Apple touch icon for Nubuat — brand "N" mark on dark background, generated at
// request time via next/og. Next.js wires this into <link rel="apple-touch-icon">.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 116,
          fontWeight: 800,
          fontFamily: "sans-serif",
          letterSpacing: "-0.04em",
        }}
      >
        N
      </div>
    ),
    { ...size },
  );
}
