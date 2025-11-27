# MCP SSE Transport API

The Healthcare MCP server supports the Model Context Protocol (MCP) over Server-Sent Events (SSE) transport, following the JSON-RPC 2.0 specification.

## Overview

MCP SSE transport uses:
- **GET /sse** - Opens a persistent SSE connection for receiving server-to-client messages
- **POST /sse/{connectionId}** - Sends client-to-server JSON-RPC 2.0 messages

All messages follow JSON-RPC 2.0 format with `jsonrpc: "2.0"` field.

## Connection Flow

1. Client opens SSE connection: `GET /sse`
2. Server responds with `endpoint` event containing the POST URL
3. Client sends JSON-RPC requests to the POST endpoint
4. Server sends JSON-RPC responses via the SSE connection

## Endpoints

### GET /sse

Opens a persistent SSE connection for receiving JSON-RPC 2.0 messages from the server.

**Response Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Events:**
- `endpoint` - Initial event with connection info
- `message` - JSON-RPC 2.0 response messages
- `: heartbeat` - Keep-alive comments (every 15 seconds)

**Example:**
```javascript
const eventSource = new EventSource('http://localhost:3000/sse');

eventSource.addEventListener('endpoint', (event) => {
  const endpoint = JSON.parse(event.data);
  console.log('Connection endpoint:', endpoint.uri);
  // Use this URI for POST requests
});

eventSource.addEventListener('message', (event) => {
  const jsonrpc = JSON.parse(event.data);
  console.log('JSON-RPC Response:', jsonrpc);
});
```

### POST /sse/{connectionId}

Send JSON-RPC 2.0 requests to the server.

**Request Body (JSON-RPC 2.0):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "method_name",
  "params": {
    "param1": "value1"
  }
}
```

**Response (JSON-RPC 2.0):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    // Method-specific result
  }
}
```

## JSON-RPC Methods

### initialize

Initialize the MCP session.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "my-client",
      "version": "1.0.0"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "sampling": {}
    },
    "serverInfo": {
      "name": "healthcare-mcp",
      "version": "2.1.1"
    }
  }
}
```

### tools/list

List all available tools with their full schemas.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "fda_drug_lookup",
        "description": "Look up drug information from the FDA database",
        "inputSchema": {
          "type": "object",
          "properties": {
            "drug_name": {
              "type": "string",
              "description": "Name of the drug to search for"
            },
            "search_type": {
              "type": "string",
              "description": "Type of information to retrieve",
              "enum": ["general", "label", "adverse_events"],
              "default": "general"
            }
          },
          "required": ["drug_name"]
        }
      },
      {
        "name": "pubmed_search",
        "description": "Search PubMed literature",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "Search query for PubMed"
            },
            "max_results": {
              "type": "number",
              "description": "Maximum number of results",
              "default": 5
            }
          },
          "required": ["query"]
        }
      }
      // ... 13 more tools
    ]
  }
}
```

Each tool includes:
- `name`: Tool identifier used when calling tools/call
- `description`: Human-readable description
- `inputSchema`: JSON Schema definition of the tool's parameters
  - `type`: Always "object" for tool parameters
  - `properties`: Parameter definitions with type, description, and optional constraints
  - `required`: Array of required parameter names (optional if all params are optional)

### tools/call

Execute a tool.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "pubmed_search",
    "arguments": {
      "query": "diabetes treatment",
      "max_results": 5
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"results\": [...], \"total\": 5}"
      }
    ]
  }
}
```

## Error Responses

JSON-RPC 2.0 errors:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid Request"
  }
}
```

**Standard Error Codes:**
- `-32700` - Parse error
- `-32600` - Invalid Request (e.g., missing jsonrpc: "2.0")
- `-32601` - Method not found
- `-32602` - Invalid params
- `-32603` - Internal error

## Complete Example

### Browser Client

```javascript
class MCPClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.messageId = 0;
    this.pendingRequests = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.eventSource = new EventSource(`${this.baseUrl}/sse`);
      
      this.eventSource.addEventListener('endpoint', (event) => {
        const endpoint = JSON.parse(event.data);
        this.postUrl = `${this.baseUrl}${endpoint.uri}`;
        console.log('Connected to MCP server');
        resolve();
      });

      this.eventSource.addEventListener('message', (event) => {
        const response = JSON.parse(event.data);
        const pending = this.pendingRequests.get(response.id);
        
        if (pending) {
          if (response.error) {
            pending.reject(new Error(response.error.message));
          } else {
            pending.resolve(response.result);
          }
          this.pendingRequests.delete(response.id);
        }
      });

      this.eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        reject(error);
      };
    });
  }

  async sendRequest(method, params = {}) {
    const id = ++this.messageId;
    
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    const promise = new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    const response = await fetch(this.postUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    // For synchronous responses (like initialize), parse immediately
    if (response.headers.get('content-type')?.includes('application/json')) {
      const result = await response.json();
      this.pendingRequests.delete(id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.result;
    }

    // For async responses, wait for SSE message
    return promise;
  }

  async initialize(clientInfo) {
    return this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo
    });
  }

  async listTools() {
    return this.sendRequest('tools/list');
  }

  async callTool(name, args) {
    return this.sendRequest('tools/call', {
      name,
      arguments: args
    });
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}

// Usage
const client = new MCPClient('http://localhost:3000');

await client.connect();

const serverInfo = await client.initialize({
  name: 'my-app',
  version: '1.0.0'
});
console.log('Server:', serverInfo);

const tools = await client.listTools();
console.log('Available tools:', tools);

const result = await client.callTool('pubmed_search', {
  query: 'diabetes treatment',
  max_results: 5
});
console.log('Search results:', result);
```

### Node.js Client

```javascript
import fetch from 'node-fetch';
import { EventSource } from 'eventsource';

class MCPClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.messageId = 0;
    this.pendingRequests = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.eventSource = new EventSource(`${this.baseUrl}/sse`);
      
      this.eventSource.addEventListener('endpoint', (event) => {
        const endpoint = JSON.parse(event.data);
        this.postUrl = `${this.baseUrl}${endpoint.uri}`;
        console.log('Connected to MCP server');
        resolve();
      });

      this.eventSource.addEventListener('message', (event) => {
        const response = JSON.parse(event.data);
        const pending = this.pendingRequests.get(response.id);
        
        if (pending) {
          if (response.error) {
            pending.reject(new Error(response.error.message));
          } else {
            pending.resolve(response.result);
          }
          this.pendingRequests.delete(response.id);
        }
      });

      this.eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        reject(error);
      };
    });
  }

  async sendRequest(method, params = {}) {
    const id = ++this.messageId;
    
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    const response = await fetch(this.postUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.result;
  }

  async initialize(clientInfo) {
    return this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo
    });
  }

  async listTools() {
    return this.sendRequest('tools/list');
  }

  async callTool(name, args) {
    return this.sendRequest('tools/call', {
      name,
      arguments: args
    });
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}

// Usage
const client = new MCPClient('http://localhost:3000');
await client.connect();

const serverInfo = await client.initialize({
  name: 'node-client',
  version: '1.0.0'
});

const result = await client.callTool('clinical_trials_search', {
  condition: 'diabetes',
  status: 'recruiting',
  max_results: 10
});

console.log(JSON.stringify(result, null, 2));
client.disconnect();
```

## LibreChat Configuration

Add to your `librechat.yaml`:

```yaml
mcpServers:
  healthcare-mcp:
    url: http://localhost:3000/sse
    transport: sse
```

## CORS Support

All endpoints include CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Connection Management

- Heartbeat comments sent every 15 seconds
- Connections automatically cleaned up on disconnect
- Each connection gets a unique ID in the endpoint URI

## Notes

- The server returns synchronous JSON responses for immediate operations (initialize, tools/list, tools/call)
- SSE connection remains open for potential future async notifications
- All messages must include `"jsonrpc": "2.0"` field
- The `id` field is required for requests and will be echoed in responses


## Browser Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Healthcare MCP SSE Demo</title>
</head>
<body>
  <h1>Healthcare MCP SSE Demo</h1>
  <button id="searchBtn">Search PubMed</button>
  <pre id="output"></pre>

  <script>
    async function callTool() {
      const output = document.getElementById('output');
      output.textContent = 'Calling tool...\n';
      
      const response = await fetch('http://localhost:3000/mcp/sse/call-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'pubmed_search',
          arguments: {
            query: 'diabetes treatment',
            max_results: 5
          }
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            output.textContent += JSON.stringify(data, null, 2) + '\n';
          }
        }
      }
    }

    document.getElementById('searchBtn').addEventListener('click', callTool);
  </script>
</body>
</html>
```

## Node.js Client Example

```javascript
import fetch from 'node-fetch';

async function callToolWithSSE(toolName, args) {
  const response = await fetch('http://localhost:3000/mcp/sse/call-tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: toolName,
      arguments: args
    })
  });

  const reader = response.body;
  let buffer = '';

  reader.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        
        switch (data.type) {
          case 'start':
            console.log(`Starting ${data.tool}...`);
            break;
          case 'result':
            console.log('Result:', data.data);
            break;
          case 'complete':
            console.log('Complete');
            break;
          case 'error':
            console.error('Error:', data.error);
            break;
        }
      }
    }
  });

  return new Promise((resolve, reject) => {
    reader.on('end', resolve);
    reader.on('error', reject);
  });
}

// Example usage
await callToolWithSSE('clinical_trials_search', {
  condition: 'diabetes',
  status: 'recruiting',
  max_results: 10
});
```

## CORS Support

All SSE endpoints include CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

This allows browser-based clients to connect from any origin.

## Connection Management

- Heartbeat messages are sent every 30 seconds to keep the connection alive
- Connections are automatically cleaned up when clients disconnect
- Each connection receives a unique session ID

## Performance Considerations

- SSE connections are long-lived - ensure your proxy/load balancer supports them
- Consider connection limits when deploying at scale
- Use the regular REST endpoints for simple one-off requests
- SSE is ideal for long-running operations or when you need real-time updates
