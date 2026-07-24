import type { Meta, StoryObj } from '@storybook/react-vite';
import MyAttendancePage from './MyAttendancePage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('FO');

const meta: Meta<typeof MyAttendancePage> = {
  title: 'Pages/FieldOps/MyAttendancePage',
  component: MyAttendancePage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof MyAttendancePage>;
export const Default: Story = {};
