
import { Button } from "@/components/ui/button";

const dummyEnrollments = [
  { _id: "1", courseName: "Math 101", status: "Active" },
  { _id: "2", courseName: "CS 201", status: "Completed" },
];

export default function EnrollmentsPage() {
  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">My Enrollments</h2>
      <table className="w-full border">
        <thead>
          <tr>
            <th>Course</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {dummyEnrollments.map((e) => (
            <tr key={e._id} className="border-t">
              <td>{e.courseName}</td>
              <td>{e.status}</td>
              <td>
                <Button size="sm">View</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
