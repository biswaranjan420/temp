import { Injectable } from '@angular/core';
import { ChatMessage } from '../../types/chat-type';
import { MatSidenav } from '@angular/material/sidenav';
import { RemoteUsersService } from '../remote-users/remote-users.service';
import { LoggerService } from '../logger/logger.service';
import { ILogger } from '../../types/logger-type';
import { NotificationService } from '../notifications/notification.service';
import { OpenViduWebrtcService } from '../openvidu-webrtc/openvidu-webrtc.service';
import { LocalUsersService } from '../local-users/local-users.service';
import { Observable } from 'rxjs/internal/Observable';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Signal } from '../../types/singal-type';

@Injectable({
	providedIn: 'root'
})
export class ChatService {
	messagesObs: Observable<ChatMessage[]>;
	messagesUnreadObs: Observable<number>;
	toggleChatObs: Observable<boolean>;
	messageTypingUsersObs: Observable<any[]>;
	private chatComponent: MatSidenav;

	private _messageList = <BehaviorSubject<ChatMessage[]>>new BehaviorSubject([]);
	private _toggleChat = <BehaviorSubject<boolean>>new BehaviorSubject(false);
	private _messageTypingUsers = <BehaviorSubject<any[]>>new BehaviorSubject([]);
	private messageList: ChatMessage[] = [];
	private messageTypingUsers: any[] = [];
	private chatOpened: boolean;
	private messagesUnread = 0;
	private log: ILogger;


	private _messagesUnread = <BehaviorSubject<number>>new BehaviorSubject(0);

	constructor(
		private loggerSrv: LoggerService,
		private openViduWebRTCService: OpenViduWebrtcService,
		private localUsersService: LocalUsersService,
		private remoteUsersService: RemoteUsersService,
		private notificationService: NotificationService
	) {
		this.log = this.loggerSrv.get('ChatService');
		this.messagesObs = this._messageList.asObservable();
		this.toggleChatObs = this._toggleChat.asObservable();
		this.messagesUnreadObs = this._messagesUnread.asObservable();
		this.messageTypingUsersObs = this._messageTypingUsers.asObservable();
	}

	setChatComponent(chatSidenav: MatSidenav) {
		this.chatComponent = chatSidenav;
	}

	subscribeToChat() {
		const session = this.openViduWebRTCService.getWebcamSession();
		session.on('signal:chat', (event: any) => {
			const connectionId = event.from.connectionId;
			const data = JSON.parse(event.data);
			const isMyOwnConnection = this.openViduWebRTCService.isMyOwnConnection(connectionId);
			this.messageList.push({
				isLocal: isMyOwnConnection,
				nickname: data.nickname,
				message: data.message,
				userAvatar: isMyOwnConnection
					? this.localUsersService.getAvatar()
					: this.remoteUsersService.getUserAvatar(connectionId)
			});
			if (!this.isChatOpened()) {
				this.addMessageUnread();
				this.notificationService.newMessage(data.nickname.toUpperCase(), this.toggleChat.bind(this));
			}
			this._messageList.next(this.messageList);
		});

		// Subscripe to Chat Message typing signal
		session.on('signal:' + Signal.MESSAGE_TYPING, (event: any) => {
			const isMyOwnConnection = this.openViduWebRTCService.isMyOwnConnection(event.from.connectionId);
			if (!isMyOwnConnection) {
				const data = JSON.parse(event.data);
				data['id'] = event.from.connectionId;
				const index = this.messageTypingUsers.findIndex((e) => e.id === data.id);
				if (index === -1) {
					this.messageTypingUsers.push(data);
				} else {
					this.messageTypingUsers[index] = data;
				}
				this._messageTypingUsers.next(this.messageTypingUsers);
			}
		});
	}

	sendMessage(message: string) {
		message = message.replace(/ +(?= )/g, '');
		if (message !== '' && message !== ' ') {
			const data = {
				message: message,
				nickname: this.localUsersService.getWebcamUserName()
			};
			const sessionAvailable = this.openViduWebRTCService.getSessionOfUserConnected();
			sessionAvailable.signal({
				data: JSON.stringify(data),
				type: 'chat'
			});
		}
	}

	sendMessageOrMediaFiles(message: string, baseEncodeFiles: any[]) {
		message = message.replace(/ +(?= )/g, '');
		let signalReady = false;
		const data = {
			message: '',
			nickname: this.localUsersService.getWebcamUserName(),
			media: []
		};
		if (message !== '' && message !== ' ') {
			data.message = message;
			signalReady = true;
		}
		if (baseEncodeFiles.length > 0) {
			data.media = baseEncodeFiles;
			signalReady = true;
		}
		if (signalReady) {
			const sessionAvailable = this.openViduWebRTCService.getSessionOfUserConnected();
			sessionAvailable.signal({
				data: JSON.stringify(data),
				type: 'chat'
			});
		}
	}


	toggleChat() {
		this.log.d('Toggling chat');
		this.chatComponent.toggle().then(() => {
			this.chatOpened = this.chatComponent.opened;
			this._toggleChat.next(this.chatOpened);
			if (this.chatOpened) {
				this.messagesUnread = 0;
				this._messagesUnread.next(this.messagesUnread);
			}
		});
	}

	private isChatOpened(): boolean {
		return this.chatOpened;
	}

	private addMessageUnread() {
		this.messagesUnread++;
		this._messagesUnread.next(this.messagesUnread);
	}
	sendMessageTypingSignal(nickname: string, status: string): void {
		const sessionAvailable = this.openViduWebRTCService.getSessionOfUserConnected();
		const data = {
			nickname: nickname,
			status: status
		};
		sessionAvailable.signal({
			data: JSON.stringify(data),
			type: Signal.MESSAGE_TYPING
		});

	}
	getChatinguserName() {
		return this.localUsersService.getWebcamUserName();
	}
}
