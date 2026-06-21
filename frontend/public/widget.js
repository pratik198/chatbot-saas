/**
 * ChatBot SaaS — Embeddable Widget Script
 *
 * HOW TO USE ON ANY WEBSITE:
 *   Add this ONE line to your website's HTML (before </body>):
 *   <script src="https://your-app-domain.com/widget.js" data-chatbot-id="123"></script>
 *
 *   Replace "your-app-domain.com" with your deployed app URL.
 *   Replace "123" with your chatbot's ID (found in the chatbot settings).
 *
 * WHAT this script does:
 *   1. Reads the chatbot ID from the data-chatbot-id attribute
 *   2. Fetches the chatbot's public config (name, theme color, position)
 *   3. Creates a floating chat button in the corner of the page
 *   4. On click, loads an iframe pointing to /embed/{chatbotId}
 *   5. The iframe shows the full chat UI (lead form + chat)
 *
 * HOW the iframe communicates with the parent:
 *   Currently the iframe is self-contained — no cross-frame messages needed.
 *   All API calls are from the iframe directly to the backend.
 *
 * CUSTOMIZATION (optional data attributes):
 *   data-chatbot-id="123"               ← REQUIRED: your chatbot's ID
 *   data-position="bottom-right"        ← or "bottom-left" (default: bottom-right)
 *   data-button-size="60"               ← button size in px (default: 60)
 */
(function () {
  'use strict';

  // ── Read config from script tag ─────────────────────────────────────────────
  const scriptTag = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const chatbotId = scriptTag.getAttribute('data-chatbot-id');
  if (!chatbotId) {
    console.warn('[ChatBot Widget] data-chatbot-id attribute is required.');
    return;
  }

  // The base URL is the same origin as where this script was loaded from.
  // e.g. script at "https://chatbot-saas.com/widget.js" → origin = "https://chatbot-saas.com"
  const scriptSrc = scriptTag.src;
  const baseUrl = new URL(scriptSrc).origin;

  const position = scriptTag.getAttribute('data-position') || 'bottom-right';
  const buttonSize = parseInt(scriptTag.getAttribute('data-button-size') || '60', 10);

  // ── Prevent double-loading ──────────────────────────────────────────────────
  if (document.getElementById('chatbot-widget-root')) return;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const isRight = position !== 'bottom-left';
  const side = isRight ? 'right' : 'left';
  const borderRadius = isRight ? '16px 16px 4px 16px' : '16px 16px 16px 4px';

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #chatbot-widget-root {
        position: fixed;
        ${side}: 20px;
        bottom: 20px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: ${isRight ? 'flex-end' : 'flex-start'};
        gap: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      #chatbot-widget-iframe {
        width: 380px;
        height: 560px;
        border: none;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.1);
        display: none;
        background: white;
        transition: opacity 0.2s ease, transform 0.2s ease;
        transform-origin: ${isRight ? 'bottom right' : 'bottom left'};
      }
      #chatbot-widget-iframe.open {
        display: block;
        animation: widgetSlideIn 0.25s ease forwards;
      }
      @keyframes widgetSlideIn {
        from { opacity: 0; transform: scale(0.92) translateY(10px); }
        to   { opacity: 1; transform: scale(1)    translateY(0);     }
      }
      #chatbot-widget-btn {
        width: ${buttonSize}px;
        height: ${buttonSize}px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        position: relative;
        flex-shrink: 0;
      }
      #chatbot-widget-btn:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 24px rgba(0,0,0,0.25);
      }
      #chatbot-widget-btn:active {
        transform: scale(0.95);
      }
      .chatbot-btn-icon {
        position: absolute;
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      .chatbot-btn-icon.hidden {
        opacity: 0;
        transform: rotate(90deg) scale(0.5);
      }
      .chatbot-btn-icon.visible {
        opacity: 1;
        transform: rotate(0deg) scale(1);
      }
    `;
    document.head.appendChild(style);
  }

  // ── Create DOM elements ─────────────────────────────────────────────────────
  function createWidget(themeColor) {
    const root = document.createElement('div');
    root.id = 'chatbot-widget-root';

    // iframe — loads the embed page
    const iframe = document.createElement('iframe');
    iframe.id = 'chatbot-widget-iframe';
    iframe.src = `${baseUrl}/embed/${chatbotId}`;
    iframe.title = 'Chat Widget';
    iframe.allow = 'microphone';
    root.appendChild(iframe);

    // Toggle button
    const btn = document.createElement('button');
    btn.id = 'chatbot-widget-btn';
    btn.style.backgroundColor = themeColor;
    btn.setAttribute('aria-label', 'Open chat');

    // Chat bubble icon (SVG)
    btn.innerHTML = `
      <span class="chatbot-btn-icon visible" id="chatbot-icon-open">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      </span>
      <span class="chatbot-btn-icon hidden" id="chatbot-icon-close">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </span>
    `;

    root.appendChild(btn);
    document.body.appendChild(root);

    // ── Toggle open/close ─────────────────────────────────────────────────────
    let isOpen = false;
    btn.addEventListener('click', function () {
      isOpen = !isOpen;
      if (isOpen) {
        iframe.classList.add('open');
        document.getElementById('chatbot-icon-open').className = 'chatbot-btn-icon hidden';
        document.getElementById('chatbot-icon-close').className = 'chatbot-btn-icon visible';
        btn.setAttribute('aria-label', 'Close chat');
      } else {
        iframe.classList.remove('open');
        document.getElementById('chatbot-icon-open').className = 'chatbot-btn-icon visible';
        document.getElementById('chatbot-icon-close').className = 'chatbot-btn-icon hidden';
        btn.setAttribute('aria-label', 'Open chat');
      }
    });
  }

  // ── Main: fetch config then create widget ───────────────────────────────────
  injectStyles();

  fetch(`${baseUrl}/api/widget/${chatbotId}/config`)
    .then(function (res) {
      if (!res.ok) throw new Error('Chatbot not found');
      return res.json();
    })
    .then(function (data) {
      const config = data.data || {};
      const color = config.themeColor || '#2563eb';
      // Override position from config if not specified in data attribute
      createWidget(color);
    })
    .catch(function (err) {
      // Don't crash the host website — silently fail
      console.warn('[ChatBot Widget] Failed to load:', err.message);
    });
})();
