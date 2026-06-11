import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "The Pollitos Awards - Team Pollito";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f8d400",
          position: "relative",
          overflow: "hidden",
          fontFamily: '"Arial Black", Arial, sans-serif',
          color: "#111111",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "900px",
            height: "470px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              background: "#111111",
              color: "#f8d400",
              borderRadius: "22px",
              padding: "16px 28px",
              fontSize: "40px",
              lineHeight: 1,
              marginBottom: "34px",
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
            }}
          >
            1ER ANIVERSARIO
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              lineHeight: 0.88,
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "110px",
                color: "#111111",
                letterSpacing: "-0.06em",
                marginBottom: "10px",
              }}
            >
              The
            </div>

            <div
              style={{
                display: "flex",
                background: "#f3f3f3",
                color: "#f05a00",
                border: "6px solid #111111",
                borderRadius: "16px",
                padding: "12px 28px 10px 28px",
                fontSize: "102px",
                letterSpacing: "-0.06em",
                marginBottom: "16px",
                boxShadow: "10px 10px 0 #111111",
              }}
            >
              Pollitos
            </div>

            <div
              style={{
                display: "flex",
                fontSize: "110px",
                color: "#111111",
                letterSpacing: "-0.06em",
              }}
            >
              Awards
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}