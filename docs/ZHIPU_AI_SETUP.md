# Zhipu AI Integration Setup Guide

## Getting an API Key

1. Visit [Zhipu AI Console](https://open.bigmodel.cn/usercenter/apikeys)
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `sk-`)

## Environment Variables

Add to your `.env` file:

```bash
# Zhipu AI API Configuration
NEXT_PUBLIC_ZHIPU_API_KEY=sk-your-api-key-here
NEXT_PUBLIC_ZHIPU_MODEL=glm-4
USE_AI_CONTENT=true
```

## Configuration Options

### Model Selection
- `glm-4`: Standard model, cost-effective
- `glm-4-plus`: Higher quality, more expensive

### Locale Setting
Currently hardcoded to `'en'` in gameStore. Future versions will allow user selection.

## Testing

### Enable AI Generation
```bash
USE_AI_CONTENT=true npm run dev
```

### Disable AI Generation (Use Static Content)
```bash
# Don't set USE_AI_CONTENT or set to false
npm run dev
```

## Troubleshooting

### API Key Not Found
If you see "Content generator disabled" in console:
- Check that `NEXT_PUBLIC_ZHIPU_API_KEY` is set
- Restart dev server after changing env vars

### Generation Fails
If content generation fails and falls back to static content:
- Check console for error messages
- Verify API key is valid
- Check network connectivity

## Cost Monitoring

Approximate cost per session: ¥0.88 (~$0.17 USD)

Monitor actual usage by:
- Watching token usage in Zhipu AI console
- Checking localStorage for generated content size

## Architecture

The AI content generation system works as follows:

1. **Content Generation** - On app load, if AI is enabled and API key is configured:
   - Generate all game content (emails, logs, DMs, LOLBins, WiFi)
   - Store in contentStore and localStorage
   - Show loading screen with progress

2. **Caching** - Generated content is cached in localStorage:
   - Subsequent page loads use cached content
   - No API calls made for cached sessions
   - Faster loading on replay

3. **Fallback** - If AI generation fails or is disabled:
   - Use static content from `/src/content/*.ts`
   - Game still fully functional
   - No network dependency

## Content Types Generated

The following content types are dynamically generated:

- **Pre-breach emails** (5 emails): Normal corporate emails
- **Breach phishing emails** (10 emails): Phishing attempts with indicators
- **Log entries** (50 entries): Mix of legitimate and malicious activity
- **Social engineering DMs** (8 messages): Phishing attempts via DM
- **NPC bad advice** (4 messages): Poor incident response guidance
- **LOLBins** (10 entries): Windows LOLBin activity
- **WiFi networks** (5 entries): Including Evil Twin APs

All content is generated with:
- Valid technical details (SPF/DKIM/DMARC headers, MITRE ATT&CK IDs)
- Realistic corporate language and jargon
- Mix of easy/medium/hard difficulty levels
- Proper i18n support via locale parameter
