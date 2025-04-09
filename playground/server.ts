import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { McpModule } from '../src';
import { GreetingResource } from './greeting.resource';
import { GreetingTool } from './greeting.tool';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'playground-mcp-server',
      version: '0.0.1',
    }),
  ],
  providers: [GreetingResource, GreetingTool],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3030);

  console.log('MCP server started on port 3030');
}

void bootstrap();
