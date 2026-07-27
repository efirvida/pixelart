import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Select } from '../components/ui/Select/Select';

const options = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
];

describe('Select', () => {
  it('renders a label and select element', () => {
    render(<Select label="Color" options={options} />);
    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Color' })).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<Select label="Color" options={options} />);
    expect(screen.getByRole('option', { name: 'Red' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Green' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Blue' })).toBeInTheDocument();
  });

  it('shows the selected value', () => {
    render(<Select label="Color" options={options} value="green" />);
    const select = screen.getByRole('combobox', { name: 'Color' });
    expect(select).toHaveValue('green');
  });

  it('calls onChange when a new option is selected', async () => {
    const onChange = vi.fn();
    render(<Select label="Color" options={options} onChange={onChange} />);
    const select = screen.getByRole('combobox', { name: 'Color' });
    await userEvent.selectOptions(select, 'blue');
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('forwards ref to the select element', () => {
    const ref = createRef<HTMLSelectElement>();
    render(<Select ref={ref} label="Color" options={options} />);
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it('composes external className', () => {
    render(<Select label="Color" options={options} className="full-width" />);
    const wrapper = screen.getByTestId('select-wrapper');
    expect(wrapper.className).toMatch(/full-width/);
  });
});
