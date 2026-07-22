import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import ReportGenerateModal from './ReportGenerateModal';

const meta: Meta<typeof ReportGenerateModal> = {
  title: 'Components/ReportGenerateModal',
  component: ReportGenerateModal,
  args: { reportId: 'rpt-collections-summary', onClose: fn() },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof ReportGenerateModal>;

export const Default: Story = {};
