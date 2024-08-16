TODO:

- support streaming (needed due to long nature of potential actions)
- aggregate usage

# chat

Should verify openapiUrl

- If no authToken and no overwrite authToken redirect to login
- If openapi not valid, redirect to explore.html
- If yes, add data to recent urls in localStorage

Threads get stored independently of openapiUrl. openapiUrl can be re-routed without trouble, making it dynamic.

# explore

List recent tools (localStorage)

List recent threads (localStorage)

# Decisions

- Shall I allow for additional tools (that aren't executed, but live alongside it)? For now, respond with 'tools need to be supplied over OpenAPI'.
- Allowed additional header for LLM basePath + secret
