import { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  Mail,
  ChevronDown,
  Check,
  BellOff,
  AlertCircle,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accreditation,
  AccreditationStatus,
  formatDisplayDate,
  formatDaysUntilExpiry,
  getWorkflowLabel,
  getAccreditationTypeLabel,
} from "@/lib/accreditation-data";
import { StatusBadge } from "./StatusBadge";

interface AccreditationTableProps {
  accreditations: Accreditation[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onRowClick: (accreditation: Accreditation) => void;
  onSendReminder: (accreditation: Accreditation) => void;
  isAdmin?: boolean;
}

type SortField = "name" | "days" | "faculty" | "department";
type SortDirection = "asc" | "desc";

const statusOptions: { value: AccreditationStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "upcoming", label: "Upcoming" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
  { value: "expired", label: "Expired" },
  { value: "snoozed", label: "Snoozed" },
];

export function AccreditationTable({
  accreditations,
  selectedIds,
  onSelectionChange,
  onRowClick,
  onSendReminder,
  isAdmin = false,
}: AccreditationTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccreditationStatus | "all">("all");
  const [sortField, setSortField] = useState<SortField>("days");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [facultyFilter, setFacultyFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const filteredAndSorted = useMemo(() => {
    let result = [...accreditations];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.programmeName.toLowerCase().includes(searchLower) ||
          (a.remarks && a.remarks.toLowerCase().includes(searchLower)) ||
          a.faculty.toLowerCase().includes(searchLower) ||
          a.department.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }

    // Filter by faculty
    if (facultyFilter !== "all") {
      result = result.filter((a) => a.faculty === facultyFilter);
    }

    // Filter by department
    if (departmentFilter !== "all") {
      result = result.filter((a) => a.department === departmentFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.programmeName.localeCompare(b.programmeName);
      } else if (sortField === "faculty") {
        comparison = a.faculty.localeCompare(b.faculty);
      } else if (sortField === "department") {
        comparison = a.department.localeCompare(b.department);
      } else {
        comparison = a.daysUntilExpiry - b.daysUntilExpiry;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [accreditations, search, statusFilter, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredAndSorted.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(filteredAndSorted.map((a) => a.id)));
    }
  };

  const toggleOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange(newSet);
  };

  const faculties = useMemo(() => {
    const set = new Set(accreditations.map(a => a.faculty));
    return Array.from(set).filter(Boolean).sort();
  }, [accreditations]);

  const departments = useMemo(() => {
    const set = new Set(
      accreditations
        .filter(a => facultyFilter === "all" || a.faculty === facultyFilter)
        .map(a => a.department)
    );
    return Array.from(set).filter(Boolean).sort();
  }, [accreditations, facultyFilter]);

  const selectedStatus = statusOptions.find((o) => o.value === statusFilter);

  return (
    <div className="rounded-xl border bg-card shadow-card">
      <div className="border-b p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search programmes or comments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {selectedStatus?.label}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {statusOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className="gap-2"
                  >
                    {statusFilter === option.value && (
                      <Check className="h-4 w-4" />
                    )}
                    <span className={statusFilter !== option.value ? "ml-6" : ""}>
                      {option.label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {isAdmin && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      filteredAndSorted.length > 0 &&
                      selectedIds.size === filteredAndSorted.length
                    }
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead className="w-12 text-[10px] font-bold uppercase tracking-wider text-slate-500">S/No.</TableHead>
              <TableHead className="min-w-[200px]">
                <button
                  onClick={() => toggleSort("name")}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-foreground"
                >
                  Programme
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </TableHead>
              <TableHead className="min-w-[180px]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSort("faculty")}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-foreground transition-colors"
                  >
                    Faculty
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Filter className={`h-3 w-3 ${facultyFilter !== "all" ? "text-primary fill-primary" : "text-slate-400"}`} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onClick={() => { setFacultyFilter("all"); setDepartmentFilter("all"); }}>
                        <Check className={`mr-2 h-4 w-4 ${facultyFilter === "all" ? "opacity-100" : "opacity-0"}`} />
                        All Faculties
                      </DropdownMenuItem>
                      {faculties.map(f => (
                        <DropdownMenuItem key={f} onClick={() => { setFacultyFilter(f); setDepartmentFilter("all"); }}>
                          <Check className={`mr-2 h-4 w-4 ${facultyFilter === f ? "opacity-100" : "opacity-0"}`} />
                          {f}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableHead>
              <TableHead className="min-w-[180px]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSort("department")}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-foreground transition-colors"
                  >
                    Department
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={facultyFilter === "all"}>
                        <Filter className={`h-3 w-3 ${departmentFilter !== "all" ? "text-primary fill-primary" : "text-slate-400"}`} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onClick={() => setDepartmentFilter("all")}>
                        <Check className={`mr-2 h-4 w-4 ${departmentFilter === "all" ? "opacity-100" : "opacity-0"}`} />
                        All Departments
                      </DropdownMenuItem>
                      {departments.map(d => (
                        <DropdownMenuItem key={d} onClick={() => setDepartmentFilter(d)}>
                          <Check className={`mr-2 h-4 w-4 ${departmentFilter === d ? "opacity-100" : "opacity-0"}`} />
                          {d}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableHead>
              <TableHead className="min-w-[180px] text-[10px] font-bold uppercase tracking-wider text-slate-500">Type of Programme Existing/New (EP/NP)</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">First Accreditation</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Accreditation</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Expiry Date of Current Accreditation</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Workflow Stage</TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("days")}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-foreground"
                >
                  Time Remaining
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Alert Status</TableHead>
              <TableHead className="min-w-[200px] text-[10px] font-bold uppercase tracking-wider text-slate-500">Comments</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 12 : 11} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="p-4 bg-slate-50 rounded-full">
                      <Search className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="font-semibold text-slate-600">No programmes found</p>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto">
                      {search || statusFilter !== "all" 
                        ? "Adjust your filters or search terms to find what you're looking for." 
                        : "There are currently no accreditation programmes registered in the system."}
                    </p>
                  </div>

                </TableCell>
              </TableRow>
            ) : (
              filteredAndSorted.map((accreditation) => (
                <TableRow
                  key={accreditation.id}
                  className="table-row-interactive"
                  onClick={(e) => {
                    // Don't trigger row click if clicking checkbox or button
                    if (
                      (e.target as HTMLElement).closest("button") ||
                      (e.target as HTMLElement).closest('[role="checkbox"]')
                    ) {
                      return;
                    }
                    onRowClick(accreditation);
                  }}
                >
                  {isAdmin && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(accreditation.id)}
                        onCheckedChange={() => toggleOne(accreditation.id)}
                        aria-label={`Select ${accreditation.programmeName}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="text-slate-400 font-mono text-[10px]">
                    {(filteredAndSorted.indexOf(accreditation) + 1).toString().padStart(2, '0')}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        {accreditation.programmeName}
                        {accreditation.snoozedUntil && new Date(accreditation.snoozedUntil) > new Date() && (
                          <BellOff className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                      {(!accreditation.remarks || !accreditation.firstAccreditationDate) && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <AlertCircle className="h-2.5 w-2.5" />
                            Incomplete Legacy Info
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {accreditation.faculty}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {accreditation.department}
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-slate-600">
                    {accreditation.programmeCategory || "EP"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {accreditation.firstAccreditationDate ? formatDisplayDate(accreditation.firstAccreditationDate) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDisplayDate(accreditation.startDate)}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">
                    {formatDisplayDate(accreditation.expiryDate)}
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] font-bold uppercase tracking-tight bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      {getWorkflowLabel(accreditation.workflowStatus)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-slate-500">
                    {formatDaysUntilExpiry(accreditation.daysUntilExpiry)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge 
                      status={accreditation.status} 
                      size="sm" 
                      isSnoozed={accreditation.snoozedUntil ? new Date(accreditation.snoozedUntil) > new Date() : false} 
                    />
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate text-muted-foreground font-medium italic text-slate-500 text-sm" title={accreditation.remarks}>
                    {accreditation.remarks || "—"}
                  </TableCell>
                  <TableCell>
                    {isAdmin && (accreditation.status === "warning" ||
                      accreditation.status === "critical" ||
                      accreditation.status === "expired") &&
                      accreditation.email && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSendReminder(accreditation);
                          }}
                          title="Send reminder email"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Showing {filteredAndSorted.length} of {accreditations.length} programmes
          {selectedIds.size > 0 && (
            <span className="ml-2 font-medium text-foreground">
              · {selectedIds.size} selected
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
