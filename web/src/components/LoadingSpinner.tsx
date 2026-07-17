interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { box: 16, border: 2 },
  md: { box: 28, border: 2 },
  lg: { box: 40, border: 3 },
};

export const LoadingSpinner = ({ message = 'Loading...', size = 'md' }: LoadingSpinnerProps) => {
  const { box, border } = sizeMap[size];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div
          role="status"
          aria-label={message}
          style={{
            width: box,
            height: box,
            borderRadius: '50%',
            border: `${border}px solid var(--border)`,
            borderTopColor: 'var(--text-secondary)',
            animation: 'rp-spin 600ms linear infinite',
            flexShrink: 0,
          }}
        />
        {message && (
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-sans)',
          }}>
            {message}
          </p>
        )}
      </div>
      <style>{`@keyframes rp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
