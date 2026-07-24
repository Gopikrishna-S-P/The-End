import type { Meta, StoryObj } from '@storybook/react-vite';
import CollectionMomPage from './CollectionMomPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof CollectionMomPage> = {
  title: 'Pages/Collections/CollectionMomPage',
  component: CollectionMomPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof CollectionMomPage>;
export const Default: Story = {};
