import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { RangeSlider } from '../components/ui/RangeSlider/RangeSlider';

describe('RangeSlider', () => {
  it('renders with a label', () => {
    render(<RangeSlider label="Opacity" />);
    expect(screen.getByText('Opacity')).toBeInTheDocument();
  });

  it('renders a range input', () => {
    render(<RangeSlider label="Size" />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('sets default min, max, step', () => {
    render(<RangeSlider label="Width" />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('step', '1');
  });

  it('accepts custom min, max, step', () => {
    render(<RangeSlider label="Zoom" min={1} max={10} step={0.5} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '10');
    expect(slider).toHaveAttribute('step', '0.5');
  });

  it('has ARIA attrs: aria-valuemin, aria-valuemax, aria-valuenow', () => {
    render(<RangeSlider label="Volume" min={0} max={100} value={50} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  it('calls onChange with numeric value when slider moves', () => {
    const onChange = vi.fn();
    render(<RangeSlider label="Speed" onChange={onChange} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });
    expect(onChange).toHaveBeenCalledWith(75);
  });

  it('forwards ref to the input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<RangeSlider ref={ref} label="Ref" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('range');
  });

  it('composes external className', () => {
    render(<RangeSlider label="Styl" className="wide-slider" />);
    const wrapper = screen.getByTestId('rangeslider-wrapper');
    expect(wrapper.className).toMatch(/wide-slider/);
  });

  it('has proper ARIA labelling via aria-labelledby', () => {
    render(<RangeSlider label="Contrast" />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-labelledby');
  });
});
