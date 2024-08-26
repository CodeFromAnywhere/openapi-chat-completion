# Universal chat completion landingpage for chat.actionschema.com

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

# Profiles

✅ Create profile creator and selector allowing you to easily see which settings are applied and keep track of multiple settings

✅ 'Publish profiles' can use `content.actionschema.com/set` to retrieve a URL containing a JSON of your profiles. It could navigate there with window.location.href={url}

✅ `?profiles={url}` should contain a JSON. if so, it should load in a set of profiles from someone else merging it with your current profiles at `chatProfiles`

✅ An ability to remove profiles easily will be great. For this, the profile selector needs to be added on settings to switch profile just like in index. A 'delete profile' button next to the selector shall delete the key from chatProfiles, and set currentProfile to the next option, and refresh the page.

✅ When chatProfiles is not set yet, load in profiles from a hardcoded URL and select the first one. That url is to be given.
