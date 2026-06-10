export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-md bg-primary font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontFamily: 'var(--font-serif)',
        fontSize: size * 0.56,
      }}
    >
      A
    </span>
  );
}
