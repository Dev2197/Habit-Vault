import { Button } from "./ui/button";

interface TimeRangeSelectorProps {
  value: string;
}

export default function TimeRangeSelector({ value }: TimeRangeSelectorProps) {
  return (
    <Button className="inline-flex items-center">
      {value === "7" ? "Last Week" : "Last Month"}
    </Button>
  );
}
