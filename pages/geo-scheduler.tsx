import React from 'react';
import { IntercomLayout } from '../components/ui';
import GeoScheduler from '../components/GeoScheduler';
import useValidateUserToken from '../hooks/useValidateUserToken';
import UnauthorizedAccess from '../components/UnauthorizedAccess';

export default function GeoSchedulerPage() {
  const { token } = useValidateUserToken();

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
