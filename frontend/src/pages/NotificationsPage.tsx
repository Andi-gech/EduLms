
export default function NotificationsPage() {
  const dummyNotifications = [
    { _id: "1", message: "Welcome to the platform!", date: "2025-08-01" },
    { _id: "2", message: "Your course starts soon.", date: "2025-08-10" },
  ];
  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Notifications</h2>
      <ul className="space-y-2">
        {dummyNotifications.map((n) => (
          <li key={n._id} className="border p-2 rounded">
            <div>{n.message}</div>
            <div className="text-xs text-gray-500">{n.date}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
