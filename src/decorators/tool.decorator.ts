import { SetMetadata } from '@nestjs/common';
import { MCP_TOOL_METADATA_KEY } from './constants';

export interface ToolMetadata {
  name: string;
  description: string;
  schema?: any;
}

export const Tool = (name: string, description: string, schema?: any): MethodDecorator => {
  return SetMetadata(MCP_TOOL_METADATA_KEY, { name, description, schema });
};
