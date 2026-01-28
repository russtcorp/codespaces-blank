import type { Meta, StoryObj } from '@storybook/react';
import { Card } from '@diner-saas/ui/card';
import { Button } from '@diner-saas/ui/button';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  subcomponents: { 
    'Card.Header': Card.Header, 
    'Card.Title': Card.Title, 
    'Card.Description': Card.Description, 
    'Card.Content': Card.Content, 
    'Card.Footer': Card.Footer 
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: (args) => (
    <Card {...args} className="w-96">
      <Card.Header>
        <Card.Title>Default Card</Card.Title>
        <Card.Description>This is a basic card component.</Card.Description>
      </Card.Header>
      <Card.Content>
        <p>
          This area is for the main content of the card. You can put any React nodes here.
        </p>
      </Card.Content>
      <Card.Footer className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </Card.Footer>
    </Card>
  ),
};

export const Simple: Story = {
    name: "Simple Content-Only",
    render: (args) => (
      <Card {...args} className="w-96">
        <Card.Content className="p-6">
          <p>This is a simple card with only content inside it.</p>
        </Card.Content>
      </Card>
    ),
  };
  
