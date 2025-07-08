import { useAppMode } from '@/store/useAppMode';
import { CRMLayout } from './CRMLayout';
import { TrainingLayout } from './TrainingLayout';

export function Layout() {
  const { mode } = useAppMode();

  if (mode === 'training') {
    return <TrainingLayout />;
  }

  return <CRMLayout />;
}
