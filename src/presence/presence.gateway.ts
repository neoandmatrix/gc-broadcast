import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '@nestjs/jwt';  // Assuming JWT service is imported for decoding tokens

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class PresenceGatewayv1 implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly HEARTBEAT_INTERVAL = 30; // seconds
  
  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  async afterInit(server: Server) {
    console.log('Presence Gateway Initialized');
  }

  async handleConnection(client: Socket) {
    const userId = this.getUserIdFromToken(client);
    if (!userId) {
      client.disconnect();
      return;
    }

    const socketId = client.id;
    const redisKey = `user:${userId}:socket:${socketId}`;

    await this.redisService.set(redisKey, new Date().toISOString(), {
      EX: this.HEARTBEAT_INTERVAL,
    });

    client.data.redisKey = redisKey;

    this.server.emit('userConnected', { userId, socketId });
    console.log(`User connected: ${userId} with socket ID: ${socketId}`);
  }

  async handleDisconnect(client: Socket) {
    const redisKey = client.data.redisKey;

    if (redisKey) {
      await this.redisService.del(redisKey);
      const [_, socketId] = redisKey.split(':socket:');
      this.server.emit('userDisconnected', { socketId });
      console.log(`User disconnected: Redis Key: ${redisKey}`);
    }
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(client: Socket) {
    const redisKey = client.data.redisKey;
    if (redisKey) {
      await this.redisService.expire(redisKey, this.HEARTBEAT_INTERVAL);
      console.log(`Heartbeat received, TTL reset for key: ${redisKey}`);
    }
  }

  private getUserIdFromToken(client: Socket): string | null {
    try {
      const token = client.handshake.headers.authorization;
      const decoded = this.jwtService.verify(token);
      return decoded.userId || null;
    } catch {
      return null;
    }
  }
}
