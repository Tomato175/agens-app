const app = getApp();

Page({
  data: {
    messages: [],
    input: '',
    isStreaming: false,
  },

  msgId: 0,

  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  onSend() {
    const content = this.data.input.trim();
    if (!content || this.data.isStreaming) return;

    const userId = `u-${++this.msgId}`;
    const assistantId = `a-${++this.msgId}`;

    const userMsg = { id: userId, role: 'user', content };
    const assistantMsg = { id: assistantId, role: 'assistant', content: '', toolCalls: [], streaming: true };

    this.setData({
      messages: [...this.data.messages, userMsg, assistantMsg],
      input: '',
      isStreaming: true,
    });

    const apiMessages = [
      ...this.data.messages
        .filter((m) => m.role !== 'tool' && m.id !== assistantId)
        .map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content },
    ];

    this.streamChat(apiMessages, assistantId);
  },

  streamChat(apiMessages, assistantId) {
    const apiBase = app.globalData.apiBase;

    wx.request({
      url: `${apiBase}/stream`,
      method: 'POST',
      data: { messages: apiMessages },
      enableHttp2: true,
      timeout: 120000,
      success: (res) => {
        if (res.data && res.data.response !== undefined) {
          // Non-streaming response
          this.updateAssistant(assistantId, res.data.response, res.data.tool_calls || []);
        } else {
          this.updateAssistant(assistantId, 'Received response but could not parse it.', []);
        }
        this.setData({ isStreaming: false });
      },
      fail: (err) => {
        this.appendAssistantText(assistantId, `\n\n[Error: ${err.errMsg}]`);
        this.setData({ isStreaming: false });
      },
    });
  },

  updateAssistant(assistantId, content, toolCalls) {
    const msgs = this.data.messages;
    const idx = msgs.findIndex((m) => m.id === assistantId);
    if (idx === -1) return;

    msgs[idx] = {
      ...msgs[idx],
      content: content || '',
      toolCalls: toolCalls.map((tc) => ({
        id: tc.id,
        tool: tc.tool,
        args: tc.args,
        result: tc.result,
        status: tc.result ? 'done' : 'pending',
      })),
      streaming: false,
    };

    this.setData({ messages: msgs });
  },

  appendAssistantText(assistantId, text) {
    const msgs = this.data.messages;
    const idx = msgs.findIndex((m) => m.id === assistantId);
    if (idx === -1) return;
    msgs[idx].content += text;
    this.setData({ messages: msgs });
  },

  onStop() {
    this.setData({ isStreaming: false });
  },

  toggleTool(e) {
    const toolId = e.currentTarget.dataset.id;
    const msgs = this.data.messages;
    for (const msg of msgs) {
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          if (tc.id === toolId) {
            tc.expanded = !tc.expanded;
          }
        }
      }
    }
    this.setData({ messages: msgs });
  },

  onPullDownRefresh() {
    this.setData({ messages: [], isStreaming: false });
    wx.stopPullDownRefresh();
  },
});
