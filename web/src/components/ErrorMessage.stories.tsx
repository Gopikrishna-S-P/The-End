import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ErrorMessage } from './ErrorMessage';

const meta: Meta<typeof ErrorMessage> = {
  title: 'Components/ErrorMessage',
  component: ErrorMessage,
  args: { message: 'Failed to load data. Please try again.' },
};
export default meta;

type Story = StoryObj<typeof ErrorMessage>;

export const Default: Story = {};
export const Dismissible: Story = { args: { onDismiss: fn() } };
