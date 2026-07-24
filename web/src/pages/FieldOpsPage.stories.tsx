import type { Meta, StoryObj } from '@storybook/react-vite';
import FieldOpsPage from './FieldOpsPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof FieldOpsPage> = {
  title: 'Pages/FieldOps/FieldOpsPage',
  component: FieldOpsPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof FieldOpsPage>;
export const Default: Story = {};
