import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import RouteProgressBar from './RouteProgressBar';

// The bar is invisible on its very first render (it only animates on a
// *change* of useLocation) — navigate once after mount to trigger the sweep.
function NavigateOnMount() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/b'); }, [navigate]);
  return <RouteProgressBar />;
}

const meta: Meta<typeof RouteProgressBar> = {
  title: 'Components/RouteProgressBar',
  component: RouteProgressBar,
  decorators: [(Story) => <MemoryRouter initialEntries={['/a']}><Story /></MemoryRouter>],
};
export default meta;

type Story = StoryObj<typeof RouteProgressBar>;

export const Default: Story = {};
export const Animating: Story = { render: () => <NavigateOnMount /> };
