# Maya Performance Optimizations

## Problem
Maya API responses were taking 1+ minutes even for simple chat messages that don't require canvas actions.

## Root Causes Identified

1. **Heavy Database Operations**: Complex Prisma queries with joins on every request
2. **Expensive Analysis Functions**: Additional xAI API calls for critical analysis and document processing
3. **Massive System Prompt**: 2000+ line prompts increasing token usage and processing time
4. **No Caching**: Context data fetched fresh every time
5. **Inefficient Intent Detection**: Complex logic running regardless of message type
6. **Blocking Database Saves**: Waiting for conversation saves before responding

## Optimizations Implemented

### 1. Context Caching
- **Added**: 5-minute TTL cache for user/grant context data
- **Impact**: Eliminates repeated database queries for the same user session
- **Code**: `contextCache` Map with timestamp-based expiration

### 2. Simple Chat Detection
- **Added**: `isSimpleChatMessage()` function to identify basic questions
- **Impact**: Skips expensive analysis for simple queries like "Hi", "What is...", "How do I..."
- **Patterns**: Detects question patterns vs. action patterns

### 3. Lightweight Prompts
- **Added**: `buildLightweightPrompt()` for simple chat messages
- **Impact**: Reduces system prompt from 2000+ lines to ~50 lines for basic questions
- **Token Savings**: ~90% reduction in prompt tokens for simple chat

### 4. Optimized API Parameters
- **Simple Chat**: 800 max tokens, temperature 0.3, 1 retry
- **Canvas Actions**: 6000 max tokens, temperature 0.7, 2 retries
- **Complex Requests**: 2000 max tokens, temperature 0.7, 2 retries

### 5. Async Database Operations
- **Changed**: Database saves now run asynchronously (non-blocking)
- **Impact**: Response returns immediately after AI processing
- **Code**: `saveConversation().catch(console.error)`

### 6. Parallel Database Operations
- **Added**: User and AI messages saved in parallel using `Promise.all()`
- **Impact**: Reduces database operation time by ~50%

### 7. Performance Monitoring
- **Added**: Processing time tracking and cache statistics
- **Endpoint**: `/api/maya/test` for performance testing
- **Metrics**: Total time, API time, overhead time

## Expected Performance Improvements

| Request Type | Before | After | Improvement |
|-------------|--------|-------|-------------|
| Simple Chat | 60-90s | 3-8s | **85-90% faster** |
| Canvas Actions | 60-120s | 15-30s | **70-80% faster** |
| Complex Analysis | 90-150s | 30-60s | **60-70% faster** |

## Testing the Optimizations

### 1. Health Check
```bash
curl http://localhost:3000/api/maya
```

### 2. Performance Test
```bash
# Simple chat test
curl -X POST http://localhost:3000/api/maya/test \
  -H "Content-Type: application/json" \
  -d '{"testType": "simple"}'

# Complex request test
curl -X POST http://localhost:3000/api/maya/test \
  -H "Content-Type: application/json" \
  -d '{"testType": "complex"}'
```

### 3. Real Usage Test
Try these messages in the Maya chat:
- **Simple**: "Hi Maya, how are you?" (should be very fast)
- **Medium**: "Help me with my budget" (moderate speed)
- **Complex**: "Create a complete proposal with all sections" (slower but much faster than before)

## Cache Management

The context cache automatically:
- Expires entries after 5 minutes
- Stores user/grant combinations
- Clears memory automatically
- Shows statistics in health check

## Monitoring

Check performance with:
```javascript
// In browser console
fetch('/api/maya', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userMessage: "Hi Maya",
    grantId: "test",
    history: []
  })
}).then(r => r.json()).then(console.log)
```

## Future Optimizations

1. **Redis Caching**: Replace in-memory cache with Redis for multi-instance deployments
2. **Response Streaming**: Stream responses for long content generation
3. **Prompt Templates**: Pre-compile common prompt patterns
4. **Database Indexing**: Optimize Prisma queries with proper indexes
5. **CDN Caching**: Cache static analysis results

## Rollback Plan

If issues occur, revert by:
1. Remove caching logic
2. Restore original `loadComprehensiveContext()`
3. Remove `isSimpleChatMessage()` checks
4. Restore synchronous database saves

The optimizations are backward compatible and can be disabled individually.