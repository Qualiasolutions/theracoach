import TheraCoach from '@/components/TheraCoach';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Home() {
  return (
    <ErrorBoundary>
      <TheraCoach />
    </ErrorBoundary>
  );
}
