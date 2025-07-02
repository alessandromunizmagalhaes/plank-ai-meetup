# Hands-On MCP

This guide explains how to set up and use the MCP (Model Context Protocol) server that will be used in our Hands-On meetup tasks.

You need to set up the environment before our Meetup session. To validate your setup, you should test the environment using the MCP Inspector (explained below) and complete Task 0.


## Prerequisites

- [Node.js version 22](https://nodejs.org/en/download)
- [Cursor editor installed](https://www.cursor.com/downloads)
- [Docker installed and updated](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Claude Desktop](https://claude.ai/download)
- [PG Admin](https://www.pgadmin.org/download/)

## What is MCP:

A Model Context Protocol (MCP) is a standardized interface that allows different AI models, tools, and resources to communicate and work together seamlessly. MCP servers act as a bridge between users and various AI capabilities, making it easy to integrate, manage, and orchestrate complex workflows involving multiple models and data sources.

- **Tools:** Discrete functions or actions that can be executed by the MCP server, such as running code, querying a database, or calling an external API, and can be called by an LLM.
- **Resources:** Data sources or assets that can be accessed or manipulated by tools or prompts, like files, databases, or knowledge bases.
- **Prompt:** A template or instruction set that guides the AI model's behavior, often used to generate responses, perform tasks, or interact with tools and resources.


## Cloning the repo:

```bash 
git clone git@github.com:joinplank/ai-meetup-ts.git
```

## Setup Instructions

1. **Install Dependencies**

This will install all the dependencies we will need in our project.

```bash
npm install 
```


1.1. **Running Docker Compose**

Run Docker Compose to start the Postgres database we will use in tasks 2 and 3.
It will automatically create a table called `llm_prompts` with 20 sample prompts.

```bash
docker compose up
```

After running Docker Compose, you should be able to connect to the database using PgAdmin with the following connection string:

```
postgres://postgres:postgres@localhost:5434/postgres
```

1.2. **Running MCP Inspector**

This will run the MCP Inspector, a test interface to call the tools, resources, and prompts that will be available on this MCP Server.

```bash
npm run start-inspector
```

For windows machines use:

```bash
npm run start-inspector:win
```


1.3. **Access the MCP Inspector endpoint**

This link will open the MCP Inspector, a tool to help test the tools we will create during our meetup session. After opening it, you should:

- Click on the "Connect" button.
- Click on "Tools" in the main menu.
- Click on the "List Tools" button.
- Click on the "health-check" tool in the list.
- Fill in the input text "test_string" with any random string.
- Click on "Run tool".
- The message "Tool Result: Success" should be displayed.

```
http://127.0.0.1:6274/
```

2. **Hands-On Tasks**

These are the tasks we will be doing during our hands-on session. Task 0 should be done at home before the meetup to ensure your environment is configured.

- **TASK 0 (Homework)** – Try to call the health check tool using the MCP Inspector. Follow the instructions in section 1.3 to do this.
- **TASK 1 (Basic - Understanding MCP Tools)** - Create a hello world tool to convert miles to kilometers using the formula: kilometers = miles * 1.60934
- **TASK 2 (Intermediate - Similarity Search)** - Create a tool to receive a query and return the most similar items in the database
- **TASK 3 (Advanced - Add and Update Embedding Column)** - Add a new column to the database to store the embeddings and update the database with the embeddings


3. **Trying the MCP Tools using Claude Desktop**

- Click on Claude 
- Settings 
- Developer 
- Edit Config 
- Open the file: claude_desktop_config.json

Use the JSON below to enable your MCP Server and update the path to your build file:

```json
{
    "mcpServers": {
        "github": {
            "command": "node",
            "args": ["path/to/your/mcp-server.js"]
        }
    }
}
```

