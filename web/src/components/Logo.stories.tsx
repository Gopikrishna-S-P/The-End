import type { Meta, StoryObj } from '@storybook/react-vite';
import { Logo } from './Logo';

const meta: Meta<typeof Logo> = {
  title: 'Components/Logo',
  component: Logo,
  args: { height: 40, alt: 'Recoverpro' },
};
export default meta;

type Story = StoryObj<typeof Logo>;

export const Default: Story = {};

export const Large: Story = { args: { height: 80 } };
