import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import AssignCasePanel from './AssignCasePanel';

const meta: Meta<typeof AssignCasePanel> = {
  title: 'Components/AssignCasePanel',
  component: AssignCasePanel,
  args: { allocationIds: ['RP-88213', 'RP-77102', 'RP-90341'], onClose: fn() },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof AssignCasePanel>;

export const Default: Story = {};
