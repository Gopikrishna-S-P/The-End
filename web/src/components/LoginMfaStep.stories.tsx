import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import LoginMfaStep from './LoginMfaStep';

const meta: Meta<typeof LoginMfaStep> = {
  title: 'Components/LoginMfaStep',
  component: LoginMfaStep,
  args: { onComplete: fn() },
  decorators: [(Story) => <div style={{ width: 360, padding: 24, border: '1px solid var(--border)', borderRadius: 12 }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof LoginMfaStep>;

export const Default: Story = {};
