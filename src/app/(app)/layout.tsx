import { AppShell } from "@/components/shell/Shell";

export default function AppGroupLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
