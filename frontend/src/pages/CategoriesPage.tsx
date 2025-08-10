
import { Button } from "@/components/ui/button";

const dummyCategories = [
  { _id: "1", name: "Science", description: "Science courses", image: "science.png" },
  { _id: "2", name: "Arts", description: "Arts courses", image: "arts.png" },
];

export default function CategoriesPage() {
  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Categories</h2>
      <table className="w-full border">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Image</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {dummyCategories.map((c) => (
            <tr key={c._id} className="border-t">
              <td>{c.name}</td>
              <td>{c.description}</td>
              <td>{c.image}</td>
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
