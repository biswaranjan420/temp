import { Component, ElementRef, Input, OnInit, ViewChild, HostListener, OnDestroy } from '@angular/core';
import { ChatService } from '../../services/chat/chat.service';
import { ChatMessage } from '../../types/chat-type';
import { Subscription } from 'rxjs/internal/Subscription';

@Component({
	selector: 'chat-component',
	templateUrl: './chat.component.html',
	styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
	@ViewChild('chatScroll') chatScroll: ElementRef;
	@ViewChild('chatInput') chatInput: ElementRef;
	@ViewChild("fileInput", { static: false }) fileInput: ElementRef;


	@Input() lightTheme: boolean;

	message: string;

	messageList: ChatMessage[] = [];
	messageTypingUserList: any[] = [];
	chatOpened: boolean;

	private chatMessageSubscription: Subscription;
	private chatToggleSubscription: Subscription;
	private messageTypingUserSubscription: Subscription;
	keyupTimer: any;
	keydownTimer: any;
	timerUnit: number;
	// files: any[] = [];
	// base64Array: any[] = [];

	constructor(private chatService: ChatService) { }

	@HostListener('document:keydown.escape', ['$event'])
	onKeydownHandler(event: KeyboardEvent) {
		console.log(event);
		if (this.chatOpened) {
			this.close();
		}
	}

	ngOnInit() {
		this.timerUnit = 5000;
		this.subscribeToMessages();
		this.subscribeToToggleChat();
		this.subscribeToMessageTypingUser();


	}

	ngOnDestroy(): void {
		if (this.chatMessageSubscription) {
			this.chatMessageSubscription.unsubscribe();
		}
		if (this.chatToggleSubscription) {
			this.chatToggleSubscription.unsubscribe();
		}
	}

	eventKeyPress(event) {
		// Pressed 'Enter' key
		if (event && event.keyCode === 13) {
			this.sendMessage();
		}
	}

	sendMessage(): void {
	   this.chatService.sendMessage(this.message);
	   this.message = '';

		/*this.chatService.sendMessageOrMediaFiles(this.message, this.base64Array);
		this.message = '';
		 this.files = [];
		this.base64Array = [];*/
	}

	scrollToBottom(): void {
		setTimeout(() => {
			try {
				this.chatScroll.nativeElement.scrollTop = this.chatScroll.nativeElement.scrollHeight;
			} catch (err) { }
		}, 20);
	}

	close() {
		this.chatService.toggleChat();
	}

	private subscribeToMessages() {
		this.chatMessageSubscription = this.chatService.messagesObs.subscribe((messages: ChatMessage[]) => {
			this.messageList = messages;
			this.scrollToBottom();
		});
	}

	private subscribeToToggleChat() {
		this.chatToggleSubscription = this.chatService.toggleChatObs.subscribe((opened) => {
			this.chatOpened = opened;
			if (this.chatOpened) {
				this.scrollToBottom();
				setTimeout(() => {
					this.chatInput.nativeElement.focus();
				});
			}
		});
	}
	subscribeToMessageTypingUser() {
		this.messageTypingUserSubscription = this.chatService.messageTypingUsersObs.subscribe((messages: any[]) => {
			this.messageTypingUserList = messages.filter(function (e) {
				return e['status'] === 'START';
			});
		});
	}

	chatInputKeyUp(event) {
		clearTimeout(this.keyupTimer);
		var self = this;
		if ((event && event.keyCode === 13) || this.message != '') {
			this.keyupTimer = setTimeout(this.typingStoped.bind(self), this.timerUnit);
		}
	}
	typingStoped() {
		sessionStorage.setItem('TYPE_STOPED', 'true');
		if (this.chatService) {
			this.chatService.sendMessageTypingSignal(this.chatService.getChatinguserName(), 'STOP');
		}

	}


	chatInputKeyDown(event: KeyboardEvent) {

		const isTyping = sessionStorage.getItem('TYPE_STOPED');
		if (this.message) {
			if (this.message.length === 1 || (isTyping && isTyping === 'true')) {
				this.typingStarted();
			}
			if (this.message.length > 1) {
				sessionStorage.setItem('TYPE_STOPED', 'false');
			}

		} else {
			sessionStorage.removeItem('TYPE_STOPED');
		}

	}

	typingStarted() {
		this.chatService.sendMessageTypingSignal(this.chatService.getChatinguserName(), 'START');
	}
	/*fileUploadDialBox() {
		this.files = [];
		this.base64Array = [];
		const fileInput = this.fileInput.nativeElement;
		fileInput.onchange = () => {
			for (let index = 0; index < fileInput.files.length; index++) {
				const file = fileInput.files[index];
				this.files.push({ data: file, name: file['name'], index: index });
			}
			this.readBase64UploadFiles();
		};
		fileInput.click();

	}
	readBase64UploadFiles() {
		this.files.forEach((element) => {
			this.getBase64(element['data']).then(
				(data) => {
					this.base64Array.push(data);
				},
				(err) => {
					console.error(err);
				}
			)
		});
	}

	getBase64(file: File) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onloadend = () => resolve(reader.result);
			reader.onerror = error => reject(error);
		});
	}

	removeFile(index) {
		this.files = this.files.filter(function (obj) {
			return obj['index'] !== index;
		});
		this.readBase64UploadFiles();
	}
	downloadFile(base64content) {
		var blob = this.dataURItoBlob(base64content);
		var url = window.URL.createObjectURL(blob);
		window.open(url, '_blank');
	}
	dataURItoBlob(dataURI) {
		var byteString = atob(dataURI.split(',')[1]);
		var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
		return new Blob([byteString], { type: mimeString })
	}*/
	toggled: boolean = false;
	togleEmoji() {
		this.toggled = !this.toggled;
	}
	addEmoji(e: MouseEvent) {
		const char = e['emoji']['native'];
		if (this.message) {
			this.message += char;
		} else {
			this.message = '';
			this.message += char;
		}
	}

}
