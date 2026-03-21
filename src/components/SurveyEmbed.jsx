import React from 'react';
import { Widget } from '@typeform/embed-react';
import './SurveyEmbed.css';

const SurveyEmbed = ({ title, description }) => {
  return (
    <div className="survey-container">
      <div className="survey-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="glass-panel survey-embed-wrapper">
        <Widget
          id="C5n1i1lB" // Replace with actual Typeform ID (e.g., 'UaRXYZ')
          style={{ width: '100%', height: '500px' }}
          className="my-form"
          transitiveSearchParams={['utm_source', 'utm_medium']}
          inlineOnMobile
          hideHeaders
          hideFooter
          opacity={0} // Forces typeform transparent to let our glass background shine
        />
      </div>
    </div>
  );
};

export default SurveyEmbed;
