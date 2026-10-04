import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatReply } from './ChatReply';

describe('assistant reply formatting', () => {
  it('escapes provider HTML instead of executing it', () => {
    const html = renderToStaticMarkup(
      <ChatReply content={'<script>alert(1)</script><img src=x onerror=alert(1)>'} />,
    );
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });
  it('preserves code, language and following explanation', () => {
    const html = renderToStaticMarkup(
      <ChatReply
        content={'**Example**\n```js\nif (x < 2) {\n  console.log("yes");\n}\n```\nDone.'}
      />,
    );
    expect(html).toContain('<strong>Example</strong>');
    expect(html).toContain('<span>js</span>');
    expect(html).toContain('if (x &lt; 2)');
    expect(html).toContain('Done.');
    expect(html).not.toContain('```');
  });
  it('supports Hindi text and inline code', () => {
    const html = renderToStaticMarkup(
      <ChatReply content={'Namaste! `print()` ko use karo. नमस्ते'} />,
    );
    expect(html).toContain('<code>print()</code>');
    expect(html).toContain('नमस्ते');
  });
});
