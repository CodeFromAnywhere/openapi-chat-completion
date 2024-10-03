# Chat stability

- ✅ See tool progress as text completion result
- ✅ tools groq
- ✅ Fix tooluse operationId limitation OpenAI (e.g. `/` in github or `.` in ga4) -> slugify
- ✅ Can't scroll up while generating completions
- ✅ When going to another agent, I loose my input text

# Chat system prompt from urls

Example: `Make the complete openapi.json specification file that specifies what is implemented in this code: https://uithub.com/BrandwatchLtd/bcr-api/tree/master/src/bcr_api`

This should expand into the systemprompt being appended with the contents of the url.

If the result has a non-terminated codeblock, it should be able to continue from after an exact character, and ultimately concatenate all json chunks generated, responding with one complete JSON.

The result should be cached by default. Since we need context, a simple rule to expand urls as context is enough, we don't need to do this for all tools per se, but that could be done later too.

Cached results should not require authentication and can be made into an URL by looking at the hash.

Having this as a standalone cacheable api is super powerful, especially if it's url-based.

# Made Tool Template

Idk what i wanted to do with tools exactly. I think it's probably not needed to create a backend for tools as everyone can make their own front+backend with my lib.

Also let's consider to make chat.actionschema.com open source? Or at least open-api? At least let's take a look what is needed to make this a success. For now, it's wasted potential.

# Stabilize + Cache chat.actionschema.com

Fix problem with weird anthropic generations.

Ensure to add some tests on every layer.

# Stability and ratelimit-reset headers

When there is too much usage, ensure to use `x-ratelimit-*` headers indicating when we can use stuff again. This makes it easier to build reliable workflows.

# Caching

For many use-cases it's interesting to have a highly performant cache that immediately responds given a tool-free prompt being the same as previously. This is easy to implement and I've done it before. Redis seems great for this.

# Streaming tools

Allow for tools that stream.

As an example, an agent that uses another agent would be very cool.

# jsonGpt

Lets make it good and easy to debug.

# Debugging

What I have now is very hard to debug.

How can I make it easier to debug these agents that use tools in for example irfc-cloud?

# callback tools

Tools that take a while to generate must be able to use callback functionality to then re-activate the LLM.

# Tools with instant prompt and codeblock input or output

I need a streaming API that goes from prompt to hosted files. Together with a simple fetch api this is a killer coding agent that allows for making a more scalable website.

🤔 The `content/set` tool is great, but if we would use it as an agent, it would not make the code visible, or it would need to generate the code twice. Rather than that, we can move the code for this tool to the backend by asking the agent to execute after the end of the codeblock. However, it should be given previousCodeblock automatically.

In `/chat/completion`, allow setting a `codeblockOperationId` and `promptOperationId` which contain operationId of the openapi that should recieve `code+language` and `prompt` automatically. This should remove these toplevel params from the context of the tool, and attach them automatically.

Now, instruct an agent to call after generating code. The resulting links shall now appear as part of the text generation, making it much more performant, and elegant 💪🔥

Now we can simplify and generalise the chat frontend, because the info is in the markdown, which can be rendered as required.

This further brings the ability to use code generation tools anywhere.

<!--
After I have this, create a tool that stream responds the first codeblock with keep-alive and stops at the end. This tool can be used from `generateHtmlMiddleware` and I never need to think about HTML anymore. The LOC of all my repos become much smaller!

Insight: this is my core competency, as it will improve the API. I'm wasting too much time on frontend, I can test programatically!
-->

# Tools for Navigation

🤔 Threads get stored independently of openapiUrl, only in localStorage. OpenapiUrl can be re-routed without trouble, making it dynamic while keeping thread as-is. The url determines the openapi, the openapi determines the tools and authorization. I have already added operationIds, but another very interesting thing would be to embed actionschema search into big openapis, so we only show the most relevant tool(s) based on the messages.

For this, maybe we can also create a new property `redirectOperationId`. If the redirect operation has a property `location:string` (and maybe `target:"_blank"`) in the response, the browser should navigate there.

🤔 Don't know yet how to make it navigatable to other agents. Maybe that should be specifyable in a specific format.

✅ If we want agents to automatically pick up `redirectOperationId`, `codeblockOperationId` and `promptOperationId`, we could add these into the operation item. Added to the spec!

❗️ I really want to see a router agent... That would be my new starting point!

# Explain how to use

This page/functionality should still be hidden for now until I really know how to monetise this properly.

https://chat.actionschema.com should be better documented.

Explainer page should focus on how to use it with the OpenAI SDK so you can use any tool there.
