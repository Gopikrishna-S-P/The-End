import type { Meta, StoryObj } from '@storybook/react-vite';
import AttendancePage from './AttendancePage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof AttendancePage> = {
  title: 'Pages/FieldOps/AttendancePage',
  component: AttendancePage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof AttendancePage>;
export const Default: Story = {};
