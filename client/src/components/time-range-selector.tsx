import { Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40">
        <Calendar className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Time Period" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Last Week
          </div>
        </SelectItem>
        <SelectItem value="30">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Last Month
          </div>
        </SelectItem>
        <SelectItem value="90">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Last 3 Months
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}