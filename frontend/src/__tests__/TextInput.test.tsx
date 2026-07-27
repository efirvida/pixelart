import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { TextInput } from '../components/ui/TextInput/TextInput';

describe('TextInput', () => {
  it('renders a label and input element', () => {
    render(<TextInput label="Email" id="email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  });

  it('renders with a placeholder', () => {
    render(<TextInput label="Name" id="name" placeholder="John Doe" />);
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
  });

  it('associates label with input via htmlFor', () => {
    render(<TextInput label="Username" id="user" />);
    const input = screen.getByLabelText('Username');
    expect(input).toHaveAttribute('id', 'user');
  });

  it('sets aria-invalid and aria-describedby when error is present', () => {
    render(<TextInput label="Email" id="email" error="Invalid email format" />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');
  });

  it('renders error message when error prop is set', () => {
    render(<TextInput label="Field" id="f1" error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not set aria-invalid when no error', () => {
    render(<TextInput label="OK" id="ok" />);
    const input = screen.getByRole('textbox', { name: 'OK' });
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('forwards ref to the input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<TextInput ref={ref} label="Ref" id="ref-input" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('composes external className', () => {
    render(<TextInput label="Style" id="s1" className="full-width" />);
    const wrapper = screen.getByTestId('textinput-wrapper');
    expect(wrapper.className).toMatch(/full-width/);
  });

  it('fires onChange when typing', async () => {
    const onChange = vi.fn();
    render(<TextInput label="Value" id="val" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Value' });
    await userEvent.type(input, 'hello');
    expect(onChange).toHaveBeenCalled();
  });

  it('accepts a value prop', () => {
    render(<TextInput label="Pre-filled" id="pf" value="hello world" readOnly />);
    const input = screen.getByRole('textbox', { name: 'Pre-filled' });
    expect(input).toHaveValue('hello world');
  });
});
