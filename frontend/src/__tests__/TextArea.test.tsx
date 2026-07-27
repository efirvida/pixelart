import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { TextArea } from '../components/ui/TextArea/TextArea';

describe('TextArea', () => {
  it('renders a label and textarea element', () => {
    render(<TextArea label="Description" id="desc" />);
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Description' }).tagName).toBe('TEXTAREA');
  });

  it('renders with rows prop', () => {
    render(<TextArea label="Bio" id="bio" rows={5} />);
    const textarea = screen.getByRole('textbox', { name: 'Bio' });
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('sets aria-invalid when error is present', () => {
    render(<TextArea label="Notes" id="notes" error="Too long" />);
    const textarea = screen.getByRole('textbox', { name: 'Notes' });
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders error message', () => {
    render(<TextArea label="Comment" id="cmt" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not render aria-invalid when no error', () => {
    render(<TextArea label="Safe" id="safe" />);
    const textarea = screen.getByRole('textbox', { name: 'Safe' });
    expect(textarea).toHaveAttribute('aria-invalid', 'false');
  });

  it('forwards ref to the textarea element', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<TextArea ref={ref} label="Ref" id="ref-ta" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('composes external className', () => {
    render(<TextArea label="Styled" id="st" className="wide" />);
    const wrapper = screen.getByTestId('textarea-wrapper');
    expect(wrapper.className).toMatch(/wide/);
  });

  it('fires onChange when typing', async () => {
    const onChange = vi.fn();
    render(<TextArea label="Input" id="inp" onChange={onChange} />);
    const textarea = screen.getByRole('textbox', { name: 'Input' });
    await userEvent.type(textarea, 'hello');
    expect(onChange).toHaveBeenCalled();
  });

  it('accepts a value prop', () => {
    render(<TextArea label="Val" id="tv" value="pre-filled" readOnly />);
    const textarea = screen.getByRole('textbox', { name: 'Val' });
    expect(textarea).toHaveValue('pre-filled');
  });
});
