import React from 'react';
interface PreviousResponseProps {
    response: string;
    version: number;
  }
  
const PreviousResponseComponent: React.FC<PreviousResponseProps> = ({ response, version }) => {
  return (
    <div>
      <h3>Version {version}</h3>
      <div dangerouslySetInnerHTML={{ __html: response }} className="previous-response" />
    </div>
  );
};

export default PreviousResponseComponent;