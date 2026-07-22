import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import VisitExportModal from './VisitExportModal';

const meta: Meta<typeof VisitExportModal> = {
  title: 'Components/VisitExportModal',
  component: VisitExportModal,
  args: { onClose: fn() },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof VisitExportModal>;

export const Default: Story = {};
