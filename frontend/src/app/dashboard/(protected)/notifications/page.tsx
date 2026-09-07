import AdminOnly from "@/components/Dashboard/AdminOnly";
import NotificationsSettings from "@/components/Dashboard/NotificationsSettings";

export default function NotificationsPage() {
  return (
    <AdminOnly>
      <NotificationsSettings />
    </AdminOnly>
  );
}
