import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import {
  ClientRegistrationDto,
  IOAuthStore,
  OAuthClient,
} from '../stores/oauth-store.interface';
import { randomBytes } from 'crypto';

@Injectable()
export class ClientService {
  constructor(@Inject('IOAuthStore') private readonly store: IOAuthStore) {}

  /**
   * Register or update a client application
   * If client with same name exists, update it; otherwise create new
   */
  async registerClient(
    registrationDto: ClientRegistrationDto,
  ): Promise<OAuthClient> {
    // Validate required fields
    if (
      !registrationDto.redirect_uris ||
      !Array.isArray(registrationDto.redirect_uris)
    ) {
      throw new BadRequestException(
        'redirect_uris is required and must be an array',
      );
    }

    // Validate token_endpoint_auth_method if provided
    const supportedAuthMethods = [
      'client_secret_basic',
      'client_secret_post',
      'none',
    ];
    if (
      registrationDto.token_endpoint_auth_method &&
      !supportedAuthMethods.includes(registrationDto.token_endpoint_auth_method)
    ) {
      throw new BadRequestException(
        `Unsupported token_endpoint_auth_method. Supported methods: ${supportedAuthMethods.join(', ')}`,
      );
    }

    // Default values for new clients
    const defaultClientValues = {
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method:
        registrationDto.token_endpoint_auth_method || 'none',
    };

    // Check if client with same name already exists
    const existingClient = await this.findClientByName(
      registrationDto.client_name,
    );
    const now = new Date();

    if (existingClient) {
      // Update existing client - merge existing, defaults, and new values
      const updatedClient: OAuthClient = {
        ...existingClient,
        ...defaultClientValues,
        ...registrationDto,
        redirect_uris: [
          ...new Set([
            ...existingClient.redirect_uris,
            ...registrationDto.redirect_uris,
          ]),
        ],
        updated_at: now,
      };
      const nc = await this.store.storeClient(updatedClient);
      const filteredClient = Object.fromEntries(
        Object.entries(nc).filter(([, value]) => value !== null),
      ) as OAuthClient;
      return filteredClient;
    }

    // Create new client - merge defaults with registration data
    const client_id = this.store.generateClientId(
      registrationDto as OAuthClient,
    );

    // Only generate client_secret for methods that require it
    const authMethod = registrationDto.token_endpoint_auth_method || 'none';
    const client_secret =
      authMethod !== 'none' ? randomBytes(32).toString('hex') : undefined;

    const newClient: OAuthClient = {
      ...defaultClientValues,
      ...registrationDto,
      client_id,
      client_secret,
      created_at: now,
      updated_at: now,
    };
    const client = await this.store.storeClient(newClient);
    const filteredClient = Object.fromEntries(
      Object.entries(client).filter(([, value]) => value !== null),
    ) as OAuthClient;

    return filteredClient;
  }

  async getClient(clientId: string): Promise<OAuthClient | null> {
    const client = await this.store.getClient(clientId);
    if (!client) {
      return null;
    }

    // Remove null fields from the client object
    const filteredClient = Object.fromEntries(
      Object.entries(client).filter(([, value]) => value !== null),
    ) as OAuthClient;

    return filteredClient;
  }

  async validateRedirectUri(
    clientId: string,
    redirectUri: string,
  ): Promise<boolean> {
    const client = await this.getClient(clientId);
    return client ? client.redirect_uris.includes(redirectUri) : false;
  }

  private async findClientByName(
    clientName: string,
  ): Promise<OAuthClient | undefined> {
    // Use the new findClient method for efficient lookup
    return await this.store.findClient(clientName);
  }
}
