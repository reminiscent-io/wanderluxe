
import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    //Optional: Log the error to a service like Sentry or LogRocket
  }, [hasError]);

  if (hasError) {
    return <div>Something went wrong.</div>;
  }

  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      {children}
    </React.Suspense>
  );
};

export default ErrorBoundary;
