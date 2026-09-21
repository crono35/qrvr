(() => {
  const WEBHOOK_URL =
    'https://ai.quartzsitervresort.com/webhook/reservation-inquiry-test';

  const STORAGE = {
    conversationId: 'qrvr_conversation_id',
    messages: 'qrvr_chat_messages',
    open: 'qrvr_chat_open',
    updatedAt: 'qrvr_chat_updated_at'
  };

  const MAX_AGE_MS = 24 * 60 * 60 * 1000;

  function loadMessages() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.messages)) || [];
    } catch {
      return [];
    }
  }

  function saveState(messages) {
    localStorage.setItem(
      STORAGE.messages,
      JSON.stringify(messages)
    );

    localStorage.setItem(
      STORAGE.updatedAt,
      Date.now().toString()
    );
  }

  function expireOldConversation() {
    const updatedAt = Number(
      localStorage.getItem(STORAGE.updatedAt) || 0
    );

    if (
      updatedAt &&
      Date.now() - updatedAt > MAX_AGE_MS
    ) {
      localStorage.removeItem(STORAGE.conversationId);
      localStorage.removeItem(STORAGE.messages);
      localStorage.removeItem(STORAGE.open);
      localStorage.removeItem(STORAGE.updatedAt);
    }
  }

  expireOldConversation();

  let messages = loadMessages();

  const button = document.createElement('button');
  button.id = 'qrvr-chat-button';
  button.type = 'button';
  button.textContent = '💬';
  button.setAttribute(
    'aria-label',
    'Open Quartzsite RV Resort assistant'
  );

  const panel = document.createElement('div');
  panel.id = 'qrvr-chat-panel';

  panel.innerHTML = `
    <div id="qrvr-chat-header">
      <span>Quartzsite RV Resort Assistant</span>
      <button id="qrvr-new-chat" type="button">
        New chat
      </button>
    </div>

    <div id="qrvr-chat-messages"></div>

    <div id="qrvr-chat-input-row">
      <input
        id="qrvr-chat-input"
        type="text"
        placeholder="Ask about availability, rates, or the park..."
        autocomplete="off"
      >

      <button
        id="qrvr-chat-send"
        type="button"
      >
        Send
      </button>
    </div>
  `;

  document.body.appendChild(button);
  document.body.appendChild(panel);

  const messageBox =
    panel.querySelector('#qrvr-chat-messages');

  const input =
    panel.querySelector('#qrvr-chat-input');

  const sendButton =
    panel.querySelector('#qrvr-chat-send');

  const newChatButton =
    panel.querySelector('#qrvr-new-chat');

  function renderMessages() {
    messageBox.innerHTML = '';

    for (const msg of messages) {
      const div = document.createElement('div');

      div.className =
        `qrvr-message ${msg.role}`;

      if (msg.booking_url) {
        const label = document.createElement('span');
        label.textContent = 'Booking link: ';

        const link = document.createElement('a');

        link.href = msg.booking_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Click here';

        div.appendChild(label);
        div.appendChild(link);
      } else {
        div.textContent = msg.text;
      }

      messageBox.appendChild(div);
    }

    messageBox.scrollTop =
      messageBox.scrollHeight;
  }

  function addMessage(role, text, bookingUrl = null) {
    messages.push({
      role,
      text,
      booking_url: bookingUrl
    });

    saveState(messages);
    renderMessages();
  }

  function setOpen(open) {
    panel.classList.toggle(
      'open',
      open
    );

    localStorage.setItem(
      STORAGE.open,
      open ? 'true' : 'false'
    );

    if (open) {
      input.focus();
    }
  }

  button.addEventListener('click', () => {
    setOpen(
      !panel.classList.contains('open')
    );
  });

  newChatButton.addEventListener('click', () => {
    localStorage.removeItem(
      STORAGE.conversationId
    );

    localStorage.removeItem(
      STORAGE.messages
    );

    localStorage.removeItem(
      STORAGE.updatedAt
    );

    messages = [];

    addMessage(
      'assistant',
      'Hi! How can I help with your stay at Quartzsite RV Resort?'
    );
  });

  async function sendMessage() {
    const text = input.value.trim();

    if (!text) return;

    input.value = '';

    addMessage(
      'user',
      text
    );

    sendButton.disabled = true;
    input.disabled = true;

    const typingIndex = messages.length;

    messages.push({
      role: 'assistant',
      text: 'Thinking...',
      booking_url: null
    });

    renderMessages();

    try {
      const conversationId =
        localStorage.getItem(
          STORAGE.conversationId
        );

      const payload = {
        customer_message: text
      };

      if (conversationId) {
        payload.conversation_id =
          conversationId;
      }

      const response = await fetch(
        WEBHOOK_URL,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const data =
        await response.json();

      messages.splice(
        typingIndex,
        1
      );

      if (data.conversation_id) {
        localStorage.setItem(
          STORAGE.conversationId,
          data.conversation_id
        );
      }

      messages.push({
        role: 'assistant',
        text:
          data.message ||
          'I was unable to generate a response.',
        booking_url: null
      });

      if (data.booking_url) {
        messages.push({
          role: 'assistant',
          text: '',
          booking_url:
            data.booking_url
        });
      }

      saveState(messages);
      renderMessages();

    } catch (error) {
      messages.splice(
        typingIndex,
        1
      );

      messages.push({
        role: 'assistant',
        text:
          'Sorry, I’m having trouble connecting right now. Please try again in a moment.',
        booking_url: null
      });

      saveState(messages);
      renderMessages();

      console.error(error);

    } finally {
      sendButton.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  sendButton.addEventListener(
    'click',
    sendMessage
  );

  input.addEventListener(
    'keydown',
    event => {
      if (
        event.key === 'Enter' &&
        !event.shiftKey
      ) {
        event.preventDefault();
        sendMessage();
      }
    }
  );

  if (messages.length === 0) {
    messages.push({
      role: 'assistant',
      text:
        'Hi! How can I help with your stay at Quartzsite RV Resort?',
      booking_url: null
    });

    saveState(messages);
  }

  renderMessages();

  if (
    localStorage.getItem(
      STORAGE.open
    ) === 'true'
  ) {
    setOpen(true);
  }
})();