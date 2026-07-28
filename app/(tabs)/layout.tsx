import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { EnergiePrefetch } from "@/components/layout/EnergiePrefetch";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell min-h-dvh">
      <EnergiePrefetch />
      <div className="mx-auto flex min-h-dvh w-full max-w-md md:max-w-none lg:max-w-6xl">
        <BottomNav />
        <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          <main className="flex-1 px-4 sm:px-6 lg:px-8">
            <AppHeader />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
