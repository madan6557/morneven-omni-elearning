export function Spinner({ size = 16 }: { size?: number }) {
  return <span aria-hidden="true" className="inline-block animate-spin rounded-full border-2 border-current border-r-transparent" style={{ width: size, height: size }} />;
}
