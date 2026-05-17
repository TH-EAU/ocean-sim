import { useBoat } from "../contexts/BoatContext";

const LEVEL_LABELS = ["STOP", "SLOW", "MED", "FULL"] as const;

export default function BoatHUD() {
  const { throttleLevel, windDisplay, cameraMode } = useBoat();

  const windAngleDeg = windDisplay.angle * (180 / Math.PI);

  return (
    <div
      style={{
        position:       "fixed",
        bottom:         "24px",
        right:          "24px",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        gap:            "16px",
        userSelect:     "none",
        fontFamily:     "monospace",
        pointerEvents:  "none",
      }}
    >
      {/* Wind compass */}
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          gap:            "4px",
          background:     "rgba(0,0,0,0.45)",
          borderRadius:   "50%",
          width:          "60px",
          height:         "60px",
          justifyContent: "center",
          border:         "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div
          style={{
            fontSize:   "22px",
            lineHeight: 1,
            color:      "#60a5fa",
            transform:  `rotate(${windAngleDeg}deg)`,
            transition: "transform 0.2s ease",
          }}
        >
          ↑
        </div>
        <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>
          {windDisplay.speed.toFixed(1)} kn
        </div>
      </div>

      {/* Throttle bars — level 3 on top */}
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          gap:            "4px",
          background:     "rgba(0,0,0,0.45)",
          padding:        "10px 12px",
          borderRadius:   "8px",
          border:         "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {[3, 2, 1].map(level => (
          <div
            key={level}
            style={{
              width:        "44px",
              height:       "10px",
              borderRadius: "3px",
              background:   throttleLevel >= level
                ? level === 3 ? "#f87171"
                : level === 2 ? "#fbbf24"
                :               "#4ade80"
                : "rgba(255,255,255,0.1)",
              transition:   "background 0.15s ease",
            }}
          />
        ))}
        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", letterSpacing: "0.05em" }}>
          {LEVEL_LABELS[throttleLevel]}
        </div>
      </div>

      {/* Camera mode indicator */}
      <div
        style={{
          fontSize:   "9px",
          color:      "rgba(255,255,255,0.3)",
          letterSpacing: "0.08em",
        }}
      >
        {cameraMode === "follow" ? "📷 FOLLOW [C]" : "🌐 ORBIT [C]"}
      </div>
    </div>
  );
}
