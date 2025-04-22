/**
 * Jest setup file
 * This file is run before each test file is executed
 */

// Import Jest DOM extensions for better assertion support
require('@testing-library/jest-dom');

// Mock out window.matchMedia which is not implemented in JSDOM
window.matchMedia = jest.fn().mockImplementation(query => {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
});

// Mock the RecapitoJS global module
window.Recogito = {
  Recogito: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    destroy: jest.fn(),
    setAnnotations: jest.fn(),
  })),
};

// Mock out window.scroll which is not implemented in JSDOM
window.scroll = jest.fn();

// Mock next/dynamic
jest.mock('next/dynamic', () => () => {
  const DynamicComponent = () => null;
  DynamicComponent.displayName = 'LoadableComponent';
  DynamicComponent.preload = jest.fn();
  return DynamicComponent;
});

// Silence React 18 console errors about useEffect cleanup
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: An effect function must not return anything besides a function')
  ) {
    return;
  }
  originalConsoleError(...args);
};
