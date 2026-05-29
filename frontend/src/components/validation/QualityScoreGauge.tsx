interface QualityScoreGaugeProps {
  score: number;
  label: string;
}

export function QualityScoreGauge({ score, label }: QualityScoreGaugeProps) {
  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  const hue = normalized >= 85 ? 150 : normalized >= 65 ? 44 : 5;

  return (
    <section className="quality-gauge" aria-label={`Quality score ${normalized} out of 100`}>
      <div
        className="quality-gauge__ring"
        style={{
          background: `conic-gradient(hsl(${hue} 80% 55%) ${normalized}%, rgba(255,255,255,0.08) 0)`
        }}
      >
        <div className="quality-gauge__inner">
          <div className="quality-gauge__score">{normalized}</div>
          <div className="quality-gauge__label">/100</div>
        </div>
      </div>
      <div className="quality-gauge__meta">
        <strong>{label}</strong>
        <span>FHIR-aware quality snapshot</span>
      </div>
    </section>
  );
}
