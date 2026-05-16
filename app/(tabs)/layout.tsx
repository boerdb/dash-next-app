import { BottomNav } from "@/components/layout/BottomNav";
import { EnergiePrefetch } from "@/components/layout/EnergiePrefetch";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[#0a0a0a] pb-24">
      <EnergiePrefetch />
      <main className="px-4 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
