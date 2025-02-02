import { SetMetadata } from '@nestjs/common';
import { MCP_TOOL_METADATA_KEY } from './constants';
import { z } from 'zod';

export interface ToolMetadata {
  name: string;
  description: string;
  schema?: any;
  requestSchema?: z.ZodObject<any>; // Schema for the request this tool handles
}

export const Tool = (
  name: string,
  description: string,
  options: { schema?: any; requestSchema?: z.ZodObject<any> } = {},
): MethodDecorator => {
  return SetMetadata(MCP_TOOL_METADATA_KEY, {
    name,
    description,
    ...options,
  });
};