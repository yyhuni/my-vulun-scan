import AppLayout from "@/components/layout/app-layout";
import ScanOverview from "@/components/pages/scan/overview/scan-overview";

const breadcrumbItems = [
  { name: "扫描总览", current: true },
];

export default function ScanOverviewPage() {
  return (
    <AppLayout breadcrumbItems={breadcrumbItems}>
      <ScanOverview />
    </AppLayout>
  );
} 