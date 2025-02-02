import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { MCP_TOOL_METADATA_KEY, ToolMetadata } from '../decorators';

@Injectable()
export class McpToolsDiscovery implements OnApplicationBootstrap {
  private tools: Array<{
    metadata: ToolMetadata;
    instance: any;
    methodName: string;
  }> = [];

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  onApplicationBootstrap() {
    this.collectTools();
  }

  collectTools() {
    const providers = this.discovery.getProviders();
    const controllers = this.discovery.getControllers();
    const allInstances = [...providers, ...controllers]
      .filter((wrapper) => wrapper.instance)
      .map((wrapper) => wrapper.instance);

    allInstances.forEach((instance) => {
      if (!instance || typeof instance !== 'object') {
        return;
      }
      this.metadataScanner.getAllMethodNames(instance).forEach((methodName) => {
        const methodRef = instance[methodName];
        const methodMetaKeys = Reflect.getOwnMetadataKeys(methodRef);

        if (!methodMetaKeys.includes(MCP_TOOL_METADATA_KEY)) {
          return;
        }

        const metadata: ToolMetadata = Reflect.getMetadata(MCP_TOOL_METADATA_KEY, methodRef);

        this.tools.push({
          metadata,
          instance,
          methodName,
        });
      });
    });
  }

  registerTools(mcpServer: McpServer) {
    this.tools.forEach((tool) => {
      const handler = async (request: any, extra: any) => {
        const context = this.createContext(mcpServer, extra);

        if (tool.metadata.requestSchema) {
          // Validate the request against the tool's schema
          const parsedRequest = tool.metadata.requestSchema.safeParse(request);
          if (!parsedRequest.success) {
            // Handle validation errors, e.g., send an error response
            const formattedError = JSON.stringify(parsedRequest.error.format());
            return context.sendError('Invalid request', formattedError);
          }

          // If validation succeeds, call the tool's method with the validated data
          return tool.instance[tool.methodName].call(
            tool.instance,
            parsedRequest.data.params,
            context,
          );
        } else {
          // If no schema is defined, call the tool's method directly
          return tool.instance[tool.methodName].call(tool.instance, request, context);
        }
      };

      if (tool.metadata.requestSchema) {
        mcpServer.server.setRequestHandler(
          tool.metadata.requestSchema as any,
          handler
        );
      } else {
        // Fallback for tools without a request schema
        mcpServer.tool(
          tool.metadata.name,
          tool.metadata.description,
          tool.metadata.schema,
          handler,
        );
      }
    });
  }

  private createContext(mcpServer: McpServer, extra: any) {
    return {
      sendNotification: async (notification: any) => {
        await mcpServer.server.notification(notification);
      },
      sendError: async (message: string, data?: any) => {
          await extra.sendError({ code: -32600, message, data });
      },
      sendResponse: async (response: any) => {
        await extra.send(response);
      }
    };
  }
}