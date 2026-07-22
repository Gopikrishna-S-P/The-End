import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './Skeleton';
import PageSkeleton from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Components/Skeleton',
  component: Skeleton,
  args: { variant: 'rect', width: 200, height: 20 },
};
export default meta;

type Story = StoryObj<typeof Skeleton>;

export const Rect: Story = {};
export const Text: Story = { args: { variant: 'text', width: 160 } };
export const Title: Story = { args: { variant: 'title', width: 240 } };
export const Circle: Story = { args: { variant: 'circle', width: 48, height: 48 } };
export const Pill: Story = { args: { variant: 'pill', width: 90, height: 20 } };

/** PageSkeleton — the default export, a full-page BrandedLoader wrapper used
 * while a route's data is loading. */
export const FullPage: StoryObj<typeof PageSkeleton> = {
  render: () => <PageSkeleton />,
  parameters: { layout: 'fullscreen' },
};
