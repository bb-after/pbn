import React from 'react';
import { IntercomLayout } from '../components/ui';
import GeoScheduler from '../components/GeoScheduler';
import useAuth from '../hooks/useAuth';
import UnauthorizedAccess from '../components/UnauthorizedAccess';

export default function GeoSchedulerPage() {
  const { token } = useAuth('/login');

  if (!token) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title="GEO Analysis Scheduler"
      breadcrumbs={[{ label: 'GEO' }, { label: 'Scheduler' }]}
    >
      <GeoScheduler />
    </IntercomLayout>
  );
}
