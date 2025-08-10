
import { Button } from "@/components/ui/button";

const dummyModules = [
  { _id: "1", name: "Intro", order: 1, content: "Welcome to the course", video: "intro.mp4" },
  { _id: "2", name: "Advanced", order: 2, content: "Deep dive", video: "advanced.mp4" },
];

export default function ModulesPage() {
  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Modules</h2>
      <table className="w-full border">
        <thead>
          <tr>
            <th>Name</th>
            <th>Order</th>
            <th>Content</th>
            <th>Video</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {dummyModules.map((m) => (
            <tr key={m._id} className="border-t">
              <td>{m.name}</td>
              <td>{m.order}</td>
              <td>{m.content}</td>
              <td>{m.video}</td>
              <td>
                <Button size="sm">Edit</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
