'use client';

import { useState } from 'react';
import FeedbackModal from './FeedbackModal';

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => {
          console.log('Feedback button clicked!');
          setIsOpen(true);
        }}
        style={{ 
          background: 'none', 
          border: '1px solid #eaeaea', 
          padding: '0.4rem 0.8rem', 
          borderRadius: '4px', 
          cursor: 'pointer',
          fontSize: '0.9rem',
          color: '#666'
        }}
      >
        💬 Feedback
      </button>
      
      {isOpen && <FeedbackModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
