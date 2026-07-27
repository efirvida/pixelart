import '@testing-library/jest-dom';

// jsdom does not provide ResizeObserver.
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom does not implement HTMLCanvasElement.getContext().
// Provide a lightweight mock so canvas-based components can render in tests.
HTMLCanvasElement.prototype.getContext = ((
  _contextId: string,
  _options?: unknown,
) => {
  return {
    scale: () => {},
    fillStyle: '',
    fillRect: () => {},
    strokeStyle: '',
    lineWidth: 1,
    strokeRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray() }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
  } as unknown as CanvasRenderingContext2D;
}) as typeof HTMLCanvasElement.prototype.getContext;

// jsdom doesn't provide a canvas toDataURL.
HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,fake';

// Suppress canvas-related console errors during tests.
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const msg = String(args[0] || '');
  if (
    msg.includes('Not implemented: HTMLCanvasElement') ||
    msg.includes('getContext')
  ) {
    return;
  }
  originalError.call(console, ...args);
};
