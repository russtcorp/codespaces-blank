import type { Meta, StoryObj } from '@storybook/react';
import { Toaster } from '@diner-saas/ui/sonner';
import { Button } from '@diner-saas/ui/button';
import { toast } from 'sonner';

const meta: Meta<typeof Toaster> = {
  title: 'UI/Toaster',
  component: Toaster,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  render: (args) => (
    <div>
      <Toaster {...args} />
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() =>
            toast('A sonner toast', {
              description: 'Sunday, December 03, 2023 at 9:00 AM',
              action: {
                label: 'Undo',
                onClick: () => console.log('Undo'),
              },
            })
          }
        >
          Render a toast
        </Button>
         <Button
          variant="secondary"
          onClick={() =>
            toast.success('Success!', {
              description: 'The event has been created successfully.',
            })
          }
        >
          Success
        </Button>
         <Button
          variant="destructive"
          onClick={() =>
            toast.error('Error!', {
              description: 'Could not update the event.',
            })
          }
        >
          Error
        </Button>
      </div>
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof Toaster>;

export const Default: Story = {};
