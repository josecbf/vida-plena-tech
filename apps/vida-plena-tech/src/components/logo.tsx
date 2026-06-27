// Marca Vida Plena Tech: "V" de linha tripla dentro de anel quebrado.
// Ver docs/Marca/Especificacao de Marca.md.
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      aria-label="Vida Plena Tech"
    >
      <path
        d="M 105.44 22.19 A 78 78 0 0 1 163.89 55.26 M 176.82 86.46 A 78 78 0 0 1 126.68 173.30 M 73.32 173.30 A 78 78 0 0 1 23.18 86.46 M 36.11 55.26 A 78 78 0 0 1 94.56 22.19"
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="M 64 70 L 100 130 L 136 70 M 75 70 L 100 117 L 125 70 M 86 70 L 100 104 L 114 70"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
