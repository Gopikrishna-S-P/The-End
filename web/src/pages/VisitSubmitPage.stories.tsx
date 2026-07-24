import type { Meta, StoryObj } from '@storybook/react-vite';
import VisitSubmitPage from './VisitSubmitPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('FO');

const meta: Meta<typeof VisitSubmitPage> = {
  title: 'Pages/FieldOps/VisitSubmitPage',
  component: VisitSubmitPage,
  decorators: [withPageProviders('/app/visits/:caseId/submit', '/app/visits/story-case-1/submit')],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof VisitSubmitPage>;
export const Default: Story = {};
