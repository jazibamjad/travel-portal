export default function OnePagerLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl bg-white px-8 py-8 print:px-0 print:py-0">{children}</div>;
}
