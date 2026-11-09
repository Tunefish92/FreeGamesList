/** Renders a 24×24 Simple Icons path. */
export default function BrandIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d={path} />
    </svg>
  );
}
