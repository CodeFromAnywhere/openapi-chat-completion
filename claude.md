# Universal chat completion landingpage for chat.actionschema.com

✅ Create Test and confirm the `/chat/completions` endpoint of claude works.

✅ Make `anthropic/chat/completions` also work with tools!!! This is big.

✅ Make the universal `/chat/completions` available at https://chat.actionschema.com with the same interface at the front as anthropic.

Add an API key for each provider

Add ability to set custom provider url + key

Based on model selection, select the right provider

Test chat.actionschema.com locally on each provider

Figure out the best way to ratelimit each provider independently.

Add executed tool use into the message as markdown codeblocks: input + output

Think about a way to maybe also allow for streaming deltas of downstream streaming APIs

Allow customisation in ratelimits on a per-model per-ip, and per-user basis, offering a very large free tier for tiny models, that can be overwritten (made smaller) by downstream endpoints.

chat.actionschema.com should be the goto place better than anthropic.actionschema.com

Maybe we need to introduce a new primitive, so that agent stacking becomes viable. Imagine your agent having a conversation with another agent. How to show this? How to structure this data? Cool idea! Maybe it can be done with simplified API

```ts
type ToolDelta = {
  id: string;
  input: any;
  partial: any;
  output: any;
};
```

# I want to chat with Claude with an operation definition as context and some presets

- ✅ Created code-agent openaip and plugged it into search
- ✅ Anthropic transformer to use claude 3.5 as a stream
- Have proper error handling in `chat-component.js`
- Make `chat-component.js` work without error
- Make chat/simple respond with actions in \`\`\`request:{operationId}\`\`\` codeblock and \`\`\`response:{operationId}\`\`\` codeblock.
- Use `/chat/simple` instead
- ensure unfinished md gets rendered correctly
- Text-wrap text in the chat box
