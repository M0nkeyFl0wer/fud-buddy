
# FUD Buddy Utilities

This directory contains utility functions and helpers used throughout the FUD Buddy application.

## Utilities Overview

### Airtable Utilities (`airtable.ts`)

Mock implementation for Airtable integration. In the current implementation, these functions log data to the console rather than sending to Airtable.

**Key Functions**:
- `logToAirtable(table, data)`: Logs data to a specified Airtable table
- `fetchFromAirtable(table, filters)`: Mock function for retrieving data

**Example Usage**:
```typescript
import { logToAirtable } from '@/utils/airtable';

// Log an event to Airtable
logToAirtable('events', {
  event: 'button_click',
  timestamp: new Date().toISOString(),
  userId: 'user-123'
});
```

### UI Utilities (`utils.ts`)

Helper functions for UI operations:

**Key Functions**:
- `cn`: A utility for conditionally joining classNames

**Example Usage**:
```typescript
import { cn } from '@/utils/utils';

// Conditionally apply classes
const className = cn(
  'base-class',
  isActive && 'active-class',
  isDisabled && 'disabled-class'
);
```

## Production Implementation

For a production implementation, consider:

1. **Real Airtable Integration**: Replace mock functions with actual Airtable API calls
2. **Error Handling**: Add proper error handling and retry logic
3. **Caching**: Implement caching for frequently accessed data
4. **Rate Limiting**: Add rate limiting for API calls
5. **Validation**: Add data validation for inputs and outputs

## Extending Utilities

When adding new utility functions:

1. Group related functions in appropriate files
2. Keep functions pure when possible
3. Add proper TypeScript typing
4. Include JSDoc comments for complex functions
5. Consider creating specialized services for complex operations
