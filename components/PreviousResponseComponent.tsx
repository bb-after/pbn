import React from 'react';

const PreviousResponseComponent = ({ response }) => {
  return (
    <div>
      <h3>Previous Response</h3>
      <div dangerouslySetInnerHTML={{ __html: response }} className="previous-response" />
    </div>
  );
};

export default PreviousResponseComponent;