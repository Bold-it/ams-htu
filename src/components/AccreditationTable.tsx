import { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  Mail,
  ChevronDown,
  Check,
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
} from "@/lib/accreditation-data";
import { StatusBadge } from "./StatusBadge";

interface AccreditationTableProps {
  accreditations: Accreditation[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onRowClick: (accreditation: Accreditation) => void;
  onSendReminder: (accreditation: Accreditation) => void;
}

type SortField = "name" | "days";
type SortDirection = "asc" | "desc";

const statusOptions: { value: AccreditationStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
  { value: "expired", label: "Expired" },
];

export function AccreditationTable({
  accreditations,
  selectedIds,
  onSelectionChange,
  onRowClick,
  onSendReminder,
}: AccreditationTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccreditationStatus | "all">("all");
  const [sortField, setSortField] = useState<SortField>("days");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const filteredAndSorted = useMemo(() => {
    let result = [...accreditations];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.programmeName.toLowerCase().includes(searchLower) ||
          a.email.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.programmeName.localeCompare(b.programmeName);
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

  const selectedStatus = statusOptions.find((o) => o.value === statusFilter);

  return (
    <div className="rounded-xl border bg-card shadow-card">
      <div className="border-b p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search programmes or emails..."
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
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    filteredAndSorted.length > 0 &&
                    selectedIds.size === filteredAndSorted.length
                  }
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("name")}
                  className="flex items-center gap-1 text-xs font-medium hover:text-foreground"
                >
                  Programme
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </TableHead>
              <TableHead className="hidden md:table-cell">Start Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("days")}
                  className="flex items-center gap-1 text-xs font-medium hover:text-foreground"
                >
                  Time Remaining
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <p className="text-sm text-muted-foreground">
                    No programmes found
                  </p>
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
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(accreditation.id)}
                      onCheckedChange={() => toggleOne(accreditation.id)}
                      aria-label={`Select ${accreditation.programmeName}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {accreditation.programmeName}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatDisplayDate(accreditation.startDate)}
                  </TableCell>
                  <TableCell>
                    {formatDisplayDate(accreditation.expiryDate)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDaysUntilExpiry(accreditation.daysUntilExpiry)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={accreditation.status} size="sm" />
                  </TableCell>
                  <TableCell className="hidden max-w-[200px] truncate text-muted-foreground lg:table-cell">
                    {accreditation.email || "—"}
                  </TableCell>
                  <TableCell>
                    {(accreditation.status === "warning" ||
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
