# n8n Code Node Development Guide

This guide covers inline JavaScript transformations and the Code node in n8n workflows for the hhpolicy-ai project.

## Key Differences: Inline Expressions vs Code Node

| Aspect | Inline Expressions | Code Node |
|--------|-------------------|-----------|
| **Where** | Directly in node parameters (toggle "Fixed / Expression") | As a separate node in the workflow |
| **Syntax** | Single‐line JavaScript wrapped in `{{ }}` | Full multi‐line JavaScript (or Python) |
| **Ideal Use Case** | Quick transformations (like `.isEmail()`, `.sum()`) | More complex logic (loops, conditionals, multiple variables) |
| **Access to n8n Helpers** | Some helpers are inline‐only (`$if()`, `$itemIndex`) | Many helpers are available, but not all (e.g., `$if()` is not) |
| **Data Handling** | Must remain on a single line | No line limits; can perform multi‐step code |

## Inline Expressions Basics

Use in node parameters by switching to "Expression" mode:

```javascript
{{ <your JavaScript here> }}
```

### Built-in Data Transformation Functions

#### String Transformations
- `.isEmail()` - Check if string is valid email
- `.extractDomain()` - Extract domain from URL
- `.removeTags()` - Remove HTML tags
- `.base64Encode()` / `.base64Decode()` - Base64 encoding/decoding
- `.toSnakeCase()` / `.toCamelCase()` - Case conversion
- `.extractUrlPath()` - Extract path from URL

```javascript
{{ "john@example.com".isEmail() }}  // Returns: true
{{ "https://www.example.com/path".extractDomain() }}  // Returns: "www.example.com"
{{ "Hello World!".toSnakeCase() }}  // Returns: "hello_world!"
```

#### Array Transformations
- `.sum()` - Sum all numerical elements
- `.removeDuplicates()` - Remove duplicates
- `.merge(array)` - Merge arrays
- `.isEmpty()` - Check if empty
- `.randomItem()` - Get random element
- `.first()` / `.last()` - Get first/last element

```javascript
{{ [1, 2, 2, 4].removeDuplicates() }}  // Returns: [1, 2, 4]
{{ [10, 20, 30].sum() }}  // Returns: 60
{{ [1, 2, 3].merge([4, 5]) }}  // Returns: [1, 2, 3, 4, 5]
```

#### Number Transformations
- `.round(decimalPlaces)` - Round to decimal places
- `.toBoolean()` - Convert to boolean (0 → false, other → true)
- `.format(locale)` - Format by locale
- `.isEven()` / `.isOdd()` - Check even/odd

```javascript
{{ 123.456.round(2) }}  // Returns: 123.46
{{ 10.isEven() }}  // Returns: true
```

#### Date & Time (Luxon)
- `.toDateTime()` - Parse to Luxon DateTime
- `.plus(amount, unit)` - Add time
- `.minus(amount, unit)` - Subtract time
- `.format(formatString)` - Format date
- `.isWeekend()` - Check if weekend

```javascript
{{ "2025-01-03".toDateTime().plus(3, "days").format("yyyy-MM-dd") }}  // Returns: "2025-01-06"
```

## Code Node Usage

### Accessing Input Data

```javascript
// Run Once for All Items
const items = $input.all();

// Run Once for Each Item
const item = $input.item;
const data = item.json;
```

### Built-in Helper Methods in Code Node

| Method | Available in Code Node | Purpose |
|--------|----------------------|---------|
| `$evaluateExpression(expr, itemIndex?)` | ✓ | Evaluate inline expression |
| `$ifEmpty(value, defaultValue)` | ✓ | Return default if empty |
| `$if(condition, true, false)` | ✗ | Use ternary operator instead |
| `$max` / `$min` | ✗ | Use `Math.max()` / `Math.min()` |

### Built-in Variables

```javascript
// Workflow & Execution
$workflow.id          // Workflow ID
$workflow.name        // Workflow name
$execution.id         // Execution ID
$execution.mode       // test or production

// Environment & Secrets
$env.VARIABLE_NAME    // Environment variables
$secrets.SECRET_NAME  // External secrets
$vars.globalVar       // Global variables (read-only)

// Static Data Persistence
$getWorkflowStaticData('global')  // Global persistent data
$getWorkflowStaticData('node')    // Node-specific persistent data
```

### Accessing Other Nodes

```javascript
// Get data from other nodes
const httpItems = $("HTTP Request1").all();    // All items
const firstItem = $("HTTP Request1").first();  // First item
const lastItem = $("HTTP Request1").last();    // Last item

// In Code Node only
const matchingItem = $("NodeName").itemMatching($input.context.currentNodeInputIndex);
```

### JMESPath Usage

```javascript
// Filter and transform JSON data
const data = {
  users: [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 }
  ]
};

const result = $jmespath(data, 'users[?age > `25`].name'); 
// Returns: ["Alice"]
```

## Code Node Best Practices

### Error Handling
```javascript
try {
  const items = $input.all();
  const processedItems = items.map(item => {
    if (!item.json.email) {
      throw new Error('Email is missing for item ID: ' + item.json.id);
    }
    item.json.email = item.json.email.toLowerCase();
    return item;
  });
  return processedItems;
} catch (error) {
  console.error('Processing error:', error);
  throw error; // This will stop the workflow and mark it as failed
}
```

### Data Validation
```javascript
// Validate required fields
if (!item.json.requiredField) {
  throw new Error('requiredField is missing');
}

// Ensure object structure
if (item.json.user && typeof item.json.user === 'object') {
  item.json.user.isActive = true;
} else {
  item.json.user = { isActive: true };
}
```

### Return Format
```javascript
// For "Run Once for All Items"
return processedItems;

// For "Run Once for Each Item"  
return item;

// Always return in proper format
return [{ json: modifiedData }];
```

## Common Patterns for hhpolicy-ai

### Document Processing
```javascript
// Process uploaded documents
const items = $input.all();
const processedDocs = items.map(item => {
  const doc = item.json;
  
  // Add processing metadata
  doc.processedAt = new Date().toISOString();
  doc.workflowId = $workflow.id;
  
  // Extract file info safely
  doc.fileName = $ifEmpty(doc.originalName, 'unknown.pdf');
  doc.fileSize = doc.size || 0;
  
  // Validate document type
  if (!doc.mimeType || !doc.mimeType.includes('pdf')) {
    doc.processingError = 'Only PDF files are supported';
  }
  
  return { json: doc };
});

return processedDocs;
```

### Role-based Data Processing
```javascript
// Process data based on user roles
const items = $input.all();
const processedItems = items.map(item => {
  const userData = item.json;
  
  // Determine access level based on role
  const role = $ifEmpty(userData.role, 'guest');
  
  switch(role) {
    case 'administrator':
      userData.accessLevel = 'full';
      userData.canUpload = true;
      break;
    case 'executive':
      userData.accessLevel = 'read';
      userData.canUpload = false;
      break;
    default:
      userData.accessLevel = 'none';
      userData.canUpload = false;
  }
  
  return { json: userData };
});

return processedItems;
```

### Policy Document Metadata
```javascript
// Extract and process policy metadata
const items = $input.all();
const enrichedPolicies = items.map(item => {
  const policy = item.json;
  
  // Extract metadata using JMESPath if structured data exists
  if (policy.extractedData) {
    const dates = $jmespath(policy.extractedData, 'dates[*]');
    const versions = $jmespath(policy.extractedData, 'versions[*]');
    
    policy.effectiveDate = dates && dates.length > 0 ? dates[0] : null;
    policy.version = versions && versions.length > 0 ? versions[0] : '1.0';
  }
  
  // Flag outdated policies
  if (policy.effectiveDate) {
    const effectiveDate = new Date(policy.effectiveDate);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    policy.isOutdated = effectiveDate < twoYearsAgo;
  }
  
  return { json: policy };
});

return enrichedPolicies;
```

## Debugging

### Logging
```javascript
console.log('Input Items:', items);
console.log('Processing item:', item.json.id);
```

### Testing Data Structures
```javascript
// Log data structure for debugging
console.log('Item structure:', JSON.stringify(item.json, null, 2));
```

## Limitations

- Code Node runs in sandboxed environment
- External npm modules only available in self-hosted instances
- No file system access (`fs` module restricted)
- State doesn't persist between executions
- Resource constraints for large datasets

## Integration with Supabase Edge Functions

When processing data that will be sent to Supabase Edge Functions:

```javascript
// Prepare data for Supabase Edge Function
const items = $input.all();
const supabasePayload = items.map(item => {
  return {
    id: item.json.id,
    content: item.json.extractedText,
    metadata: {
      fileName: item.json.fileName,
      uploadedBy: item.json.userId,
      role: item.json.userRole,
      processedAt: new Date().toISOString()
    }
  };
});

return [{ json: { documents: supabasePayload } }];
```

This guide provides the essential knowledge for working with n8n Code Nodes in the hhpolicy-ai project, focusing on document processing, role-based access, and integration patterns.