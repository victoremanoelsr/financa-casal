import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", background: "linear-gradient(145deg, #0F4C5C, #16A085)", fontSize: 98, fontFamily: "Arial", fontWeight: 800, letterSpacing: -8 }}>F</div>,
    size,
  );
}
