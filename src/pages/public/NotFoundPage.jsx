import { Link } from 'react-router-dom';
import { Container, Home, Search } from 'lucide-react';

const NotFoundPage = () => (
  <div className="not-found-page">
    <div className="not-found-card">
      <div className="not-found-icon-wrap">
        <Container size={32} color="var(--primary)" />
      </div>
      <h1 className="not-found-code">404</h1>
      <h2 className="not-found-title">Page Not Found</h2>
      <p className="not-found-text">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="not-found-actions">
        <Link to="/" className="btn btn-primary">
          <Home size={16} /> Go Home
        </Link>
        <Link to="/track" className="btn btn-outline">
          <Search size={16} /> Track Shipment
        </Link>
      </div>
    </div>
  </div>
);

export default NotFoundPage;
