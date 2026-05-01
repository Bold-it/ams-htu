import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddAccreditation } from "@/hooks/useAccreditations";
import { useAuth } from "@/components/AuthContext";
import { HTU_STRUCTURE } from "@/lib/htu-structure";

export function AddAccreditationDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    programme_name: "",
    accreditation_type: "programme",
    faculty: "",
    department: "",
    start_date: "",
    expiry_date: "",
    email: "",
    workflow_status: "accredited",
    institution_id: "HTU",
    remarks: "",
    programme_category: "EP" as "EP" | "NP",
    first_accreditation_date: "",
  });

  const [customFaculty, setCustomFaculty] = useState(false);
  const [customDept, setCustomDept] = useState(false);
  const [notYetAccredited, setNotYetAccredited] = useState(false);

  const addMutation = useAddAccreditation();
  const { role, department: userDept } = useAuth();

  useEffect(() => {
    if (isOpen && userDept && (role === 'user' || role === 'admin')) {
      // Find faculty for this department if possible
      const facultyObj = HTU_STRUCTURE.find(f => f.departments.some(d => d.name === userDept));
      setForm(f => ({ 
        ...f, 
        department: userDept,
        faculty: facultyObj ? facultyObj.name : f.faculty 
      }));
    }
  }, [isOpen, userDept, role]);

  const selectedFaculty = HTU_STRUCTURE.find(f => f.name === form.faculty);
  const availableDepts = selectedFaculty ? selectedFaculty.departments : [];
  const selectedDept = availableDepts.find(d => d.name === form.department);
  const availableProgrammes = selectedDept ? selectedDept.programmes : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.programme_name) return;
    if (!notYetAccredited && !form.expiry_date) return;

    const payload = {
      ...form,
      expiry_date: notYetAccredited ? "" : form.expiry_date,
      workflow_status: notYetAccredited ? "self_assessment" : form.workflow_status,
    };

    await addMutation.mutateAsync(payload);
    setForm({
      programme_name: "",
      accreditation_type: "programme",
      faculty: "",
      department: "",
      start_date: "",
      expiry_date: "",
      email: "",
      workflow_status: "accredited",
      institution_id: "HTU",
      remarks: "",
      programme_category: "EP" as "EP" | "NP",
      first_accreditation_date: "",
    });
    setCustomFaculty(false);
    setCustomDept(false);
    setNotYetAccredited(false);
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
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Accreditation</DialogTitle>
            <DialogDescription>
              Select the faculty, department, and programme details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="faculty">Faculty / School *</Label>
                {!customFaculty ? (
                  <Select 
                    value={form.faculty} 
                    onValueChange={(val) => {
                      if (val === "OTHER") {
                        setCustomFaculty(true);
                        setForm(f => ({ ...f, faculty: "", department: "" }));
                      } else {
                        setForm(f => ({ ...f, faculty: val, department: "" }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      {HTU_STRUCTURE.map(f => (
                        <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                      ))}
                      <SelectItem value="OTHER">Other...</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter Faculty Name" 
                      value={form.faculty}
                      onChange={(e) => setForm(f => ({ ...f, faculty: e.target.value }))}
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setCustomFaculty(false)}>Reset</Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                {!customDept && !customFaculty ? (
                  <Select 
                    value={form.department} 
                    disabled={!form.faculty}
                    onValueChange={(val) => {
                      if (val === "OTHER") {
                        setCustomDept(true);
                        setForm(f => ({ ...f, department: "" }));
                      } else {
                        setForm(f => ({ ...f, department: val }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={form.faculty ? "Select Department" : "Select Faculty first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDepts.map(d => (
                        <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
                      ))}
                      <SelectItem value="OTHER">Other...</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter Department" 
                      value={form.department}
                      onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))}
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setCustomDept(false); setCustomFaculty(false); }}>Reset</Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="programme_name">Programme Name *</Label>
                <div className="relative">
                  <Input
                    id="programme_name"
                    value={form.programme_name}
                    onChange={(e) => setForm((f) => ({ ...f, programme_name: e.target.value }))}
                    placeholder="Search or type programme"
                    list="programme-suggestions"
                    required
                  />
                  <datalist id="programme-suggestions">
                    {availableProgrammes.map(p => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accreditation_type">Type</Label>
                <Select 
                  value={form.accreditation_type} 
                  onValueChange={(val) => setForm((f) => ({ ...f, accreditation_type: val }))}
                >
                  <SelectTrigger id="accreditation_type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="programme">Programme</SelectItem>
                    <SelectItem value="institutional">Institutional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workflow_status">Workflow Status</Label>
                <Select 
                  value={form.workflow_status} 
                  onValueChange={(val) => setForm((f) => ({ ...f, workflow_status: val }))}
                >
                  <SelectTrigger id="workflow_status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self_assessment">Self-Assessment</SelectItem>
                    <SelectItem value="application_submitted">Application Submitted</SelectItem>
                    <SelectItem value="vetting">GTEC Vetting</SelectItem>
                    <SelectItem value="visitation">GTEC Visitation</SelectItem>
                    <SelectItem value="accredited">Fully Accredited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution_id">Institution ID</Label>
                <Input
                  id="institution_id"
                  value={form.institution_id}
                  onChange={(e) => setForm((f) => ({ ...f, institution_id: e.target.value }))}
                />
              </div>
            </div>

            {/* Not Yet Accredited Toggle */}
            <div className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 p-3">
              <Checkbox
                id="not_yet_accredited"
                checked={notYetAccredited}
                onCheckedChange={(checked) => {
                  setNotYetAccredited(!!checked);
                  if (checked) setForm(f => ({ ...f, expiry_date: "", workflow_status: "self_assessment" }));
                }}
                className="mt-0.5 border-indigo-400 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
              />
              <div>
                <Label htmlFor="not_yet_accredited" className="text-indigo-800 font-semibold cursor-pointer">
                  Not Yet Accredited
                </Label>
                <p className="text-xs text-indigo-600 mt-0.5">
                  Check this for new programmes awaiting GTEC accreditation decision. Expiry date can be added later.
                </p>
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
              {!notYetAccredited && (
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
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="programme_category">Type of Programme Existing/New (EP/NP)</Label>
                <Select 
                  value={form.programme_category} 
                  onValueChange={(val: "EP" | "NP") => setForm((f) => ({ ...f, programme_category: val }))}
                >
                  <SelectTrigger id="programme_category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EP">Existing Programme (EP)</SelectItem>
                    <SelectItem value="NP">New Programme (NP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_accreditation_date">First Accreditation Date</Label>
                <Input
                  id="first_accreditation_date"
                  type="date"
                  value={form.first_accreditation_date}
                  onChange={(e) => setForm((f) => ({ ...f, first_accreditation_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="remarks">Administrative Comments</Label>
                <Input
                  id="remarks"
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  placeholder="Optional notes"
                />
              </div>
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
