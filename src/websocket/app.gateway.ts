import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RedisService } from '../common/redis.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  constructor(private readonly redisService: RedisService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeLeaderboard')
  async handleSubscribeLeaderboard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameName: string },
  ) {
    this.logger.log(`Client ${client.id} subscribed to leaderboard for game: ${data.gameName}`);
    client.join(`leaderboard_${data.gameName}`);
    client.emit('subscribed', { room: `leaderboard_${data.gameName}` });

    // Fetch instant top 10 from Redis Sorted Set
    const topLeaderboard = await this.redisService.getTopLeaderboard(data.gameName || 'default', 10);
    if (topLeaderboard && topLeaderboard.length > 0) {
      client.emit('leaderboardUpdate', topLeaderboard);
    }
  }

  /**
   * Broadcasts lucky spin winners to all connected clients
   */
  broadcastSpinWinner(winnerData: { userName: string; prizeName: string }) {
    this.logger.log(`Broadcasting spin winner: ${winnerData.userName} won ${winnerData.prizeName}`);
    this.server.emit('spinWinnerBroadcast', winnerData);
  }

  /**
   * Broadcasts real-time leaderboard updates to subscribed clients
   */
  broadcastLeaderboardUpdate(gameName: string, leaderboard: any[]) {
    this.logger.log(`Broadcasting leaderboard update for game: ${gameName}`);
    this.server.to(`leaderboard_${gameName}`).emit('leaderboardUpdate', leaderboard);
  }

  /**
   * Broadcasts order status changes
   */
  broadcastOrderStatus(orderId: string, status: string) {
    this.logger.log(`Broadcasting order status update for order ${orderId}: ${status}`);
    this.server.emit(`order_${orderId}_status`, { orderId, status });
  }
}
