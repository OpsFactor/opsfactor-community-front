/**
 * Renders a readable startup boundary when the host cannot validate its
 * backend before Vue mounts. Keeping this in the Community-owned core gives
 * both editions the same safe failure mode instead of a blank application.
 */
export function renderBootstrapFailure(error, edition) {
    const applicationRoot = document.querySelector('#app');
    if (applicationRoot === null)
        return;
    const failureMessage = error instanceof Error
        ? error.message
        : `Unable to initialize the OpsFactor ${edition === 'community' ? 'Community' : 'Enterprise'} runtime.`;
    const frame = document.createElement('main');
    const panel = document.createElement('section');
    const eyebrow = document.createElement('p');
    const heading = document.createElement('h1');
    const description = document.createElement('p');
    const detail = document.createElement('p');
    frame.setAttribute('role', 'alert');
    frame.setAttribute('aria-live', 'assertive');
    eyebrow.textContent = `OpsFactor ${edition === 'community' ? 'Community' : 'Enterprise'}`;
    heading.textContent = 'Unable to validate the selected backend';
    description.textContent = 'The application stopped before sign in to avoid opening against an incompatible distribution.';
    detail.textContent = failureMessage;
    // Inline presentation is deliberate: this boundary runs before Vue, PrimeVue
    // and the host component tree exist, but must remain readable in either host theme.
    Object.assign(frame.style, {
        boxSizing: 'border-box',
        display: 'grid',
        minHeight: '100vh',
        padding: '2rem',
        placeItems: 'center',
        background: 'var(--ofx-bg, #f4f7fb)',
        color: 'var(--ofx-text, #142033)',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    });
    Object.assign(panel.style, {
        boxSizing: 'border-box',
        width: 'min(100%, 42rem)',
        border: '1px solid var(--ofx-border, #cfd8e6)',
        borderRadius: '1.25rem',
        padding: '2rem',
        background: 'var(--ofx-surface, #ffffff)',
        boxShadow: '0 20px 50px rgb(15 23 42 / 0.14)',
    });
    Object.assign(eyebrow.style, {
        margin: '0',
        color: 'var(--ofx-text-subtle, #64748b)',
        fontSize: '0.75rem',
        fontWeight: '700',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
    });
    Object.assign(heading.style, {
        margin: '0.75rem 0 0',
        fontSize: '1.5rem',
        lineHeight: '1.25',
    });
    Object.assign(description.style, {
        margin: '0.75rem 0 0',
        color: 'var(--ofx-text-muted, #475569)',
        lineHeight: '1.6',
    });
    Object.assign(detail.style, {
        margin: '1.25rem 0 0',
        border: '1px solid color-mix(in srgb, #b45309 32%, transparent)',
        borderRadius: '0.75rem',
        padding: '0.875rem 1rem',
        background: 'color-mix(in srgb, #f59e0b 12%, transparent)',
        color: 'var(--ofx-text, #142033)',
        fontSize: '0.875rem',
        lineHeight: '1.5',
    });
    panel.append(eyebrow, heading, description, detail);
    frame.append(panel);
    applicationRoot.replaceChildren(frame);
}
//# sourceMappingURL=render-bootstrap-failure.js.map