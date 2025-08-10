
import { Button } from "@/components/ui/button";

const dummyCourses = [
  { _id: "1", name: "Math 101", description: "Intro to Math", department: "Math", price: 100 },
  { _id: "2", name: "CS 201", description: "Data Structures", department: "CS", price: 150 },
  { _id: "3", name: "History 101", description: "World History", department: "History", price: 120 },
];

export default function CoursesPage() {
  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Courses</h2>
      <table className="w-full border">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Department</th>
            <th>Price</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {dummyCourses.map((c) => (
            <tr key={c._id} className="border-t">
              <td>{c.name}</td>
              <td>{c.description}</td>
              <td>{c.department}</td>
              <td>{c.price}</td>
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
