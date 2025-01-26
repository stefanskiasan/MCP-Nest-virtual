import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  Res
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

/**
 * Simple controller that exposes:
 *  - GET /sse:   establishes an SSE stream
 *  - POST /messages:  handles incoming JSON messages
 */
@Controller()
export class SseController {
  private transport: SSEServerTransport | null = null;

  constructor(@Inject('MCP_SERVER') private readonly mcpServer: McpServer) {}

  @Get('sse')
  async sse(@Res() res: Response) {
    this.transport = new SSEServerTransport('/messages', res);

    await this.mcpServer.connect(this.transport);
  }

  @Post('messages')
  async messages(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: unknown,
  ) {
    if (!this.transport) {
      return res.status(500).send('No active SSE connection');
    }

    await this.transport.handlePostMessage(req, res, body);
  }
}
