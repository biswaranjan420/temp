import { Component, OnInit, Input, EventEmitter, Output, HostListener, OnDestroy } from '@angular/core';
import { UtilsService } from '../../services/utils/utils.service';
import { VideoFullscreenIcon } from '../../types/icon-type';
import { OvSettingsModel } from '../../models/ovSettings';
import { ChatService } from '../../services/chat/chat.service';
import { Subscription } from 'rxjs/internal/Subscription';
import { TokenService } from '../../services/token/token.service';
import { LocalUsersService } from '../../services/local-users/local-users.service';
import { DialogComponent } from '../dialog/dialog.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { WhiteboardService } from '../../services/whiteboard/whiteboard.service';
import { ResponsiveService } from '../../services/responsive/responsive.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
	selector: 'app-toolbar',
	templateUrl: './toolbar.component.html',
	styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent implements OnInit, OnDestroy {
	@Input() lightTheme: boolean;
	@Input() compact: boolean;
	@Input() showNotification: boolean;
	@Input() ovSettings: OvSettingsModel;

	@Input() isWebcamAudioEnabled: boolean;
	@Input() isAutoLayout: boolean;
	@Input() amISpeaking: boolean;
	@Input() isConnectionLost: boolean;
	@Input() hasVideoDevices: boolean;
	@Input() hasAudioDevices: boolean;
	@Input() isConfCoordinator:boolean;
	@Output() micButtonClicked = new EventEmitter<any>();
	@Output() camButtonClicked = new EventEmitter<any>();
	@Output() screenShareClicked = new EventEmitter<any>();
	@Output() layoutButtonClicked = new EventEmitter<any>();
	@Output() leaveSessionButtonClicked = new EventEmitter<any>();
	@Output() participantsMenuButtonClicked = new EventEmitter<any>();
	@Output() settingButtonClicked = new EventEmitter<boolean>();
	mySessionId: string;

	newMessagesNum: number;
	isScreenShareEnabled: boolean;
	isWebcamVideoEnabled: boolean;

	fullscreenIcon = VideoFullscreenIcon.BIG;
	logoUrl = 'assets/images/header_logo.jpeg';

	participantsNames: string[] = [];

	private chatServiceSubscription: Subscription;
	private screenShareStateSubscription: Subscription;
	private webcamVideoStateSubscription: Subscription;
	private dialogRef: MatDialogRef<DialogComponent, any>;
	private isWhiteboardOpenedSubscription: Subscription;
	isWhiteboardOpened: boolean;
	isSettingOpened : boolean;
	isMobile: boolean;
	constructor(
		private utilsSrv: UtilsService,
		private chatService: ChatService,
		private tokenService: TokenService,
		private localUsersService: LocalUsersService,
		public dialog: MatDialog,
		private whiteboardSrv: WhiteboardService,
		private responsiveService:ResponsiveService,
		private _snackBar: MatSnackBar
	) { }

	ngOnDestroy(): void {
		if (this.chatServiceSubscription) {
			this.chatServiceSubscription.unsubscribe();
		}
		if (this.screenShareStateSubscription) {
			this.screenShareStateSubscription.unsubscribe();
		}
		if (this.webcamVideoStateSubscription) {
			this.webcamVideoStateSubscription.unsubscribe();
		}
		if (this.isWhiteboardOpenedSubscription) {
			this.isWhiteboardOpenedSubscription.unsubscribe();
		}
	}

	@HostListener('window:resize', ['$event'])
	sizeChange(event) {
		const maxHeight = window.screen.height;
		const maxWidth = window.screen.width;
		const curHeight = window.innerHeight;
		const curWidth = window.innerWidth;
		if (maxWidth !== curWidth && maxHeight !== curHeight) {
			this.fullscreenIcon = VideoFullscreenIcon.BIG;
		}
	}

	ngOnInit() {
		this.isSettingOpened = false;
		this.onResize();
		this.responsiveService.checkWidth();
		this.mySessionId = this.tokenService.getSessionId();

		this.chatServiceSubscription = this.chatService.messagesUnreadObs.subscribe((num) => {
			this.newMessagesNum = num;
		});

		this.screenShareStateSubscription = this.localUsersService.screenShareState.subscribe((enabled) => {
			this.isScreenShareEnabled = enabled;
		});

		this.webcamVideoStateSubscription = this.localUsersService.webcamVideoActive.subscribe((enabled) => {
			this.isWebcamVideoEnabled = enabled;
		});
		if (this.lightTheme) {
			this.logoUrl = 'assets/images/openvidu_logo_grey.png';
		}
		this.isWhiteboardOpenedSubscription = this.whiteboardSrv.isWhiteboardOpened.subscribe((isOpened: boolean) => {
			this.isWhiteboardOpened = isOpened;
		});
	}
	onResize() {
		this.responsiveService.getMobileStatus().subscribe(isMobile => {
		  this.isMobile = isMobile;
		});
	  }

	toggleMicrophone() {
		this.micButtonClicked.emit();
	}

	toggleCamera() {
		this.camButtonClicked.emit();
	}

	toggleScreenShare() {
		this.screenShareClicked.emit();
	}

	toggleSpeakerLayout() {
		this.layoutButtonClicked.emit();
	}

	leaveSession() {
		this.dialogRef = this.dialog.open(DialogComponent, {
			data: {
				'message':'Are you sure you want to leave the session?',
				'cancelBtn':true,
				'okBtn':true
			}
		});
		this.dialogRef.afterClosed().subscribe(result => {
			if (result) {
				this.leaveSessionButtonClicked.emit();
			}
		});
	}

	toggleChat() {
		this.chatService.toggleChat();
	}

	toggleFullscreen() {
		this.utilsSrv.toggleFullscreen('videoRoomNavBar');
		this.fullscreenIcon = this.fullscreenIcon === VideoFullscreenIcon.BIG ? VideoFullscreenIcon.NORMAL : VideoFullscreenIcon.BIG;
	}
	toggleParticipantsList() {
		this.participantsMenuButtonClicked.emit();
	}
	toggleWhiteboard(){
		const osName = this.utilsSrv.getMacOrIOSOS();
		if(osName!='CHECKOS'){
           if(osName === 'Mac OS' || osName === 'iOS'){
			   const message = `Your operating system ${osName} may not support Whiteboard`;
			 this._snackBar.open(message, '', {
				duration: 3000,
				horizontalPosition: 'center',
				verticalPosition: 'top',
				panelClass: ['snackbar-warn']
			  });
            return;
		   }
		}
		this.whiteboardSrv.toggleWhiteboard();
	}
	toggleSettings(){
		this.isSettingOpened = !this.isSettingOpened;
		this.settingButtonClicked.emit(this.isSettingOpened);
		
	}
}
