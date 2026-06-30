'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    fontFamily: 'Inter, sans-serif',
    primaryColor: '#f4f4f5',
    primaryTextColor: '#18181b',
    primaryBorderColor: '#e4e4e7',
    lineColor: '#71717a',
    secondaryColor: '#f3e8ff',
    tertiaryColor: '#ffffff'
  }
});

const MermaidChart = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const renderChart = async () => {
      const id = `mermaid-chart-${Math.random().toString(36).substring(2, 9)}`;
      try {
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
      } catch (error) {
        console.warn("Failed to render mermaid chart", error);
        const errorSvg = document.getElementById('d' + id);
        if (errorSvg) {
          errorSvg.remove();
        }
        setSvg('<div style="color: red; padding: 1rem; border: 1px solid red; border-radius: 8px;">Failed to render diagram. Syntax error in Mermaid code.</div>');
      }
    };
    if (chart) renderChart();
  }, [chart]);

  return (
    <div 
      className="mermaid-wrapper"
      ref={ref}
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className, node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (language === 'mermaid') {
              return <MermaidChart chart={String(children).replace(/\n$/, '')} />;
            }
            
            return match ? (
              <div className="code-block-wrapper">
                <div className="code-header">
                  <span>{language}</span>
                </div>
                <pre className="code-body">
                  <code className={className} {...rest}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className="inline-code" {...rest}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
