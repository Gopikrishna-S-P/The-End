import type { Meta, StoryObj } from '@storybook/react-vite';
import PullToRefreshIndicator from './PullToRefreshIndicator';

const meta: Meta<typeof PullToRefreshIndicator> = {
  title: 'Components/PullToRefreshIndicator',
  component: PullToRefreshIndicator,
  decorators: [(Story) => <div style={{ position: 'relative', height: 160 }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof PullToRefreshIndicator>;

export const Pulling: Story = { args: { pull: 0.5, refreshing: false } };
export const Triggered: Story = { args: { pull: 1, refreshing: false } };
export const Refreshing: Story = { args: { pull: 1, refreshing: true } };
export const Hidden: Story = { args: { pull: 0, refreshing: false } };
