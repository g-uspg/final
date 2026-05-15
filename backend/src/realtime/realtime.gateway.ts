import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(RealtimeGateway.name);
  private connectedClients = new Map<string, { socket: Socket; user_id?: string; role?: string }>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token ?? client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (token) {
        const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
        this.connectedClients.set(client.id, { socket: client, user_id: payload.sub, role: payload.role });
        client.join(`user:${payload.sub}`);
        client.join(`role:${payload.role}`);
        this.logger.log(`Client connected: ${client.id} user=${payload.sub}`);
      } else {
        this.connectedClients.set(client.id, { socket: client });
        this.logger.log(`Anonymous client connected: ${client.id}`);
      }
      client.emit('connection:established', { client_id: client.id, timestamp: new Date() });
    } catch {
      this.connectedClients.set(client.id, { socket: client });
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:campus')
  handleJoinCampus(@ConnectedSocket() client: Socket, @MessageBody() data: { campus_id: string }) {
    client.join(`campus:${data.campus_id}`);
    return { event: 'joined', room: `campus:${data.campus_id}` };
  }

  @SubscribeMessage('join:zone')
  handleJoinZone(@ConnectedSocket() client: Socket, @MessageBody() data: { zone: string }) {
    client.join(`zone:${data.zone}`);
    return { event: 'joined', room: `zone:${data.zone}` };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', timestamp: new Date() };
  }

  emit(event: string, data: any) {
    this.server.emit(event, data);
  }

  emitToUser(user_id: string, event: string, data: any) {
    this.server.to(`user:${user_id}`).emit(event, data);
  }

  emitToRole(role: string, event: string, data: any) {
    this.server.to(`role:${role}`).emit(event, data);
  }

  emitToCampus(campus_id: string, event: string, data: any) {
    this.server.to(`campus:${campus_id}`).emit(event, data);
  }

  getConnectedCount() {
    return this.connectedClients.size;
  }
}
