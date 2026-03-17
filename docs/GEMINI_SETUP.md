# Gemini AI Setup Guide

This guide explains how to set up Google Gemini API for AI-generated content in The Ghost Architect.

## Overview

The Ghost Architect uses Google Gemini API to generate dynamic cybersecurity training content including:
- Phishing emails with headers
- Log entries for forensic analysis
- Social engineering DM scenarios
- LOLBin (Living Off The Land) process entries
- WiFi network configurations
- NPC bad advice messages

## Getting Started

### 1. Get API Key

1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create a new project or select existing one
3. Navigate to "API Keys" section
4. Generate a new API key
5. Save the API key securely

**Important**: The system uses **bundled content generation** - all game content (emails, logs, DMs, LOLBins, WiFi) is generated in a single API request for maximum efficiency and rate limit management.

### 2. Configure Environment Variables

#### For Local Development

Create a `.env.local` file in the project root:

```bash
# Enable backend content generation
NEXT_PUBLIC_BACKEND_ENABLED=true

# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash  # Options: gemini-1.5-pro, gemini-1.5-flash, gemini-1.0-pro
```

### 3. Batch API Implementation

The system uses **Gemini Batch API** (`models/*/batchPredict`) for optimized content generation:

- **Single request** for all content (emails, logs, DMs, LOLBins, WiFi)
- **Efficient rate limit usage** - 1 request instead of 7 separate calls
- **Faster generation** - no waiting between individual content types
- **Better cost management** - unified API usage tracking

The batch API generates all content types simultaneously in a single comprehensive response, which is much more efficient than making separate API calls for each content type.

#### For Production

Set these environment variables in your deployment environment:

```bash
NEXT_PUBLIC_BACKEND_ENABLED=true
GEMINI_API_KEY=your_production_api_key
GEMINI_MODEL=gemini-1.5-pro  # Use pro model for production
```

### 3. Model Selection

Choose the appropriate Gemini model based on your needs:

- **`gemini-1.5-flash`** (Default): Fast and cost-effective, good for development
- **`gemini-1.5-pro`**: Higher quality, slower, good for production
- **`gemini-1.0-pro`**: Previous version, fallback option

## Rate Limiting

The system includes comprehensive rate limiting:

### Client-Side:
- Minimum 30 seconds between requests
- 5-minute cooldown after rate limits
- Exponential backoff for repeated errors
- Automatic fallback to offline content

### Server-Side:
- 1 request per 5 minutes per IP
- In-memory rate limiting
- Automatic 429 responses with wait times

## Content Generation Flow

1. User completes MFA (authentication)
2. System checks for cached content
3. If no cache, requests generation from API
4. Results cached in localStorage
5. Future requests use cached content

## Troubleshooting

### "API key not configured"
- Check that `GEMINI_API_KEY` is set
- Verify environment variables are loaded correctly

### "Rate limit exceeded"
- Wait for the cooldown period to expire
- Check logs for specific wait times
- Content will automatically fall back to offline mode

### "Failed to parse AI response"
- Check API logs for the actual response
- JSON parsing handles multiple markdown formats
- System will retry with offline content

### Content generation disabled
- Ensure `NEXT_PUBLIC_BACKEND_ENABLED=true`
- Check API key validity
- Review console logs for specific errors

## Cost Considerations

- Gemini has free tier limits (typically 15 requests/minute)
- `gemini-1.5-flash` is more cost-effective for generation
- Content is cached after first generation
- Rate limiting helps control costs

## Security Notes

- API key is never exposed to browsers (server-side only)
- `NEXT_PUBLIC_*` variables are for client-side configuration
- `GEMINI_API_KEY` is server-side only
- API key is passed securely to Gemini via HTTPS

## Testing

To test content generation locally:

```bash
# Start development server
npm run dev

# Login and complete MFA to trigger generation
# Check console logs for progress
```

## Monitoring

Monitor these metrics:
- Content generation success rate
- API response times
- Rate limit occurrences
- Cache hit rate (should be high)

## Fallback Content

The system includes comprehensive fallback content for all scenarios:
- Pre-breach emails
- Breach phishing emails
- Log entries
- Social engineering DMs
- NPC advice
- LOLBins
- WiFi networks

Fallback content is used when:
- API key not configured
- Rate limits exceeded
- API errors
- Network issues

## API Documentation

- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Pricing](https://ai.google.dev/pricing)
