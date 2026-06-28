import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { EnergiePrefetch } from "@/components/layout/EnergiePrefetch";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-background bg-gradient-to-b from-[var(--gradient-from)] via-[var(--gradient-via)] to-[var(--gradient-to)] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:max-w-3xl lg:max-w-5xl">
      <EnergiePrefetch />
      <main className="px-4 sm:px-6 md:px-8">
        <AppHeader />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
