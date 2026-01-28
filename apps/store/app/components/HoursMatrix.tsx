import { Card } from "@diner-saas/ui/card";
import { Button } from "@diner-saas/ui/button";
import { Input } from "@diner-saas/ui/input";
import { useFetcher } from "@remix-run/react";
import { INTENTS } from "@diner-saas/db/intents";
import * as Form from '@radix-ui/react-form';
// ... other imports

interface OperatingHour {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface HoursMatrixProps {
  initialHours: OperatingHour[];
  emergencyCloseReason?: string | null;
}

export function HoursMatrix({ initialHours, emergencyCloseReason }: HoursMatrixProps) {
    const fetcher = useFetcher();

    const handleEmergencyClose = (formData: FormData) => {
        formData.append("intent", "emergency-close");
        fetcher.submit(formData, { method: "post" });
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

    return (
        <Card>
            <Card.Header>
                <Card.Title>Emergency Override</Card.Title>
                <Card.Description>Instantly close your store and display a message.</Card.Description>
            </Card.Header>
            <Card.Content>
                <Form.Root onSubmit={(e) => {
                    e.preventDefault();
                    handleEmergencyClose(new FormData(e.currentTarget));
                }}>
                    <div className="flex items-center space-x-4">
                        <Form.Field name="emergencyCloseReason" className="flex-grow">
                            <Form.Control asChild>
                                <Input 
                                    placeholder="e.g., Closed due to a power outage."
                                    defaultValue={emergencyCloseReason || ""}
                                    required={!emergencyCloseReason} // Only require a reason if we are closing
                                />
                            </Form.Control>
                            <Form.Message className="text-red-500 text-xs mt-1" match="valueMissing">
                                A reason is required to close the store.
                            </Form.Message>
                        </Form.Field>
                        <Form.Submit asChild>
                            <Button type="submit" variant={emergencyCloseReason ? "default" : "destructive"}>
                                {emergencyCloseReason ? "Re-open Store" : "Close Store"}
                            </Button>
                        </Form.Submit>
                    </div>
                </Form.Root>
            </Card.Content>
            {/* ... rest of the component for displaying the hours grid */}
        </Card>
    );
}