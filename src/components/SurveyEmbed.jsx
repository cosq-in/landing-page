import { Widget } from '@typeform/embed-react';

const SurveyEmbed = ({ formId = 'C5n1i1lB' }) => (
  <div className="blk survey-embed">
    <Widget
      id={formId}
      style={{ width: '100%', height: '500px' }}
      transitiveSearchParams={['utm_source', 'utm_medium']}
      inlineOnMobile
      hideHeaders
      hideFooter
    />
  </div>
);

export default SurveyEmbed;
