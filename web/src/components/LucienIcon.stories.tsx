import type { Meta, StoryObj } from '@storybook/react-vite';
import LucienIcon from './LucienIcon';

const meta: Meta<typeof LucienIcon> = {
  title: 'Components/LucienIcon',
  component: LucienIcon,
  args: { size: 18 },
};
export default meta;

type Story = StoryObj<typeof LucienIcon>;

export const Default: Story = {};
export const Large: Story = { args: { size: 48 } };
