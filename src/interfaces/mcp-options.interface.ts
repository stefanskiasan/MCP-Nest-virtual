import { ModuleMetadata, Type } from '@nestjs/common';

export interface McpOptions {
  name: string;
  version: string;
  capabilities?: Record<string, any>;
}

export interface McpOptionsFactory {
  createMcpOptions(): Promise<McpOptions> | McpOptions;
}

export interface McpAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<McpOptionsFactory>;
  useClass?: Type<McpOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<McpOptions> | McpOptions;
  inject?: any[];
}