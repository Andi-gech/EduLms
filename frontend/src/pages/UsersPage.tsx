
import { Button } from "@/components/ui/button";

const dummyUsers = [
  { _id: "1", fullName: "Alice Smith", email: "alice@example.com", role: "student", department: "CS" },
  { _id: "2", fullName: "Bob Johnson", email: "bob@example.com", role: "teacher", department: "Math" },
  { _id: "3", fullName: "Carol Lee", email: "carol@example.com", role: "Registrar", department: "Admin" },
];

export default function UsersPage() {
  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Users</h2>
      <table className="w-full border">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Department</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {dummyUsers.map((u) => (
            <tr key={u._id} className="border-t">
              <td>{u.fullName}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.department}</td>
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
