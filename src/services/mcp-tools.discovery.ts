import { DiscoveryService, MetadataScanner } from "@nestjs/core";
import { Injectable } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_TOOL_METADATA_KEY } from "../decorators";

@Injectable()
export class McpToolsDiscovery {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  registerTools(mcpServer: McpServer) {
    const providers = this.discovery.getProviders();
    const controllers = this.discovery.getControllers();
    const allInstances = [...providers, ...controllers]
      .filter((wrapper) => wrapper.instance)
      .map((wrapper) => wrapper.instance);

    allInstances.forEach((instance) => {
      this.metadataScanner.getAllMethodNames(instance).forEach((method) => {
        const methodRef = instance[method];
        const methodMetaKeys = Reflect.getOwnMetadataKeys(methodRef);
        if (!methodMetaKeys.includes(MCP_TOOL_METADATA_KEY)) {
          return;
        }

        const methodFn = Reflect.getMetadata(MCP_TOOL_METADATA_KEY, methodRef);
        mcpServer.tool(
          methodFn.name,
          methodFn.description,
          methodFn.schema,
          (...args) => instance[method].apply(instance, args),
        );
      });
    });
  }
}
