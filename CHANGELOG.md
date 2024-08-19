# Init: August 17th, 2024

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

UI

- ✅ Created chat, settings, and explore and fixed some nasty bugs
- ✅ Added frames layout

# Finalise

- ✅ Debug tools and make them functional
- ✅ Show indicators and little card when tool(s) are called and when they return, stop loading

# Simplified Chat

- ✅ GET `/chat/simple` should stream to raw text.
- ✅ simplified routing
