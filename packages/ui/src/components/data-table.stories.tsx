import type { Meta, StoryObj } from '@storybook/react';
import { DataTable, type ColumnDef } from '@diner-saas/ui/data-table';

const meta: Meta<typeof DataTable> = {
  title: 'UI/DataTable',
  component: DataTable,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DataTable>;

// --- Helper Data and Columns for the Story ---

interface Payment {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  email: string;
}

const payments: Payment[] = [
  { id: '728ed52f', amount: 100, status: 'pending', email: 'm@example.com' },
  { id: '489e1d42', amount: 125, status: 'processing', email: 'example@gmail.com' },
  { id: 'a2b3c4d5', amount: 85, status: 'success', email: 'test@test.com' },
  { id: 'e6f7g8h9', amount: 200, status: 'failed', email: 'user@domain.com' },
];

const columns: ColumnDef<Payment>[] = [
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => `$${row.original.amount}` },
];

// --- Stories ---

export const Default: Story = {
  args: {
    columns: columns,
    data: payments,
  },
};

export const Empty: Story = {
  args: {
    columns: columns,
    data: [],
  },
};
