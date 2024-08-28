# Chat stability

- ✅ See tool progress as text completion result
- ✅ tools groq
- Tools anthropic
- Fix tooluse operationId limitation OpenAI (e.g. `/` in github or `.` in ga4) -> slugify
- ✅ Can't scroll up while generating completions
- When going to another agent, I loose my input text

# Hide implementation for foundation model creation.

OpenAPIs are now open and exposed to the user. This is extremely powerful, but it's possible to hide and create a basemodel too. All we need to do is create a kv store that maps a slug to the openapi (and partial profile), and then it's a matter of using https://chat.actionschema.com/{slug} as a basepath. From here you can chat with it, and https://chat.actionschema.com/{slug}/chat/completions and https://chat.actionschema.com/{slug}/openapi.json would be available too.

This adds complexity, but also cleans up the interface a lot, and creates a lot of IP for the creator of the agent. Maybe even including the API key! Nevertheless we can still link to the openapi for the free version...

RRRRRReeeeeallly powerful for creating new agents for people. Things become so much simpler!

Let's do this as a remix of my repo once I get there!

Also: `curl https://chat.actionschema.com/chat/completions?openapiUrl=https://github.actionschema.com/CodeFromAnywhere/github-registry/openapi.json` puts the openapi in the server. This cannot be done if it contains a `?` or at least, that's super tricky I guess.

Maybe we can still make a catchall so it DOES work with the encoded URL as prefix, still allowing for any path.

But making a slug -> profile also possible is definitely powerful.

🤔🔥 `openapi-chat-completion` is an internal tool behind login without state. `openapi-agent` can become one a profile registry on top of it, adding state, exposed at https://agent.actionschema.com/{slug} baseUrl.

Create a fully private agent-setup as a public config-file. User only sees https://boardapp.nl/chat/{bedrijf}

# Tools with instant prompt and codeblock input or output

I need a streaming API that goes from prompt to hosted files. Together with a simple fetch api this is a killer coding agent that allows for making a more scalable website.

🤔 The `content/set` tool is great, but if we would use it as an agent, it would not make the code visible, or it would need to generate the code twice. Rather than that, we can move the code for this tool to the backend by asking the agent to execute after the end of the codeblock. However, it should be given previousCodeblock automatically.

In `/chat/completion`, allow setting a `codeblockOperationId` and `promptOperationId` which contain operationId of the openapi that should recieve `code+language` and `prompt` automatically. This should remove these toplevel params from the context of the tool, and attach them automatically.

Now, instruct an agent to call after generating code. The resulting links shall now appear as part of the text generation, making it much more performant, and elegant 💪🔥

Now we can simplify and generalise the chat frontend, because the info is in the markdown, which can be rendered as required.

This further brings the ability to use code generation tools anywhere.

<!--
After I have this, create a tool that stream responds the first codeblock with keep-alive and stops at the end. This tool can be used from `generateHtmlMiddleware` and I never need to think about HTML anymore. The LOC of all my repos become much smaller!
-->

<!--
Insight: this is my core competency, as it will improve the API. I'm wasting too much time on frontend, I can test programatically!
-->

# Tools for Navigation

🤔 Threads get stored independently of openapiUrl, only in localStorage. OpenapiUrl can be re-routed without trouble, making it dynamic while keeping thread as-is. The url determines the openapi, the openapi determines the tools and authorization. I have already added operationIds, but another very interesting thing would be to embed actionschema search into big openapis, so we only show the most relevant tool(s) based on the messages.

For this, maybe we can also create a new property `redirectOperationId`. If the redirect operation has a property `location:string` (and maybe `target:"_blank"`) in the response, the browser should navigate there.

🤔 Don't know yet how to make it navigatable to other agents. Maybe that should be specifyable in a specific format.

✅ If we want agents to automatically pick up `redirectOperationId`, `codeblockOperationId` and `promptOperationId`, we could add these into the operation item. Added to the spec!

❗️ I really want to see a router agent... That would be my new starting point!

# FIX BROKEN STUFF

- Fix auth in a way that it can store secrets again for me - choose between oauth2 or not - and have an endpoint that allows to retrieve the secret.
- Edge deployment of env+fn+io: try https://docs.val.town/openapi#tag/vals/POST/v1/vals and later replace with cloudflare or aws.

# Authed cached static deployment

Content at {twitterhandle}.gptideas.com with twitter login so it also links to your twitter, auto slug-generation for filename. this would also allow overwriting a slug.

# Then Big value unlocks:

- list public github repos of any owner
- dynamic system prompt for github repos and github owners
- bulk search github repos -> gpt question on context
- scalable screenshots & HTML to MD
