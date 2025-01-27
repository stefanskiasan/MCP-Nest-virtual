import { Controller, Get, Post, Req, Res, Body, Inject } from '@nestjs/common';
import type { Request, Response } from 'express';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

export function createSseController(
  sseEndpoint: string,
  messagesEndpoint: string,
  globalApiPrefix: string,
) {
  @Controller()
  class SseController {
    public transport: SSEServerTransport | null = null;

    constructor(@Inject('MCP_SERVER') public readonly mcpServer: McpServer) {}

    @Get(sseEndpoint)
    async sse(@Res() res: Response) {
      this.transport = new SSEServerTransport(`${globalApiPrefix}/${messagesEndpoint}`, res);
      await this.mcpServer.connect(this.transport);
    }

    @Post(messagesEndpoint)
    async messages(@Req() req: Request, @Res() res: Response, @Body() body: unknown) {
      if (!this.transport) {
        return res.status(500).send('No active SSE connection');
      }
      await this.transport.handlePostMessage(req, res, body);
    }
  }

  return SseController;
}
