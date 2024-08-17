TODO:

# Stream

Support streaming (needed due to long nature of potential actions)

- ✅ Find example in vercel fn to do stream to api (see actionschema serverless or find online)
- ✅ Make my post endpoint adhere to the stream boolean in the proper way
- ✅ Find the best way to show intermediate status of api calls.

Stream POC:

- ✅ keep executing functions without interuption
- ✅ have arguments!!! openai has the tool call input in separate stream messages, while groq just has it all at once. we need to aggregrate them!
- ✅ keep spec same as https://platform.openai.com/docs/api-reference/chat/object
- ✅ runs on edge
- ✅ make streaming optional

Merging

- ✅ Merged it all into each other

learnings

- Streams zijn heel powerful maar moeilijk te gebruiken. ik heb het lang ontweken maar ivm hoe serverless werkt dezerdagen, kan ik er niet meer omheen!
- Antlike navigation on the internet... 🐜🐜🐜🐜 kan het?
- sometimes you really need to simplify and start from first principles looking, observing at what you have and what you want, and decide the simplest version of the most important things that is getting you to a different result than before.

# settings.html

- edit headers
- edit model

# chat.html

Is single chat!!!

Should verify openapiUrl

- If no authToken and no overwrite authToken redirect to login
- If openapi not valid, redirect to explore.html
- If yes, add data to recent urls in localStorage

🔥 Threads get stored independently of openapiUrl, only in localStorage. OpenapiUrl can be re-routed without trouble, making it dynamic while keeping thread as-is.

# explore.html

List recent tools (localStorage)

List recent threads (localStorage)

# Finalise

- Create test endpoint that simply calls /chat/completion
- Aggregate to JSON (`streamToJsonResponse`)
- allow edge

# Decisions/questions

- Can i make this embeddable using a little circle turning into a sidebar? That would be a very nice add-on
- Do access token check on frontend as well as on backend? Can be useful UX wise.
- Shall I allow for additional tools (that aren't executed, but live alongside it)? For now, respond with 'tools need to be supplied over OpenAPI'.
- Allowed additional header for LLM basePath + secret
- How do I make sure this thing keeps being a top priority? This seems like a great great value-add

# Dynamic OpenAPI

🔥 Threads get stored independently of openapiUrl, only in localStorage. OpenapiUrl can be re-routed without trouble, making it dynamic while keeping thread as-is.

The url determines the openapi, the openapi determines the tools and authorization. I have already added operationIds, but another very interesting thing would be to embed actionschema search into big openapis, so we only show the most relevant tool(s) based on the messages.

# Auth

Obviously i want to immediately login when navigating to another openapi. How exactly this should be done IDK yet but most likely links to login in redirect with custom redirecturls
