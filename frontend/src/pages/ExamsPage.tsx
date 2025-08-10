
import { Button } from "@/components/ui/button";

const dummyExams = [
  { _id: "1", CourseModule: "Module 1", examDate: "2025-03-10" },
  { _id: "2", CourseModule: "Module 2", examDate: "2025-04-15" },
];

export default function ExamsPage() {
  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Exams</h2>
      <table className="w-full border">
        <thead>
          <tr>
            <th>Module</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {dummyExams.map((e) => (
            <tr key={e._id} className="border-t">
              <td>{e.CourseModule}</td>
              <td>{e.examDate}</td>
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
