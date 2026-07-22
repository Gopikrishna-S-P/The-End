import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppPreviewFrame } from './AppPreviewFrame';

const meta: Meta<typeof AppPreviewFrame> = {
  title: 'Components/AppPreviewFrame',
  component: AppPreviewFrame,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof AppPreviewFrame>;

export const Default: Story = {};
