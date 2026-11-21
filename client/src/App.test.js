import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the farmer onboarding welcome screen', () => {
  render(<App />);

  expect(screen.getByText('HAKGROS UZHAVAN')).toBeInTheDocument();
  expect(screen.getByText('Welcome to HAKGROS UZHAVAN')).toBeInTheDocument();
  expect(screen.getByText('Get Started')).toBeInTheDocument();
  expect(screen.getByText('Farmer Name')).toBeInTheDocument();
  expect(screen.getByText('Land Area (acres)')).toBeInTheDocument();
});
