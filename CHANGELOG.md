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

# August 22nd, 2024: Improved Simplified UI

✅ Optimise it to work perfectly with `MenubarX` (small mobile layout)

✅ Create a page that is used if you open chat.actionschema.com that has 6 or 8 chats as iframes on desktop (based on the window width) or it has just one if it's a mobile view.

✅ Every iframe should open the explorer

✅ The new thread button should just go to explore

Every thread should keep track of the last openapi it was at, so we can come back to it.

Explore:

- ✅ button 'new' on top --> **must open clean slate**
- ✅ recent conversations are at the top
- ✅ render openapi info
- ✅ the last openapi is the most prevalent one.

# Universal chat completion landingpage for chat.actionschema.com (26 aug)

✅ Created code-agent openaip and plugged it into search

✅ Anthropic transformer to use claude 3.5 as a stream

✅ Create Test and confirm the `/chat/completions` endpoint of claude works.

✅ Make `anthropic/chat/completions` also work with tools!!! This is big.

✅ Make the universal `/chat/completions` available at https://chat.actionschema.com with the same interface at the front as anthropic.

✅ Add an API key for each provider

✅ Add ability to set custom provider url + key

✅ Based on model selection, select the right provider

✅ Greatly simplify and generalise the UI

❌ Figure out the best way to ratelimit each provider independently. Allow customisation in ratelimits on a per-model per-ip, and per-user basis, offering a very large free tier for tiny models, that can be overwritten (made smaller) by downstream endpoints. **Just keep it free for now**

✅ Test chat.actionschema.com locally on each provider. chat.actionschema.com should be the goto place better than anthropic.actionschema.com.

# Profiles (26 aug)

✅ Create profile creator and selector allowing you to easily see which settings are applied and keep track of multiple settings

✅ 'Publish profiles' can use `content.actionschema.com/set` to retrieve a URL containing a JSON of your profiles. It could navigate there with window.location.href={url}

✅ `?profiles={url}` should contain a JSON. if so, it should load in a set of profiles from someone else merging it with your current profiles at `chatProfiles`

✅ An ability to remove profiles easily will be great. For this, the profile selector needs to be added on settings to switch profile just like in index. A 'delete profile' button next to the selector shall delete the key from chatProfiles, and set currentProfile to the next option, and refresh the page.

✅ When chatProfiles is not set yet, load in profiles from a hardcoded URL and select the first one. That url is to be given.

# Chat stability (26 august, 2024)

- ✅ See tool progress as text completion result
- ✅ tools groq
- ✅ Fix tooluse operationId limitation OpenAI (e.g. `/` in github or `.` in ga4) -> slugify
- ✅ Can't scroll up while generating completions
- ✅ When going to another agent, I loose my input text
