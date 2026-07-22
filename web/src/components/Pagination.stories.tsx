import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pagination } from './Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'Components/Pagination',
  component: Pagination,
};
export default meta;

type Story = StoryObj<typeof Pagination>;

function Interactive({ totalPages }: { totalPages: number }) {
  const [page, setPage] = useState(0);
  return <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />;
}

export const Default: Story = { render: () => <Interactive totalPages={12} /> };
export const FirstPage: Story = { args: { currentPage: 0, totalPages: 5, onPageChange: () => {} } };
export const LastPage: Story = { args: { currentPage: 4, totalPages: 5, onPageChange: () => {} } };
export const Loading: Story = { args: { currentPage: 2, totalPages: 5, isLoading: true, onPageChange: () => {} } };
