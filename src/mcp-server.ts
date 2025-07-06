import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";
import { generateEmbeddings } from "./providers/open-ai.js";
import { Client } from "pg";

// Create an MCP server
const server = new McpServer({
    name: "Demo",
    version: "1.0.0"
});

const textEmbeeding = "text-embedding-ada-002"

// to be defined if not using
export const runMcpServer = async () => {
    // Start receiving messages on stdin and sending messages on stdout
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

// runs query in database
async function runQuery(select: string, values?: any[]) {
    const client = new Client({
        connectionString: 'postgres://postgres:postgres@localhost:5434/postgres',
    });

    try {
        await client.connect();
        const res = await client.query(select, values);
        await client.end();
        return res; // Return the query results
    } catch (error) {
        console.error('Error executing query:', error);
        await client.end();
        throw error;
    }
}

// returns embbeddings as string
// specially for PostgresSQL manipulation
function embeddingsToString(embeddings: number[]): string {
    return `[${embeddings.join(',')}]`;
}

// runs the MCP server using Streamable HTTP transport
export const runMcpServerStreamable = async () => {
    // keeping it simple and not using with stateful approach
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
    });
}

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
    try {
        const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });
        res.on('close', () => {
            console.log('Request closed');
            transport.close();
            server.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            });
        }
    }
});

// SSE notifications not supported in stateless mode
app.get('/mcp', async (req, res) => {
    console.log('Received GET MCP request');
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed."
        },
        id: null
    }));
});

// Session termination not needed in stateless mode
app.delete('/mcp', async (req, res) => {
    console.log('Received DELETE MCP request');
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed."
        },
        id: null
    }));
});


// Start the server
const PORT = 3000;

const setupServer = async () =>{
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

    server.tool("convert-miles-to-kilometers",
        { miles: z.number() },
        async ({ miles }: { miles: number }) => {
            const kilometers = miles * 1.60934;
            try {
                return { content: [{ type: "text", text: `Miles: ${miles} / KM: ${kilometers}` }]};
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

// TASK 2 - (Intermediate - Similarity Search) - Create a tool to receive a query and return the most similar items in the database


    server.tool("similarity-search",
        { query: z.string(), threshold: z.number().optional() },
        async ({ query, threshold }: { query: string, threshold?: number }) => {
            const embeddings = await generateEmbeddings(query, textEmbeeding);
            const column_name = 'prompt';
            const select =
                `
                SELECT description, prompt, 1 - (${column_name}_embedding_data <=> $1) AS similarity
                    FROM public.llm_prompts
                WHERE 1 - (${column_name}_embedding_data <=> $1) > $2
                ORDER BY ${column_name}_embedding_data <=> $1;
            `;

            if((threshold ?? 0) > 1) {
                return {
                    content: [{
                        type: "text",
                        text: `Thresold should be defined between 0.1 and 1`
                    }]
                };
            }

            threshold = threshold ?? 0.1;

            const res = await runQuery(select, [embeddingsToString(embeddings), threshold]);
            const [mostRecent] = res.rows;

            try {
                const text = mostRecent ? `Most similar items in database: \n ${mostRecent.prompt}` : `No similar items found`;
                return { content: [{ type: "text", text }]};
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

// TASK 3 - (Advanced - Add and Update Embedding Column) - Add a new column to the database to store the embeddings and update the database with the embeddings

    server.tool("add-embedding-column",
        { original_column_name: z.string() },
        async ({ original_column_name }: { original_column_name: string }) => {

            const dataToUpdate = `SELECT id, ${original_column_name} FROM public.llm_prompts;`;
            let queryResult;
            try {
                queryResult = await runQuery(dataToUpdate);
            } catch(e) {
                return {
                    content: [{
                        type: "text",
                        text: `Column ${original_column_name} does not exists in the database`
                    }]
                };
            }

            const sqlAlterTable = `ALTER TABLE public.llm_prompts ADD COLUMN ${original_column_name}_embedding_data vector(1536);`;
            try {
                await runQuery(sqlAlterTable);
            } catch(e) {
                console.log(e);
                const sqlDropColumn = `ALTER TABLE public.llm_prompts DROP COLUMN ${original_column_name}_embedding_data;`
                try {
                    await runQuery(sqlDropColumn);
                    await runQuery(sqlAlterTable);
                } catch(e) {
                    console.log(e);
                    return {
                        content: [{
                            type: "text",
                            text: `ERROR creating column ${original_column_name}_embedding_data in the database. See logs`
                        }]
                    };
                }
            }

            let errors = false;
            queryResult.rows.forEach(async (res) => {
                console.log(res[original_column_name]);
                const embeddings = await generateEmbeddings(res[original_column_name], textEmbeeding);
                const sqlUpdate = `UPDATE public.llm_prompts SET ${original_column_name}_embedding_data = $1 WHERE id = $2;`;
                try {
                    await runQuery(sqlUpdate, [embeddingsToString(embeddings), res.id]);
                } catch(e) {
                    errors = true;
                    console.log(e);
                }
            });

            if(errors) {
                return {
                    content: [{
                        type: "text",
                        text: `Could not update values to the column ${original_column_name}_embedding_data in the database. See logs`
                    }]
                };
            }

            try {
                const text = `Column ${original_column_name}_embedding_data created and updated successfully`;
                return { content: [{ type: "text", text }]};
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
}

setupServer().then(() => {
    app.listen(PORT, (error) => {
        if (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
        console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
    });
}).catch(error => {
    console.error('Failed to set up the server:', error);
    process.exit(1);
});

//runMcpServer();

runMcpServerStreamable();