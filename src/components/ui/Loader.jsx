export default function Loader({ text = 'Loading...', fullPage = false }) {
  return (
    <div className="loading-center" style={fullPage ? { minHeight: '100vh' } : {}}>
      <div className="spinner" />
      <span>{text}</span>
    </div>
  );
}
