import React from 'react';
interface PreviousResponseProps {
    response: string;
  }
  
const PreviousResponseComponent: React.FC<PreviousResponseProps> = ({ response }) => {
  return (
    <div>
      <h3>Previous Response</h3>
      <div dangerouslySetInnerHTML={{ __html: response }} className="previous-response" />
    </div>
  );
};

export default PreviousResponseComponent;