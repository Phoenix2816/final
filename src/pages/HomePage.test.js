import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from './HomePage';
import api from '../api/client';
jest.mock('../api/client', () => ({ get: jest.fn() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => options?.defaultValue || key }) }));
jest.mock('react-router-dom', () => ({ Link: ({ children }) => <span>{children}</span> }));
beforeEach(() => api.get.mockReset());
test('shows a recoverable error instead of misleading zero totals', async () => {
  api.get.mockRejectedValueOnce(new Error('Database unavailable'));
  api.get.mockResolvedValueOnce({ data: { stats: { positions: 12 }, latest: [], popular: [], tagCloud: [] } });
  render(<HomePage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
  expect(screen.queryByText('home.positions')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('12')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
test('cancels the dashboard request when navigating away', () => {
  api.get.mockImplementation(() => new Promise(() => {}));
  const { unmount } = render(<HomePage />);
  const signal = api.get.mock.calls[0][1].signal;
  unmount();
  expect(signal.aborted).toBe(true);
});
