export default function PageWrapper({ children }) {
  return (
    <div
      style={{
        animation: 'fadeInPage 0.25s ease-out forwards',
      }}
    >
      {children}
    </div>
  );
}
