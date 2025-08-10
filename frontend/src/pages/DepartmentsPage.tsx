
import { Button } from "@/components/ui/button";

const dummyDepartments = [
  { _id: "1", name: "Computer Science", code: "CS", description: "CS Dept" },
  { _id: "2", name: "Mathematics", code: "Math", description: "Math Dept" },
  { _id: "3", name: "History", code: "Hist", description: "History Dept" },
];

export default function DepartmentsPage() {
  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Departments</h2>
      <table className="w-full border">
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Description</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {dummyDepartments.map((d) => (
            <tr key={d._id} className="border-t">
              <td>{d.name}</td>
              <td>{d.code}</td>
              <td>{d.description}</td>
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
