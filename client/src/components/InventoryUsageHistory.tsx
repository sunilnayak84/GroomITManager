import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface UsageHistoryEntry {
  usage_id: string;
  quantity_used: number;
  used_by: string;
  used_at: Date;
  service_id?: string;
  appointment_id?: string;
  notes?: string;
}

interface InventoryUsageHistoryProps {
  usageHistory: UsageHistoryEntry[];
  isLoading: boolean;
  unit: string;
}

export function InventoryUsageHistory({
  usageHistory,
  isLoading,
  unit,
}: InventoryUsageHistoryProps) {
  const [dateFilter, setDateFilter] = useState<Date>();
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  const filteredHistory = usageHistory.filter((entry) => {
    const matchesDate = !dateFilter || format(entry.used_at, 'yyyy-MM-dd') === format(dateFilter, 'yyyy-MM-dd');
    const matchesService = serviceFilter === "all" || entry.service_id === serviceFilter;
    return matchesDate && matchesService;
  });

  const uniqueServices = Array.from(
    new Set(usageHistory.map((entry) => entry.service_id).filter(Boolean))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !dateFilter && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFilter ? format(dateFilter, "PPP") : "Filter by date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFilter}
              onSelect={setDateFilter}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        <Select
          value={serviceFilter}
          onValueChange={setServiceFilter}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {uniqueServices.map((serviceId) => (
              <SelectItem key={serviceId || ''} value={serviceId || ''}>
                Service {serviceId || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {(dateFilter || serviceFilter !== "all") && (
          <Button
            variant="ghost"
            onClick={() => {
              setDateFilter(undefined);
              setServiceFilter("all");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Quantity Used</TableHead>
            <TableHead>Used By</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Appointment</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4">
                <div className="flex items-center justify-center space-x-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  <span>Loading history...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : filteredHistory.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No usage history available
                {(dateFilter || serviceFilter !== "all") && " for the selected filters"}
              </TableCell>
            </TableRow>
          ) : (
            filteredHistory.map((entry) => (
              <TableRow key={entry.usage_id}>
                <TableCell>{format(entry.used_at, "PPP p")}</TableCell>
                <TableCell>{entry.quantity_used} {unit}</TableCell>
                <TableCell>{entry.used_by}</TableCell>
                <TableCell>{entry.service_id || "-"}</TableCell>
                <TableCell>{entry.appointment_id || "-"}</TableCell>
                <TableCell>{entry.notes || "-"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
