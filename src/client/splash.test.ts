import { afterEach, describe, expect, it, vi } from 'vitest';

let requestExpandedModeMock: ReturnType<typeof vi.fn>;
let navigateToMock: ReturnType<typeof vi.fn>;

vi.mock('@devvit/web/client', () => {
  requestExpandedModeMock = vi.fn();
  navigateToMock = vi.fn();

  return {
    // used in the footer
    navigateTo: navigateToMock,
    // used in the greeting
    context: {
      username: 'test-user',
    },
    // used by the "Tap to Start" button
    requestExpandedMode: requestExpandedModeMock,
  };
});

afterEach(() => {
  requestExpandedModeMock?.mockReset();
  navigateToMock?.mockReset();
});

describe('Splash', () => {
  it('clicking Open Review Dashboard calls requestExpandedMode', async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import('./splash');
    await new Promise((r) => setTimeout(r, 0));

    const openButton = document.querySelector('#open-dashboard-btn');
    expect(openButton).toBeTruthy();

    openButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(requestExpandedModeMock).toHaveBeenCalled();
  });
});
