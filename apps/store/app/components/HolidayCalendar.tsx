import * as React from "react";
import { useState } from "react";
import { Button } from "@diner-saas/ui/button";
import { Input } from "@diner-saas/ui/input";
import { Card } from "@diner-saas/ui/card";
import type { FetcherWithComponents } from "@remix-run/react";
import { format } from "date-fns";

interface SpecialDate {
  id: number;
  date_iso: string;
  status: string;
  reason: string;
}

interface HolidayCalendarProps {
  specialDates: SpecialDate[];
  fetcher: FetcherWithComponents<any>;
}

const FEDERAL_HOLIDAYS = [
  { name: "New Year's Day", month: 1, day: 1 },
  { name: "Martin Luther King Jr. Day", month: 1, day: 15 }, // Approximate
  { name: "Presidents' Day", month: 2, day: 19 }, // Approximate
  { name: "Memorial Day", month: 5, day: 27 }, // Approximate
  { name: "Independence Day", month: 7, day: 4 },
  { name: "Labor Day", month: 9, day: 2 }, // Approximate
  { name: "Columbus Day", month: 10, day: 14 }, // Approximate
  { name: "Veterans Day", month: 11, day: 11 },
  { name: "Thanksgiving", month: 11, day: 28 }, // Approximate
  { name: "Christmas Day", month: 12, day: 25 },
];

export function HolidayCalendar({ specialDates, fetcher }: HolidayCalendarProps) {
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [customStatus, setCustomStatus] = useState("closed");

  const currentYear = new Date().getFullYear();

  const handleAddFederalHoliday = (holiday: typeof FEDERAL_HOLIDAYS[0]) => {
    const dateIso = `${currentYear}-${String(holiday.month).padStart(2, "0")}-${String(holiday.day).padStart(2, "0")}`;
    
    const formData = new FormData();
    formData.append("intent", "add-special-date");
    formData.append("date", dateIso);
    formData.append("status", "closed");
    formData.append("reason", `Closed for ${holiday.name}`);

    fetcher.submit(formData, { method: "post" });
  };

  const handleAddCustom = () => {
    if (!customDate || !customReason) {
      alert("Please fill in all fields");
      return;
    }

    const formData = new FormData();
    formData.append("intent", "add-special-date");
    formData.append("date", customDate);
    formData.append("status", customStatus);
    formData.append("reason", customReason);

    fetcher.submit(formData, { method: "post" });

    setIsAddingCustom(false);
    setCustomDate("");
    setCustomReason("");
    setCustomStatus("closed");
  };

  const handleDelete = (id: number) => {
    if (!confirm("Remove this special date?")) return;

    const formData = new FormData();
    formData.append("intent", "delete-special-date");
    formData.append("id", id.toString());

    fetcher.submit(formData, { method: "post" });
  };

  return (
    <div className="space-y-6">
      {/* Existing Special Dates */}
      <div>
        <h3 className="mb-3 font-semibold">Configured Special Dates</h3>
        {specialDates.length === 0 ? (
          <p className="text-sm text-gray-500">No special dates configured yet.</p>
        ) : (
          <div className="space-y-2">
            {specialDates.map((date) => (
              <div
                key={date.id}
                className="flex items-center justify-between rounded border p-3"
              >
                <div>
                  <p className="font-medium">
                    {format(new Date(date.date_iso), "MMMM d, yyyy")}
                  </p>
                  <p className="text-sm text-gray-600">{date.reason}</p>
                  <span
                    className={`mt-1 inline-block rounded px-2 py-1 text-xs font-medium ${
                      date.status === "closed"
                        ? "bg-red-100 text-red-800"
                        : date.status === "open"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {date.status}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(date.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Custom Date */}
      <div>
        <h3 className="mb-3 font-semibold">Add Special Date</h3>
        {!isAddingCustom ? (
          <Button onClick={() => setIsAddingCustom(true)}>
            + Add Custom Date
          </Button>
        ) : (
          <Card className="p-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="closed">Closed</option>
                  <option value="open">Open</option>
                  <option value="limited">Limited Hours</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reason
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Closed for private event"
                  value={customReason}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomReason(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCustom}>Save</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingCustom(false);
                    setCustomDate("");
                    setCustomReason("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Quick Add Federal Holidays */}
      <div>
        <h3 className="mb-3 font-semibold">Quick Add Federal Holidays</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {FEDERAL_HOLIDAYS.map((holiday) => {
            const dateIso = `${currentYear}-${String(holiday.month).padStart(2, "0")}-${String(holiday.day).padStart(2, "0")}`;
            const alreadyAdded = specialDates.some((d) => d.date_iso === dateIso);

            return (
              <Button
                key={holiday.name}
                variant="outline"
                size="sm"
                onClick={() => handleAddFederalHoliday(holiday)}
                disabled={alreadyAdded}
                className="justify-start"
              >
                {holiday.name} {alreadyAdded && "✓"}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
