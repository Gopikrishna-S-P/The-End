import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'Components/EmptyState',
  component: EmptyState,
  args: { message: 'No data found' },
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {};

export const WithSubAndAction: Story = {
  args: {
    message: 'No cases assigned',
    sub: 'Cases you pick up will show up here.',
    action: <button type="button" className="ds-btn is-secondary">Refresh</button>,
  },
};
