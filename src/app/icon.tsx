import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", background: "linear-gradient(145deg, #0F4C5C, #16A085)", fontSize: 270, fontFamily: "Arial", fontWeight: 800, letterSpacing: -25 }}>F</div>,
    size,
  );
}
