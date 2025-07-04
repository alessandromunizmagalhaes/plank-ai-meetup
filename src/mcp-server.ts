import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { generateEmbeddings } from "./providers/open-ai.js";
import { Client } from "pg";
// Create an MCP server
const server = new McpServer({
  name: "Demo",
  version: "1.0.0"
});

// TASK 0 (Homework) - Try to call the health check tool
server.tool("health-check",
  { test_string: z.string() },
  async ({ test_string }: { test_string: string }) => {
    try {
      return { content: [{ type: "text", text: `OK ${test_string}` }]};
    } catch (error: any) {
      return { 
        content: [{ 
          type: "text", 
          text: `Error reviewing code: ${error.message}` 
        }]
      };
    }
  }
);


// TASK 1 (Basic - Understanding MCP Tools) - Create a hello world tool to convert miles to kilometers using the formula: kilometers = miles * 1.60934


// TASK 2 - (Intermediate - Similarity Search) - Create a tool to receive a query and return the most similar items in the database


// TASK 3 - (Advanced - Add and Update Embedding Column) - Add a new column to the database to store the embeddings and update the database with the embeddings

// BONUS TASK 1 - (Advanced) Based on the example on the NPM link: (https://www.npmjs.com/package/@modelcontextprotocol/sdk#streamable-http)
// Implement a new function runMcpServerStreamable() that will use the streamable HTTP transport to send messages to the client.
// It should use the same tools as the runMcpServer() function.
// Use mcp-client.ts to test the communication between the server and the client.
// To run this server you will have to use npm run start

export const runMcpServer = async () => {
  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
}



runMcpServer();