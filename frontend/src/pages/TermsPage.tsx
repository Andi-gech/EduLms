
import { Button } from "@/components/ui/button";

const dummyTerms = [
  { _id: "1", name: "2025 Spring", code: "SP25", startDate: "2025-01-10", endDate: "2025-05-20", active: true },
  { _id: "2", name: "2025 Fall", code: "FA25", startDate: "2025-08-15", endDate: "2025-12-20", active: false },
];

export default function TermsPage() {
  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Terms</h2>
      <table className="w-full border">
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {dummyTerms.map((t) => (
            <tr key={t._id} className="border-t">
              <td>{t.name}</td>
              <td>{t.code}</td>
              <td>{t.startDate}</td>
              <td>{t.endDate}</td>
              <td>{t.active ? "Yes" : "No"}</td>
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
