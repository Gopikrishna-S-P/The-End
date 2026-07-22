import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import VisitImportModal from './VisitImportModal';

const meta: Meta<typeof VisitImportModal> = {
  title: 'Components/VisitImportModal',
  component: VisitImportModal,
  args: { onClose: fn(), onDone: fn() },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof VisitImportModal>;

export const Default: Story = {};
