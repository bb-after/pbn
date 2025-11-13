import React from 'react';
import { IntercomLayout } from '../components/ui';
import GeoChecker from '../components/GeoChecker';
import useAuth from '../hooks/useAuth';
import UnauthorizedAccess from '../components/UnauthorizedAccess';

export default function GeoCheckerPage() {
  const { token } = useAuth('/login');

  if (!token) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title="GEO Checker Tool"
      breadcrumbs={[{ label: 'GEO' }, { label: 'GEO Checker' }]}
    >
      <GeoChecker />
    </IntercomLayout>
  );
}
