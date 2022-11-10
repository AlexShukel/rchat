import { ChatService } from './ChatService';
import type { ExtendedError } from 'socket.io/dist/namespace';
import { ChatServerType, ChatSocketType } from '@rchat/shared';
import { RoomManager } from './RoomManager';

export class ChatServer<TMessageType> {
	private readonly roomManager;
	private readonly service;
	private readonly server;

	public constructor(service: ChatService, server: ChatServerType<TMessageType>) {
		this.server = server;
		this.service = service;
		this.roomManager = new RoomManager<TMessageType>(server, service.getChatParticipants);
		this.initializeServer();
	}

	private initializeServer = () => {
		this.server.use(this.authentication);
		this.server.on('connection', this.handleConnection);
	};

	private handleConnection = async (socket: ChatSocketType<TMessageType>) => {
		socket.on('sendMessage', (message, roomIdentifier) => this.handleMessage(socket, message, roomIdentifier));
	};

	private handleMessage = async (
		socket: ChatSocketType<TMessageType>,
		message: TMessageType,
		roomIdentifier: string,
	) => {
		const broadcastChannel = await this.roomManager.broadcast(socket, roomIdentifier);

		broadcastChannel.emit('receiveMessage', message, roomIdentifier);
	};

	private authentication = async (socket: ChatSocketType<TMessageType>, next: (err?: ExtendedError) => void) => {
		try {
			const connectionInfo = await this.service.fetchConnectionInfo(socket.request);

			socket.data = connectionInfo;

			next();
		} catch (error) {
			console.error('Unexpected error occurred while trying to get user identifier', error);
			next(new Error('Forbidden'));
		}
	};
}
