/**
 * Structural backdrop for the portal screens.
 *
 * A blueprint grid (CSS, in `.auth-bg`) plus a wireframe cable-stayed bridge
 * elevation drawn as vectors: deck, towers, main cables, hangers and the truss
 * below. Purely decorative and `aria-hidden`, so it adds nothing to the
 * accessibility tree and nothing to the JS bundle beyond this markup.
 */
export default function AuthBackdrop() {
  // Hanger positions between the two towers, spaced every 50 units
  const hangers = [];
  for (let x = 400; x <= 1000; x += 50) {
    // Parabolic cable sag between tower tops (y≈70) and mid-span (y≈150)
    const t = (x - 350) / 700;            // 0 → 1 across the main span
    const y = 70 + 4 * 80 * t * (1 - t);  // vertex form of the sag curve
    hangers.push({ x, y });
  }

  return (
    <>
      <div className="auth-bg" aria-hidden="true" />

      <svg
        className="auth-wireframe"
        viewBox="0 0 1400 260"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        {/* Deck */}
        <path className="deck-line" d="M0 190 H1400" />
        <path className="span-line" d="M0 198 H1400" opacity=".45" />

        {/* Towers */}
        <path className="span-line" d="M350 190 V50 M1050 190 V50" />
        <path className="span-line" d="M336 190 V64 M364 190 V64 M1036 190 V64 M1064 190 V64" opacity=".5" />
        <path className="span-line" d="M336 96 H364 M336 132 H364 M1036 96 H1064 M1036 132 H1064" opacity=".5" />

        {/* Main cables — side spans anchor at deck level, main span sags */}
        <path className="span-line" d="M0 150 Q175 96 350 70" />
        <path className="span-line" d="M350 70 Q700 230 1050 70" />
        <path className="span-line" d="M1050 70 Q1225 96 1400 150" />

        {/* Hangers from cable to deck */}
        {hangers.map(({ x, y }) => (
          <line key={x} className="hanger" x1={x} y1={y} x2={x} y2="190" />
        ))}

        {/* Truss below the deck */}
        <path
          className="span-line"
          opacity=".4"
          d="M0 198 L60 232 L120 198 L180 232 L240 198 L300 232 L360 198 L420 232 L480 198
             L540 232 L600 198 L660 232 L720 198 L780 232 L840 198 L900 232 L960 198
             L1020 232 L1080 198 L1140 232 L1200 198 L1260 232 L1320 198 L1380 232 L1400 198"
        />
        <path className="span-line" d="M0 232 H1400" opacity=".28" />

        {/* Nodes at the structural points */}
        <circle className="node" cx="350" cy="70" r="4" />
        <circle className="node" cx="1050" cy="70" r="4" />
        <circle className="node" cx="700" cy="190" r="3" />
        <circle className="node" cx="0" cy="150" r="3" />
        <circle className="node" cx="1400" cy="150" r="3" />
      </svg>
    </>
  );
}
