import { Fragment } from 'react';

function inline(text: string) {
  return text
    .split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g)
    .map((part, index) =>
      part.startsWith('`') && part.endsWith('`') ? (
        <code key={index}>{part.slice(1, -1)}</code>
      ) : part.startsWith('**') && part.endsWith('**') ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        <Fragment key={index}>{part}</Fragment>
      ),
    );
}

// Render a small, safe Markdown subset. Provider text never becomes raw HTML.
export function ChatReply({ content }: { content: string }) {
  const blocks = content
    .replace(/\r\n/g, '\n')
    .split(/^```([^\n]*)\n([\s\S]*?)(?:^```\s*$|$(?![\s\S]))/gm);
  return (
    <div className="chat-reply">
      {blocks.map((block, index) => {
        if (index % 3 === 1) return null;
        if (index % 3 === 2)
          return (
            <div className="chat-code" key={index}>
              <span>{blocks[index - 1].trim() || 'Code'}</span>
              <pre>
                <code>{block.replace(/\n$/, '')}</code>
              </pre>
            </div>
          );
        return (
          <div className="chat-prose" key={index}>
            {block.split('\n').map((line, lineIndex) => {
              const heading = line.match(/^#{1,4}\s+(.+)/);
              return heading ? (
                <p className="chat-reply-heading" key={lineIndex}>
                  {inline(heading[1])}
                </p>
              ) : (
                <Fragment key={lineIndex}>
                  {inline(line)}
                  {lineIndex < block.split('\n').length - 1 ? '\n' : ''}
                </Fragment>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
