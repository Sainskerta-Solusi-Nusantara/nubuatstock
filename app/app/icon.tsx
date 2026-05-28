import { ImageResponse } from "next/og";

// Favicon for Nubuat — brand "N" mark on dark background, generated at request
// time via next/og. Next.js wires this up as the app favicon automatically.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c1117",
          color: "#34d399",
          fontSize: 24,
          fontWeight: 800,
          fontFamily: "sans-serif",
          letterSpacing: "-0.04em",
          borderRadius: 6,
        }}
      >
        N
      </div>
    ),
    { ...size },
  );
}
