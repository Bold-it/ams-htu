import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAddAccreditation } from "@/hooks/useAccreditations";

export function AddAccreditationDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    programme_name: "",
    faculty: "",
    department: "",
    start_date: "",
    expiry_date: "",
    email: "",
  });

  const addMutation = useAddAccreditation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.programme_name || !form.expiry_date) return;

    await addMutation.mutateAsync(form);
    setForm({
      programme_name: "",
      faculty: "",
      department: "",
      start_date: "",
      expiry_date: "",
      email: "",
    });
    setIsOpen(false);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2 bg-accent hover:bg-accent/90">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Add Accreditation</span>
        <span className="sm:hidden">Add</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Accreditation</DialogTitle>
            <DialogDescription>
              Enter the programme accreditation details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="programme_name">Programme Name *</Label>
              <Input
                id="programme_name"
                value={form.programme_name}
                onChange={(e) => setForm((f) => ({ ...f, programme_name: e.target.value }))}
                placeholder="e.g. BSc Computer Science"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="faculty">Faculty / School</Label>
                <Input
                  id="faculty"
                  value={form.faculty}
                  onChange={(e) => setForm((f) => ({ ...f, faculty: e.target.value }))}
                  placeholder="e.g. Faculty of Applied Sciences"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  placeholder="e.g. Computer Science"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date *</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Responsible Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="e.g. dept@htu.edu.gh"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addMutation.isPending} className="bg-accent hover:bg-accent/90">
                {addMutation.isPending ? "Adding..." : "Add Accreditation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog >
    </>
  );
}
