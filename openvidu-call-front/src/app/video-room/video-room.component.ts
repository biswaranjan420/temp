import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Subscription } from 'rxjs/internal/Subscription';
import { Router } from '@angular/router';
import {
	Publisher,
	Subscriber,
	Session,
	StreamEvent,
	StreamPropertyChangedEvent,
	SessionDisconnectedEvent,
	PublisherSpeakingEvent,
	ConnectionEvent
} from 'openvidu-browser';
import { UserModel } from '../shared/models/user-model';
import { ChatComponent } from '../shared/components/chat/chat.component';
import { OvSettingsModel } from '../shared/models/ovSettings';
import { ScreenType, VideoType } from '../shared/types/video-type';
import { ILogger } from '../shared/types/logger-type';
import { LayoutType } from '../shared/types/layout-type';
import { Theme } from '../shared/types/webcomponent-config';
import { ExternalConfigModel } from '../shared/models/external-config';
import { Storage } from '../shared/types/storage-type';

// Services
import { DevicesService } from '../shared/services/devices/devices.service';
import { LoggerService } from '../shared/services/logger/logger.service';
import { RemoteUsersService } from '../shared/services/remote-users/remote-users.service';
import { UtilsService } from '../shared/services/utils/utils.service';
import { MatSidenav } from '@angular/material/sidenav';
import { ChatService } from '../shared/services/chat/chat.service';
import { UserName } from '../shared/types/username-type';
import { StorageService } from '../shared/services/storage/storage.service';
import { OpenViduLayoutService } from '../shared/services/layout/layout.service';
import { TokenService } from '../shared/services/token/token.service';
import { LocalUsersService } from '../shared/services/local-users/local-users.service';
import { OpenViduWebrtcService } from '../shared/services/openvidu-webrtc/openvidu-webrtc.service';
import { Signal } from '../shared/types/singal-type';
import { WhiteboardService } from '../shared/services/whiteboard/whiteboard.service';
import { DeviceSettingComponent } from '../shared/components/device-setting/device-setting.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToolbarComponent } from '../shared/components/toolbar/toolbar.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogComponent } from '../shared/components/dialog/dialog.component';
import { AuditlogService } from '../shared/services/auditlog/auditlog.service';
import { CustomSessionEvent } from '../shared/models/auditlog';
import { SpeedTestService } from 'ng-speed-test';


@Component({
	selector: 'app-video-room',
	templateUrl: './video-room.component.html',
	styleUrls: ['./video-room.component.css']
})
export class VideoRoomComponent implements OnInit, OnDestroy {
	// Config from webcomponent or angular-library
	@Input() externalConfig: ExternalConfigModel;
	@Output() _session = new EventEmitter<any>();
	@Output() _publisher = new EventEmitter<any>();
	@Output() _error = new EventEmitter<any>();

	// !Deprecated
	@Output() _joinSession = new EventEmitter<any>();
	// !Deprecated
	@Output() _leaveSession = new EventEmitter<any>();

	@ViewChild('chatComponent') chatComponent: ChatComponent;
	@ViewChild('sidenav') chatSidenav: MatSidenav;

	@ViewChild('participantsSidenav') participantsSidenav: MatSidenav;
	@ViewChild('toolbarComponent') toolbarComponent: ToolbarComponent;

	ovSettings: OvSettingsModel;
	compact = false;
	sidenavMode: 'side' | 'over' = 'side';
	lightTheme: boolean;
	showConfigRoomCard = true;
	session: Session;
	sessionScreen: Session;
	localUsers: UserModel[] = [];
	remoteUsers: UserModel[] = [];
	participantsNameList: UserName[] = [];
	isConnectionLost: boolean;
	isAutoLayout = false;
	hasVideoDevices: boolean;
	hasAudioDevices: boolean;
	private log: ILogger;
	private oVUsersSubscription: Subscription;
	private remoteUsersSubscription: Subscription;
	private chatSubscription: Subscription;
	private remoteUserNameSubscription: Subscription;
	private isWhiteboardOpenedSubscription: Subscription;
	totalParticipants = 0;
	menu: boolean;
	isWhiteboardOpened: boolean;
	private dialogRef: MatDialogRef<DeviceSettingComponent, any>;
	private alertDialogRef: MatDialogRef<DialogComponent, any>;
	amISpeaking = false;
	customSessionEvent: CustomSessionEvent;
	sessionEventObject: CustomSessionEvent;
	intervalNetworkSpeed$: any;
	deviceSnackbarErrorMsg:any;
	constructor(
		private router: Router,
		private utilsSrv: UtilsService,
		private remoteUsersService: RemoteUsersService,
		private openViduWebRTCService: OpenViduWebrtcService,
		private localUsersService: LocalUsersService,
		private oVDevicesService: DevicesService,
		private loggerSrv: LoggerService,
		private chatService: ChatService,
		private storageSrv: StorageService,
		private oVLayout: OpenViduLayoutService,
		private tokenService: TokenService,
		private whiteboardSrv: WhiteboardService,
		private bottomSheet: MatBottomSheet,
		public dialog: MatDialog,
		private _snackBar: MatSnackBar,
		private auditLogService: AuditlogService,
		private speedTestService: SpeedTestService

	) {
		this.log = this.loggerSrv.get('VideoRoomComponent');

	}

	@HostListener('window:beforeunload', ['$event'])
	beforeunloadHandler(event: BeforeUnloadEvent) {
		if (!this.showConfigRoomCard) {
			const message = 'Are you sure you want to leave the session?';
			event.preventDefault();
			event.returnValue = message;
			return message;
		}
	}

	@HostListener('window:unload', ['$event'])
	unloadHandler(event: Event) {
		if (!this.showConfigRoomCard) {
			this.leaveSession();
		}
		this.sessionEventObject.participant_status = 'LEFT';
		this.onConfigReady(this.sessionEventObject);
		if (this.intervalNetworkSpeed$) {
			clearTimeout(this.intervalNetworkSpeed$);
		}
	}

	@HostListener('window:resize')
	sizeChange() {
		this.oVLayout.update();
		this.checkSizeComponent();
	}
	@HostListener('window:contextmenu', ['$event'])
	contextmenu(event: Event) {
		event.preventDefault();
		alert('Right click is disabled on this screen.');
	}

	@HostListener('document:keydown.control.shift.i', ['$event'])
	keydownHandler(event: Event) {
		event.preventDefault();
		alert('This function is not allowed here.');
	}

	async ngOnInit() {
		this.sessionEventObject = new CustomSessionEvent();
		this.localUsersService.initialize();
		this.openViduWebRTCService.initialize();
		this.auditLogService.initialize();
		this.lightTheme = this.externalConfig?.getTheme() === Theme.LIGHT;
		this.ovSettings = !!this.externalConfig ? this.externalConfig.getOvSettings() : new OvSettingsModel();
		this.ovSettings.setScreenSharing(this.ovSettings.hasScreenSharing() && !this.utilsSrv.isMobile());


	}

	ngOnDestroy() {
		// Reconnecting session is received in Firefox
		// To avoid 'Connection lost' message uses session.off()
		this.session?.off('reconnecting');
		this.remoteUsersService.clear();
		this.oVLayout.clear();
		this.localUsersService.clear();
		this.session = null;
		this.sessionScreen = null;
		this.localUsers = [];
		this.remoteUsers = [];
		if (this.oVUsersSubscription) {
			this.oVUsersSubscription.unsubscribe();
		}
		if (this.remoteUsersSubscription) {
			this.remoteUsersSubscription.unsubscribe();
		}
		if (this.chatSubscription) {
			this.chatSubscription.unsubscribe();
		}
		if (this.remoteUserNameSubscription) {
			this.remoteUserNameSubscription.unsubscribe();
		}
		if (this.bottomSheet._openedBottomSheetRef) {
			this.bottomSheet.dismiss();
			this.bottomSheet.ngOnDestroy();
		}
		if (this.intervalNetworkSpeed$) {
			clearTimeout(this.intervalNetworkSpeed$);
		}

	}
	async onConfigReady(event: CustomSessionEvent) {
		console.warn(event);
		if (event?.participant_status === 'JOINED') {
			if (this.auditLogService.getDeviceStatus()) {
				if (this.auditLogService.getDeviceStatus() !== 'OK') {
					this.deviceSnackbarErrorMsg = this._snackBar.open(this.auditLogService.getDeviceStatus(), '', {
						horizontalPosition: 'center',
						verticalPosition: 'top',
						panelClass: 'snackbar-txtred-bkblack'
					});
				}
			}
		}
		if (this.auditLogService.getAuditLog().roomId === 'NULL') {
			return;
		}
		if (['RECONNECTING', 'RECONNECTED', 'NETWORKDISCONNECT'].indexOf(event?.participant_status) >= 0) {
			return;
		}
		this.auditLogService.setParticipantStatus(event?.participant_status);
		if (event?.participant_status === 'WAITING') {
			this.customSessionEvent = event;
			const speed: any = await this.getNetSpeed();
			this.auditLogService.setConnectionStatus(speed);
		}
		this.setAuditLogPropert();

		if (event?.participant_status === 'JOINED') {
			//this.subscribeToNetwrkSpeedTest('JOINED');
			let _self = this;
			this.intervalNetworkSpeed$ = setInterval(() => {
				_self.getNetSpeed().then(
					(res) => {
						const isNetwChange = _self.auditLogService.setConnectionStatus(res);
						console.warn(isNetwChange);
						if (isNetwChange) {
							this.auditLogService.setParticipantStatus('CONT');
							this.auditLogService.save();
						}
					}
				).catch(
					(err) => {

					}
				)

			}, 10000);
			
		}

		this.auditLogService.save();

	}
	sendBtnClick(message: string) {
		if (message !== '' && message !== ' ') {
			if (this.auditLogService.getAuditLog().roomId === 'NULL') {
				return;
			}
			this.auditLogService.saveChatReport(message);
		}

	}

	getNetSpeed() {
		return new Promise((resolve, reject) => {
			this.speedTestService.getMbps(
				{
					iterations: 1,
					file: {
						path: 'https://raw.githubusercontent.com/jrquick17/ng-speed-test/02c59e4afde67c35a5ba74014b91d44b33c0b3fe/demo/src/assets/1mb.jpg',
						size: 1197292,
						shouldBustCache: true
					}
				}
			).subscribe(
				(speed) => {
					resolve(Math.floor(speed));
				},
				(err) => {
					resolve(Math.floor(0));
				}
			);
		});
	}
	setAuditLogPropert() {
		this.auditLogService.setSystemResource(this.customSessionEvent.systemResource);
		this.auditLogService.setUserName(this.storageSrv.get(Storage.USER_NICKNAME));
		this.auditLogService.setRoomName(sessionStorage.getItem('MeetMonkConfRoomName'));
		
		// this.auditLogService.setHasAudio(this.oVDevicesService.hasAudioDeviceAvailable());
		// this.auditLogService.setHasVideo(this.oVDevicesService.hasVideoDeviceAvailable());
		// this.auditLogService.setAudioSource(this.oVDevicesService.getMicSelected()?.label);
		// this.auditLogService.setVideoSource(this.oVDevicesService.getCamSelected()?.label);
		// this.auditLogService.setUserName(this.storageSrv.get(Storage.USER_NICKNAME));

	}
	onConfigRoomJoin() {
		this.hasVideoDevices = this.oVDevicesService.hasVideoDeviceAvailable();
		this.hasAudioDevices = this.oVDevicesService.hasAudioDeviceAvailable();
		this.showConfigRoomCard = false;
		this.subscribeToLocalUsers();
		this.subscribeToRemoteUsers();
		this.tokenService.initialize(this.ovSettings);
		this.subscribeToToggleWhiteboard();
		setTimeout(() => {
			this.oVLayout.initialize();
			this.checkSizeComponent();
			this.joinToSession();
		}, 50);
	}

	async joinToSession() {
		this.openViduWebRTCService.initSessions();
		this.session = this.openViduWebRTCService.getWebcamSession();
		this._session.emit(this.session);
		this.sessionScreen = this.openViduWebRTCService.getScreenSession();
		this.subscribeToConnectionCreatedAndDestroyed();
		this.subscribeToStreamCreated();
		this.subscribeToStreamDestroyed();
		this.subscribeToStreamPropertyChange();
		this.subscribeToNicknameChanged();
		this.chatService.setChatComponent(this.chatSidenav);
		this.whiteboardSrv.initialize();
		this.chatService.subscribeToChat();
		this.subscribeToChatComponent();
		this.subscribeToReconnection();
		this.subscribeToToggleAudioFromConferenceHoster();
		this.subscribeToToggleCameraFromConferenceHoster();
		this.whiteboardSrv.subscribeToWhiteboardEvents();
		this.subscribeToSpeechDetection();
		await this.connectToSession();
		// Workaround, firefox does not have audio when publisher join with muted camera
		if (this.utilsSrv.isFirefox() && !this.localUsersService.hasWebcamVideoActive()) {
			this.openViduWebRTCService.publishWebcamVideo(true);
			this.openViduWebRTCService.publishWebcamVideo(false);
		}

	}

	leaveSession() {
		if(this.deviceSnackbarErrorMsg){
			this.deviceSnackbarErrorMsg?.dismiss();
		}
		this.log.d('Leaving session...');
		this.openViduWebRTCService.disconnect();
		this.auditLogService.reset();
		this.router.navigate(['']);
		this._leaveSession.emit();
	}
	leaveSessionClicked() {
		this.sessionEventObject.participant_status = 'LEFT';
		this.onConfigReady(this.sessionEventObject);
		if (this.intervalNetworkSpeed$) {
			clearTimeout(this.intervalNetworkSpeed$);
		}
		this.leaveSession();
	}

	onNicknameUpdate(nickname: string) {
		this.localUsersService.updateUsersNickname(nickname);
		this.storageSrv.set(Storage.USER_NICKNAME, nickname);
		this.openViduWebRTCService.sendNicknameSignal();
	}

	toggleMic() {
		if (this.localUsersService.isWebCamEnabled()) {
			this.openViduWebRTCService.publishWebcamAudio(!this.localUsersService.hasWebcamAudioActive());
			//return;
		}
		//this.mergeAudioTrackIfScreenPublished();
		//this.openViduWebRTCService.publishScreenAudio(!this.localUsersService.hasScreenAudioActive());
	}

	async toggleCam() {
		const publishVideo = !this.localUsersService.hasWebcamVideoActive();
		// Disabling webcam
		if (this.localUsersService.areBothConnected()) {
			this.openViduWebRTCService.publishWebcamVideo(publishVideo);
			this.localUsersService.disableWebcamUser();
			this.openViduWebRTCService.unpublishWebcamPublisher();
			return;
		}
		// Enabling webcam
		if (this.localUsersService.isOnlyScreenConnected()) {
			const hasAudio = this.localUsersService.hasScreenAudioActive();

			if (!this.openViduWebRTCService.isWebcamSessionConnected()) {
				await this.connectWebcamSession();
			}
			await this.openViduWebRTCService.publishWebcamPublisher();
			this.openViduWebRTCService.publishScreenAudio(false);
			this.openViduWebRTCService.publishWebcamAudio(hasAudio);
			this.localUsersService.enableWebcamUser();
		}
		// Muting/unmuting webcam
		this.openViduWebRTCService.publishWebcamVideo(publishVideo);
	}


	async toggleScreenShare() {
		// const osName = this.utilsSrv.getMacOrIOSOS();
		// if(osName!='CHECKOS'){
		// 	if(osName === 'Mac OS' || osName === 'iOS'){
		// 		const message = `Your operating system ${osName} may not support Screenshare`;
		// 	  this._snackBar.open(message, '', {
		// 		 duration: 3000,
		// 		 horizontalPosition: 'center',
		// 		 verticalPosition: 'top',
		// 		 panelClass: ['snackbar-warn']
		// 	   });
		// 	 return;
		// 	}
		//  }
		// Disabling screenShare


		if (!this.openViduWebRTCService.checkScreenSharingCapabilities()) {
			const message = this.openViduWebRTCService.getScrrenUnsuportedMsg();
			this.alertDialogRef = this.dialog.open(DialogComponent, {
				data: {
					'message': message,
					'cancelBtn': false,
					'okBtn': true
				}
			});
			return;
		}

		if (this.localUsersService.areBothConnected()) {
			this.removeScreen();
			//await this.mergeAudioTrackIfScreenPublished();
			return;
		}

		// Enabling screenShare
		if (this.localUsersService.isOnlyWebcamConnected()) {
			const screenPublisher = await this.initScreenPublisher();

			screenPublisher.once('accessAllowed', async (event) => {
				// Listen to event fired when native stop button is clicked
				screenPublisher.stream
					.getMediaStream()
					.getVideoTracks()[0]
					.addEventListener('ended', () => {
						this.log.d('Clicked native stop button. Stopping screen sharing');
						this.toggleScreenShare();
					});
				this.log.d('ACCESS ALOWED screenPublisher');
				this.localUsersService.enableScreenUser(screenPublisher);

				if (!this.openViduWebRTCService.isScreenSessionConnected()) {
					await this.connectScreenSession();
				}
				await this.openViduWebRTCService.publishScreenPublisher();
				this.openViduWebRTCService.sendNicknameSignal();

				if (!this.localUsersService.hasWebcamVideoActive()) {
					// Disabling webcam
					//this.localUsersService.disableWebcamUser();
					//this.openViduWebRTCService.unpublishWebcamPublisher();
				}



			});

			screenPublisher.once('accessDenied', (event) => {
				this.log.w('ScreenShare: Access Denied');
				alert(event['message']);
			});
			return;
		}

		// Disabling screnShare and enabling webcam
		//alert('error on toggle Screen Share')
		const hasAudio = this.localUsersService.hasScreenAudioActive();
		await this.openViduWebRTCService.publishWebcamPublisher();
		this.openViduWebRTCService.publishScreenAudio(false);
		this.openViduWebRTCService.publishWebcamAudio(hasAudio);
		this.localUsersService.enableWebcamUser();
		this.removeScreen();
	}

	toggleSpeakerLayout() {
		if (!this.localUsersService.isScreenShareEnabled()) {
			this.isAutoLayout = !this.isAutoLayout;
			this.log.d('Automatic Layout ', this.isAutoLayout ? 'Disabled' : 'Enabled');
			if (this.isAutoLayout) {
				this.subscribeTotoggleSpeakerLayout();
				return;
			}
			this.log.d('Unsubscribe to speech detection');
			this.session.off('publisherStartSpeaking');
			this.resetAllBigElements();
			this.oVLayout.update();
			return;
		}
		this.log.w('Screen is enabled. Speech detection has been rejected');

	}

	private subscribeTotoggleSpeakerLayout() {
		this.log.d('Subscribe to speech detection', this.session);
		// Has been mandatory change the user zoom property here because of
		// zoom icons and cannot handle publisherStartSpeaking event in other component
		this.session.on('publisherStartSpeaking', (event: PublisherSpeakingEvent) => {
			const someoneIsSharingScreen = this.remoteUsersService.someoneIsSharingScreen();
			if (!this.localUsersService.isScreenShareEnabled() && !someoneIsSharingScreen) {
				const elem = event.connection.stream.streamManager.videos[0].video;
				const element = this.utilsSrv.getHTMLElementByClassName(elem, LayoutType.ROOT_CLASS);
				this.resetAllBigElements();
				this.remoteUsersService.setUserZoom(event.connection.connectionId, true);
				this.onToggleVideoSize({ element });

			}
		});
	}
	private subscribeToSpeechDetection() {
		this.session.on('publisherStartSpeaking', (event: PublisherSpeakingEvent) => {
			let self = this;
			const connectionId = event.connection.connectionId;
			const isMyOwnConnection = this.openViduWebRTCService.isMyOwnConnection(connectionId);
			if (!isMyOwnConnection) {
				//Set User Model is speaking by matching connectionId
				this.amISpeaking = true;
				this.remoteUsersService.userSpeakingDetection(connectionId, true);
				setTimeout(() => {
					if (self.amISpeaking) {
						self.amISpeaking = false;
						this.remoteUsersService.userSpeakingDetection(connectionId, false);
					}
				}, 3000);
			}
		})
	}

	onReplaceScreenTrack(event) {
		this.openViduWebRTCService.replaceScreenTrack();
	}

	checkSizeComponent() {
		this.compact = document.getElementById('room-container')?.offsetWidth <= 790;
		this.sidenavMode = this.compact ? 'over' : 'side';
	}

	onToggleVideoSize(event: { element: HTMLElement; connectionId?: string; resetAll?: boolean }) {
		const element = event.element;
		if (!!event.resetAll) {
			this.resetAllBigElements();
		}

		this.utilsSrv.toggleBigElementClass(element);

		// Has been mandatory change the user zoom property here because of
		// zoom icons and cannot handle publisherStartSpeaking event in other component
		if (!!event?.connectionId) {
			if (this.openViduWebRTCService.isMyOwnConnection(event.connectionId)) {
				this.localUsersService.toggleZoom(event.connectionId);
			} else {
				this.remoteUsersService.toggleUserZoom(event.connectionId);
			}
		}
		this.oVLayout.update();
	}

	toolbarMicIconEnabled(): boolean {
		if (this.localUsersService.isWebCamEnabled()) {
			return this.localUsersService.hasWebcamAudioActive();
		}
		return this.localUsersService.hasScreenAudioActive();
	}

	private async connectToSession(): Promise<void> {
		try {
			// Initialize tokens from externalConfig or create new ones
			await this.tokenService.initTokens(this.externalConfig);
		} catch (error) {
			this.log.e('There was an error initializing the token:', error.status, error.message);
			this._error.emit({ error: error.error, messgae: error.message, code: error.code, status: error.status });
			this.utilsSrv.showErrorMessage('There was an error initializing the token:', error.error || error.message);
		}

		if (this.localUsersService.areBothConnected()) {
			await this.connectWebcamSession();
			await this.connectScreenSession();
			await this.openViduWebRTCService.publishWebcamPublisher();
			await this.openViduWebRTCService.publishScreenPublisher();


		} else if (this.localUsersService.isOnlyScreenConnected()) {
			await this.connectScreenSession();
			await this.openViduWebRTCService.publishScreenPublisher();

		} else {
			await this.connectWebcamSession();
			await this.openViduWebRTCService.publishWebcamPublisher();
		}
		// !Deprecated
		this._joinSession.emit();

		this.oVLayout.update();

		// Audit Logs For Joined
		this.sessionEventObject.participant_status = 'JOINED';
		this.onConfigReady(this.sessionEventObject);

	}

	private async connectScreenSession() {
		try {
			await this.openViduWebRTCService.connectScreenSession(this.tokenService.getScreenToken());
		} catch (error) {
			this._error.emit({ error: error.error, messgae: error.message, code: error.code, status: error.status });
			this.log.e('There was an error connecting to the session:', error.code, error.message);
			this.utilsSrv.showErrorMessage('There was an error connecting to the session:', error?.error || error?.message);
		}
	}

	private async connectWebcamSession() {
		try {
			await this.openViduWebRTCService.connectWebcamSession(this.tokenService.getWebcamToken());
		} catch (error) {
			this._error.emit({ error: error.error, messgae: error.message, code: error.code, status: error.status });
			this.log.e('There was an error connecting to the session:', error.code, error.message);
			this.utilsSrv.showErrorMessage('There was an error connecting to the session:', error?.error || error?.message);
		}
	}

	private subscribeToConnectionCreatedAndDestroyed() {
		this.session.on('connectionCreated', (event: ConnectionEvent) => {
			if (this.openViduWebRTCService.isMyOwnConnection(event.connection.connectionId)) {
				// this.sessionEventObject.event = 'participantJoined';
				// this.onConfigReady(this.sessionEventObject);
				return;
			}

			const nickname: string = this.utilsSrv.getNicknameFromConnectionData(event.connection.data);
			this.remoteUsersService.addUserName(event);

			const Rawdata = event.connection.data;
			const jsonData = JSON.parse(Rawdata);
			this.openSnackBar(jsonData['clientData'] + " joined");

			// Adding participant when connection is created
			if (!nickname?.includes('_' + VideoType.SCREEN)) {
				this.remoteUsersService.add(event, null);
				this.openViduWebRTCService.sendNicknameSignal(event.connection);
			}
		});

		this.session.on('connectionDestroyed', (event: ConnectionEvent) => {
			if (this.openViduWebRTCService.isMyOwnConnection(event.connection.connectionId)) {
				// this.sessionEventObject.event = 'participantLeft';
				// this.onConfigReady(this.sessionEventObject);

				return;
			}
			this.remoteUsersService.deleteUserName(event);

			const Rawdata = event.connection.data;
			const jsonData = JSON.parse(Rawdata);
			this.openSnackBar(jsonData['clientData'] + " left");

			const nickname: string = this.utilsSrv.getNicknameFromConnectionData(event.connection.data);
			// Deleting participant when connection is destroyed
			if (!nickname?.includes('_' + VideoType.SCREEN)) {
				this.remoteUsersService.removeUserByConnectionId(event.connection.connectionId);
			}
		});
	}

	private subscribeToStreamCreated() {
		this.session.on('streamCreated', (event: StreamEvent) => {
			const connectionId = event.stream.connection.connectionId;

			if (this.openViduWebRTCService.isMyOwnConnection(connectionId)) {


				return;
			}

			const subscriber: Subscriber = this.session.subscribe(event.stream, undefined);
			this.remoteUsersService.add(event, subscriber);
			// this.oVSessionService.sendNicknameSignal(event.stream.connection);
		});
	}

	private subscribeToStreamDestroyed() {
		this.session.on('streamDestroyed', (event: StreamEvent) => {
			const connectionId = event.stream.connection.connectionId;
			this.remoteUsersService.removeUserByConnectionId(connectionId);
			if (this.openViduWebRTCService.isMyOwnConnection(connectionId)) {

			}
			// event.preventDefault();
		});
	}

	// Emit publisher to webcomponent
	emitPublisher(publisher: Publisher) {
		this._publisher.emit(publisher);
	}

	private subscribeToStreamPropertyChange() {
		this.session.on('streamPropertyChanged', (event: StreamPropertyChangedEvent) => {
			const connectionId = event.stream.connection.connectionId;
			if (this.openViduWebRTCService.isMyOwnConnection(connectionId)) {
				return;
			}
			if (event.changedProperty === 'videoActive') {
				this.remoteUsersService.updateUsers();
			}
		});
	}

	private subscribeToNicknameChanged() {
		this.session.on('signal:nicknameChanged', (event: any) => {
			const connectionId = event.from.connectionId;
			if (this.openViduWebRTCService.isMyOwnConnection(connectionId)) {
				return;
			}
			const nickname = this.utilsSrv.getNicknameFromConnectionData(event.data);
			this.remoteUsersService.updateNickname(connectionId, nickname);
		});
	}

	private subscribeToSpeechDetectionBackup() {
		this.log.d('Subscribe to speech detection', this.session);
		// Has been mandatory change the user zoom property here because of
		// zoom icons and cannot handle publisherStartSpeaking event in other component
		this.session.on('publisherStartSpeaking', (event: PublisherSpeakingEvent) => {
			const someoneIsSharingScreen = this.remoteUsersService.someoneIsSharingScreen();
			if (!this.localUsersService.isScreenShareEnabled() && !someoneIsSharingScreen) {
				let self = this;
				this.amISpeaking = true;
				setTimeout(() => {
					if (self.amISpeaking) {
						self.amISpeaking = false;
					}
				}, 4000);
				const elem = event.connection.stream.streamManager.videos[0].video;
				const element = this.utilsSrv.getHTMLElementByClassName(elem, LayoutType.ROOT_CLASS);
				this.resetAllBigElements();
				this.remoteUsersService.setUserZoom(event.connection.connectionId, true);
				this.onToggleVideoSize({ element });
			}
		});
	}

	private removeScreen() {
		this.localUsersService.disableScreenUser();
		this.openViduWebRTCService.unpublishScreenPublisher();
	}

	private subscribeToChatComponent() {
		this.chatSubscription = this.chatService.toggleChatObs.subscribe((opened) => {
			const timeout = this.externalConfig ? 300 : 0;
			this.oVLayout.update(timeout);
		});
	}

	private subscribeToReconnection() {
		this.session.on('reconnecting', () => {
			this.log.w('Connection lost: Reconnecting');
			this.isConnectionLost = true;
			this.sessionEventObject.participant_status = 'RECONNECTING';
			this.onConfigReady(this.sessionEventObject);
			this.utilsSrv.showErrorMessage('Connection Problem', 'Oops! Trying to reconnect to the session ...', true);
		});
		this.session.on('reconnected', () => {
			this.log.w('Connection lost: Reconnected');
			this.isConnectionLost = false;
			this.sessionEventObject.participant_status = 'RECONNECTED';
			this.onConfigReady(this.sessionEventObject);

			this.utilsSrv.closeDialog();
		});
		this.session.on('sessionDisconnected', (event: SessionDisconnectedEvent) => {
			if (event.reason === 'networkDisconnect') {
				this.utilsSrv.closeDialog();
				this.sessionEventObject.participant_status = 'NETWORKDISCONNECT';
				this.onConfigReady(this.sessionEventObject);
				this.leaveSession();
			}
		});
	}

	private initScreenPublisher(): Promise<Publisher> {
		const videoSource = ScreenType.SCREEN;
		const audioSource = this.hasAudioDevices ? undefined : null;
		const willThereBeWebcam = this.localUsersService.isWebCamEnabled() && this.localUsersService.hasWebcamVideoActive();
		//const hasAudio = willThereBeWebcam ? false : this.hasAudioDevices && this.localUsersService.hasWebcamAudioActive();
		const hasAudio = this.localUsersService.hasWebcamAudioActive();
		const properties = this.openViduWebRTCService.createPublisherProperties(videoSource, audioSource, true, true, false);

		try {
			return this.openViduWebRTCService.initScreenPublisher(undefined, properties);
		} catch (error) {
			alert(error);
			this.log.e(error);
			this.utilsSrv.handlerScreenShareError(error);
		}
	}

	private resetAllBigElements() {
		this.utilsSrv.removeAllBigElementClass();
		this.remoteUsersService.resetUsersZoom();
		this.localUsersService.resetUsersZoom();
	}

	private subscribeToLocalUsers() {
		this.oVUsersSubscription = this.localUsersService.OVUsers.subscribe((users: UserModel[]) => {
			this.localUsers = users;
			this.oVLayout.update();
		});
	}

	private subscribeToRemoteUsers() {
		this.remoteUsersSubscription = this.remoteUsersService.remoteUsers.subscribe((users: UserModel[]) => {
			this.remoteUsers = [...users];
			this.oVLayout.update();
		});

		this.remoteUserNameSubscription = this.remoteUsersService.remoteUserNameList.subscribe((names: UserName[]) => {
			this.participantsNameList = [...names];
			this.totalParticipants = this.participantsNameList.length;
		});
	}

	async toggleParticipantsMenu() {
		await this.participantsSidenav.toggle();
		this.oVLayout.update();
	}

	subscribeToToggleAudioFromConferenceHoster() {
		this.session.on('signal:' + Signal.DISABLE_AUDIO, (event: any) => {
			this.toggleMic();
		});

		this.session.on('signal:' + Signal.ENABLE_AUDIO, (event: any) => {
			this.toggleMic();
		});
	}
	subscribeToToggleCameraFromConferenceHoster() {
		this.session.on('signal:' + Signal.TOGGLE_VIDEO, (event: any) => {
			this.toggleCam();
		});
	}
	subscribeToToggleWhiteboard(): void {
		this.isWhiteboardOpenedSubscription = this.whiteboardSrv.isWhiteboardOpened.subscribe((isOpened) => {
			this.oVLayout.update(1);
			this.isWhiteboardOpened = isOpened;
		});
	}
	toggleSettings(action: any) {
		if (action) {
			this.dialogRef = this.dialog.open(DeviceSettingComponent, {
				data: {}
			});
			this.dialogRef.afterClosed().subscribe(result => {
				if (result) {
					this.dialogRef.close();
					this.toolbarComponent.isSettingOpened = false;
				}
			});
		} else {
			this.dialogRef.close();
		}
	}


	async mergeAudioTrackIfScreenPublished() {

		if (this.localUsersService.areBothConnected()) {

			this.openViduWebRTCService.publishScreenAudio(!this.localUsersService.hasScreenAudioActive());
			//this.oVLayout.update();
		} else if (this.localUsersService.isOnlyScreenConnected()) {
			//Merge  webcam user audio track in screen user  audio track

			this.openViduWebRTCService.publishScreenAudio(!this.localUsersService.hasScreenAudioActive());

		} else {

		}

	}

	openSnackBar(message: string) {
		this._snackBar.open(message, '', {
			duration: 3000,
			panelClass: 'snackbar-primary'
		});
	}




}