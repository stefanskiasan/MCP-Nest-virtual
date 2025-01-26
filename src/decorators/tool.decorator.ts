import { SetMetadata } from '@nestjs/common';

export const MCP_TOOL_METADATA_KEY = 'mcp:tool';

export interface ToolMetadata {
  name: string;
  description: string;
  schema?: any;
}

export const Tool = (name: string, description: string, schema?: any): MethodDecorator => {
  return SetMetadata(MCP_TOOL_METADATA_KEY, { name, description, schema });
};