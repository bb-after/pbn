import React from 'react';
import { IntercomLayout } from '../components/ui';
import GeoChecker from '../components/GeoChecker';
import useValidateUserToken from '../hooks/useValidateUserToken';
import UnauthorizedAccess from '../components/UnauthorizedAccess';

export default function GeoCheckerPage() {
  const { token } = useValidateUserToken();

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
