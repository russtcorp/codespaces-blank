import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@diner-saas/ui/button";
import { Input } from "@diner-saas/ui/input";
import type { FetcherWithComponents } from "@remix-run/react";
import { parse, isValid, isBefore } from "date-fns";
import { toast } from "sonner";

interface OperatingHour {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface HoursMatrixProps {
  hours: OperatingHour[];
  fetcher: FetcherWithComponents<any>;
}

interface TimeSlot {
  start: string;
  end: string;
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Helper to parse "HH:mm" string to Date (using arbitrary date)
const parseTime = (timeStr: string) => parse(timeStr, "HH:mm", new Date());

export function HoursMatrix({ hours, fetcher }: HoursMatrixProps) {
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [tempSlots, setTempSlots] = useState<TimeSlot[]>([]);

  // Listen for fetcher success
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      toast.success("Operating hours updated successfully");
    }
  }, [fetcher.state, fetcher.data]);

  // Group hours by day
  const hoursByDay = DAYS.map((day, index) => {
    const dayHours = hours.filter((h) => h.dayOfWeek === index);
    return {
      day,
      dayOfWeek: index,
      slots: dayHours.map((h) => ({
        start: h.startTime,
        end: h.endTime,
      })),
    };
  });

  const handleEditDay = (dayOfWeek: number, currentSlots: TimeSlot[]) => {
    setEditingDay(dayOfWeek);
    setTempSlots(currentSlots.length > 0 ? currentSlots : [{ start: "09:00", end: "17:00" }]);
  };

  const handleAddSlot = () => {
    setTempSlots([...tempSlots, { start: "09:00", end: "17:00" }]);
  };

  const handleRemoveSlot = (index: number) => {
    setTempSlots(tempSlots.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index: number, field: "start" | "end", value: string) => {
    const newSlots = [...tempSlots];
    newSlots[index][field] = value;
    setTempSlots(newSlots);
  };

  const handleSave = () => {
    if (editingDay === null) return;

    // Validate slots using date-fns
    for (const slot of tempSlots) {
      if (!isValid(parseTime(slot.start)) || !isValid(parseTime(slot.end))) {
         toast.error("Invalid time format. Please use HH:MM (e.g., 09:00).");
         return;
      }

      if (!isBefore(parseTime(slot.start), parseTime(slot.end))) {
        toast.error(`Start time (${slot.start}) must be before end time (${slot.end})`);
        return;
      }
    }

    // Sort slots by start time to keep data clean
    const sortedSlots = [...tempSlots].sort((a, b) => 
        parseTime(a.start).getTime() - parseTime(b.start).getTime()
    );

    const formData = new FormData();
    formData.append("intent", "update-hours");
    formData.append("dayOfWeek", editingDay.toString());
    formData.append("hours", JSON.stringify(sortedSlots));

    fetcher.submit(formData, { method: "post" });
    setEditingDay(null);
    setTempSlots([]);
  };

  const handleCancel = () => {
    setEditingDay(null);
    setTempSlots([]);
  };

  return (
    <div className="space-y-2">
      {hoursByDay.map((day) => (
        <div
          key={day.dayOfWeek}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <div className="flex-1">
            <p className="font-medium">{day.day}</p>
            {editingDay === day.dayOfWeek ? (
              <div className="mt-2 space-y-2">
                {tempSlots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={slot.start}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleSlotChange(index, "start", e.target.value)
                      }
                      className="w-32"
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      value={slot.end}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleSlotChange(index, "end", e.target.value)
                      }
                      className="w-32"
                    />
                    {tempSlots.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveSlot(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddSlot}
                  >
                    + Add Split Shift
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-1 text-sm text-gray-600">
                {day.slots.length === 0 ? (
                  <span className="text-red-600">Closed</span>
                ) : (
                  day.slots.map((slot, index) => (
                    <div key={index}>
                      {/* Format for display using date-fns if desired, currently keeping 24h as per input */}
                      {slot.start} - {slot.end}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {editingDay === day.dayOfWeek ? (
              <>
                <Button size="sm" onClick={handleSave}>
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditDay(day.dayOfWeek, day.slots)}
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      ))}

      <p className="mt-4 text-sm text-gray-600">
        💡 Tip: Add multiple time slots for split shifts (e.g., breakfast and dinner service)
      </p>
    </div>
  );
}
