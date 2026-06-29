'use client';

import { useState, useEffect } from 'react';

interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

interface QuizModalProps {
  moduleId: string;
  markdownContent: string;
  onClose: () => void;
}

export default function QuizModal({ moduleId, markdownContent, onClose }: QuizModalProps) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const apiKey = localStorage.getItem('geminiApiKey') || undefined;
        const res = await fetch('/api/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markdownContent, apiKey })
        });
        if (res.ok) {
          const data = await res.json();
          setQuestions(data);
        }
      } catch (e) {
        console.error("Failed to fetch quiz", e);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [markdownContent]);

  const handleSelect = (index: number) => {
    if (showExplanation) return;
    setSelectedAnswer(index);
    setShowExplanation(true);
    if (index === questions[currentIndex].answerIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCurrentIndex(i => i + 1);
  };

  if (loading) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', minWidth: '300px', textAlign: 'center' }}>
          <h3>🧠 Generating Quiz...</h3>
          <p>Analyzing module content...</p>
        </div>
      </div>
    );
  }

  if (currentIndex >= questions.length) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', minWidth: '400px', textAlign: 'center' }}>
          <h2>Quiz Complete! 🎉</h2>
          <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>You scored {score} / {questions.length}</p>
          <button onClick={onClose} className="btn-primary" style={{ padding: '0.5rem 2rem' }}>Close</button>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '600px', width: '90%', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
        
        <h3 style={{ marginTop: 0 }}>Question {currentIndex + 1} of {questions.length}</h3>
        <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>{q.question}</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {q.options.map((opt, i) => {
            let bg = '#f5f5f5';
            let color = 'black';
            let border = '1px solid #ccc';
            
            if (showExplanation) {
              if (i === q.answerIndex) {
                bg = '#4caf50';
                color = 'white';
                border = '1px solid #4caf50';
              } else if (i === selectedAnswer) {
                bg = '#f44336';
                color = 'white';
                border = '1px solid #f44336';
              }
            }

            return (
              <button 
                key={i} 
                onClick={() => handleSelect(i)}
                style={{ padding: '1rem', textAlign: 'left', background: bg, color, border, borderRadius: '8px', cursor: showExplanation ? 'default' : 'pointer' }}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {showExplanation && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.05)', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 1rem 0' }}><strong>Explanation:</strong> {q.explanation}</p>
            <button onClick={handleNext} className="btn-primary" style={{ padding: '0.5rem 2rem', width: '100%' }}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
