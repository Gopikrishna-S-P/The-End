import type { Meta, StoryObj } from '@storybook/react-vite';
import AuditPage from './AuditPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof AuditPage> = {
  title: 'Pages/Reports/AuditPage',
  component: AuditPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof AuditPage>;
export const Default: Story = {};
