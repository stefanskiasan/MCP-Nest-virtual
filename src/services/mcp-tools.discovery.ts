import { DiscoveryService, MetadataScanner } from "@nestjs/core";
import { Injectable, OnApplicationBootstrap, Inject } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_TOOL_METADATA_KEY } from "../decorators";

@Injectable()
export class McpToolsDiscovery implements OnApplicationBootstrap {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    @Inject('MCP_SERVER') private readonly mcpServer: McpServer,
  ) {}

  onApplicationBootstrap() {
    this.registerTools();
  }

  registerTools() {
    const providers = this.discovery.getProviders();
    const controllers = this.discovery.getControllers();
    const allInstances = [...providers, ...controllers]
      .filter((wrapper) => wrapper.instance)
      .map((wrapper) => wrapper.instance);

    allInstances.forEach((instance) => {
      if (!instance || typeof instance !== 'object') {
        return;
      }
      this.metadataScanner.getAllMethodNames(instance).forEach((method) => {
        const methodRef = instance[method];
        const methodMetaKeys = Reflect.getOwnMetadataKeys(methodRef);
        if (!methodMetaKeys.includes(MCP_TOOL_METADATA_KEY)) {
          return;
        }

        const methodFn = Reflect.getMetadata(MCP_TOOL_METADATA_KEY, methodRef);
        this.mcpServer.tool(
          methodFn.name,
          methodFn.description,
          methodFn.schema,
          (...args) => instance[method].apply(instance, args),
        );
      });
    });
  }
}