# Made Tool Template

Idk what i wanted to do with tools exactly. I think it's probably not needed to create a backend for tools as everyone can make their own front+backend with my lib.

Also let's consider to make chat.actionschema.com open source? Or at least open-api? At least let's take a look what is needed to make this a success. For now, it's wasted potential.

# Stabilize

Fix problem with weird anthropic generations.

Ensure to add some tests on every layer.

# Streaming tools

Allow for tools that stream.

As an example, an agent that uses another agent would be very cool.

# Debugging

What I have now is very hard to debug.

How can I make it easier to debug these agents that use tools in for example irfc-cloud?

# Callback tools

Tools that take a while to generate must be able to use callback functionality to then re-activate the LLM.

# Tools for Navigation

🤔 Threads get stored independently of openapiUrl, only in localStorage. OpenapiUrl can be re-routed without trouble, making it dynamic while keeping thread as-is. The url determines the openapi, the openapi determines the tools and authorization. I have already added operationIds, but another very interesting thing would be to embed actionschema search into big openapis, so we only show the most relevant tool(s) based on the messages.

For this, maybe we can also create a new property `redirectOperationId`. If the redirect operation has a property `location:string` (and maybe `target:"_blank"`) in the response, the browser should navigate there.

🤔 Don't know yet how to make it navigatable to other agents. Maybe that should be specifyable in a specific format.

✅ If we want agents to automatically pick up `redirectOperationId`, `codeblockOperationId` and `promptOperationId`, we could add these into the operation item. Added to the spec!

❗️ I really want to see a router agent... That would be my new starting point!
