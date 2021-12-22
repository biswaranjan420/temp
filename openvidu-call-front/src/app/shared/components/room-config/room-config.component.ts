import { Component, OnInit, Output, EventEmitter, Input, HostListener, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { UserModel } from '../../models/user-model';
import { NicknameMatcher } from '../../forms-matchers/nickname';
import { UtilsService } from '../../services/utils/utils.service';
import { Publisher } from 'openvidu-browser';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { IDevice, CameraType } from '../../types/device-type';
import { DevicesService } from '../../services/devices/devices.service';
import { Subscription } from 'rxjs';
import { AvatarType } from '../../types/chat-type';
import { LoggerService } from '../../services/logger/logger.service';
import { ILogger } from '../../types/logger-type';
import { ScreenType } from '../../types/video-type';
import { ExternalConfigModel } from '../../models/external-config';
import { OvSettingsModel } from '../../models/ovSettings';
import { StorageService } from '../../services/storage/storage.service';
import { Storage } from '../../types/storage-type';
import { OpenViduError, OpenViduErrorName } from 'openvidu-browser/lib/OpenViduInternal/Enums/OpenViduError';
import { OpenViduWebrtcService } from '../../services/openvidu-webrtc/openvidu-webrtc.service';
import { LocalUsersService } from '../../services/local-users/local-users.service';
import { TokenService } from '../../services/token/token.service';
import { AvatarService } from '../../services/avatar/avatar.service';
import { MatMenuTrigger } from '@angular/material/menu';
import { DialogComponent } from '../dialog/dialog.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AuditlogService } from '../../services/auditlog/auditlog.service';
import { CustomSessionEvent } from '../../models/auditlog';

@Component({
	selector: 'app-room-config',
	templateUrl: './room-config.component.html',
	styleUrls: ['./room-config.component.css']
})
export class RoomConfigComponent implements OnInit, OnDestroy {
	@ViewChild('bodyCard') bodyCard: ElementRef;

	@Input() externalConfig: ExternalConfigModel;
	@Input() ovSettings: OvSettingsModel;
	@Output() join = new EventEmitter<any>();
	@Output() leaveSession = new EventEmitter<any>();

	// Webcomponent event
	@Output() publisherCreated = new EventEmitter<any>();
	@Output() configReady = new EventEmitter<any>();
	mySessionId: string;

	cameras: IDevice[];
	microphones: IDevice[];
	camSelected: IDevice;
	micSelected: IDevice;
	isVideoActive = true;
	isAudioActive = true;
	screenShareEnabled: boolean;
	localUsers: UserModel[] = [];
	openviduAvatar: string;
	capturedAvatar: string;
	avatarTypeEnum = AvatarType;
	avatarSelected: AvatarType;
	columns: number;

	nicknameFormControl = new FormControl('', [Validators.maxLength(25), Validators.required]);
	matcher = new NicknameMatcher();
	hasVideoDevices: boolean;
	hasAudioDevices: boolean;
	showConfigCard: boolean;
	private log: ILogger;
	private oVUsersSubscription: Subscription;
	private screenShareStateSubscription: Subscription;
	isMobile = false;
	captuteButtonLabel = 'Capture';
	breakpoint: number;
	private dialogRef: MatDialogRef<DialogComponent, any>;
	sessionEventObject: CustomSessionEvent;
	constructor(
		private route: ActivatedRoute,
		private utilsSrv: UtilsService,
		private openViduWebRTCService: OpenViduWebrtcService,
		private localUsersService: LocalUsersService,
		private tokenService: TokenService,
		private oVDevicesService: DevicesService,
		private loggerSrv: LoggerService,
		private storageSrv: StorageService,
		private avatarService: AvatarService,
		public dialog: MatDialog,
		private router: Router,
		private auditLogService: AuditlogService
	) {
		this.log = this.loggerSrv.get('RoomConfigComponent');

	}

	@HostListener('window:beforeunload')
	beforeunloadHandler() {
		this.close();
	}

	async ngOnInit() {
		try {
			this.isMobile = window.orientation > -1;
			this.breakpoint = (window.innerWidth <= 767) ? 1 : 2;
			this.sessionEventObject = new CustomSessionEvent();
			this.subscribeToLocalUsersEvents();
			this.initNicknameAndSubscribeToChanges();
			this.openviduAvatar = this.avatarService.getOpenViduAvatar();
			this.columns = window.innerWidth > 900 ? 2 : 1;
			this.setSessionName();
			try {
				//const roomData = await this.auditLogService.getRoomId(this.tokenService.getSessionId());
				//this.auditLogService.setRoomId(roomData['roomId']);
			} catch (error) {

			}

			await this.oVDevicesService.initDevices();
			this.setDevicesInfo();
			if (this.hasAudioDevices || this.hasVideoDevices) {
				await this.initwebcamPublisher();
			} else {
				// Emit publisher to webcomponent and angular-library
				this.emitPublisher(null);
				this.showConfigCard = true;
			}
			this.sessionEventObject.resourceNews = 'All system resources are working as expected';
			this.configReady.emit(this.sessionEventObject);

		} catch (error) {
			if (OpenViduErrorName.DEVICE_ALREADY_IN_USE === error['name']) {
				this.sessionEventObject.resourceNews = 'Camera is unavailable - being used by another program.'
				this.configReady.emit(this.sessionEventObject);
				this.dialogRef = this.dialog.open(DialogComponent, {
					data: {
						'OpenViduErrorName': error['name'],
						'message': this.sessionEventObject.resourceNews,
						'cancelBtn': true,
						'okBtn': false,
						'cancelBtnText': 'Close',
						'okBtnText': 'OK'
					}
				});
			}
			if (OpenViduErrorName.DEVICE_ACCESS_DENIED === error['name']) {
				this.sessionEventObject.resourceNews = 'Access to camera and microphone devices was not allowed.'
				this.configReady.emit(this.sessionEventObject);
				this.dialogRef = this.dialog.open(DialogComponent, {
					data: {
						'OpenViduErrorName': error['name'],
						'message': this.sessionEventObject.resourceNews,
						'cancelBtn': true,
						'okBtn': false,
						'cancelBtnText': 'Close',
						'okBtnText': 'OK'
					}
				});
			}
			if (OpenViduErrorName.NO_INPUT_SOURCE_SET === error['name']) {
				this.sessionEventObject.resourceNews = 'No camera or microphone devices have been found.'
				this.configReady.emit(this.sessionEventObject);
				this.dialogRef = this.dialog.open(DialogComponent, {
					data: {
						'OpenViduErrorName': error['name'],
						'message': this.sessionEventObject.resourceNews,
						'cancelBtn': true,
						'okBtn': false,
						'cancelBtnText': 'Close',
						'okBtnText': 'OK'
					}
				});
			}
			console.error(error);
		}
		//this.configReady.emit('sessionConfig');
		//Set role for conf coordinator role if it is cooardinator
	}

	ngOnDestroy() {
		if (this.oVUsersSubscription) {
			this.oVUsersSubscription.unsubscribe();
		}

		if (this.screenShareStateSubscription) {
			this.screenShareStateSubscription.unsubscribe();
		}
		this.oVDevicesService.clear();
	}

	async onCameraSelected(event: any) {
		// const videoSource = event?.value;
		const videoSource = event;
		if (!!videoSource) {
			// Is New deviceId different from the old one?
			if (this.oVDevicesService.needUpdateVideoTrack(videoSource)) {
				const mirror = this.oVDevicesService.cameraNeedsMirror(videoSource);
				await this.openViduWebRTCService.replaceTrack(videoSource, null, mirror);
				this.oVDevicesService.setCamSelected(videoSource);
				this.camSelected = this.oVDevicesService.getCamSelected();
			}
			// Publish Webcam
			this.openViduWebRTCService.publishWebcamVideo(true);
			this.isVideoActive = true;
			return;
		}
		// Unpublish webcam
		this.openViduWebRTCService.publishWebcamVideo(false);
		this.isVideoActive = false;
	}

	async onMicrophoneSelected(event: any) {
		//const audioSource = event?.value;
		const audioSource = event;
		if (!!audioSource) {
			// Is New deviceId different than older?
			if (this.oVDevicesService.needUpdateAudioTrack(audioSource)) {
				console.log(this.camSelected);
				const mirror = this.oVDevicesService.cameraNeedsMirror(this.camSelected.device);
				await this.openViduWebRTCService.replaceTrack(null, audioSource, mirror);
				this.oVDevicesService.setMicSelected(audioSource);
				this.micSelected = this.oVDevicesService.getMicSelected();
			}
			// Publish microphone
			this.publishAudio(true);
			this.isAudioActive = true;
			return;
		}
		// Unpublish microhpone
		this.publishAudio(false);
		this.isAudioActive = false;
	}

	toggleCam() {
		this.isVideoActive = !this.isVideoActive;
		this.openViduWebRTCService.publishWebcamVideo(this.isVideoActive);

		if (this.localUsersService.areBothConnected()) {
			this.localUsersService.disableWebcamUser();
			this.openViduWebRTCService.publishScreenAudio(this.isAudioActive);
			// !this.subscribeToVolumeChange(<Publisher>this.localUsers[0].getStreamManager());
		} else if (this.localUsersService.isOnlyScreenConnected()) {
			// (<Publisher>this.localUsers[0].getStreamManager()).off('streamAudioVolumeChange');
			this.localUsersService.enableWebcamUser();
		}
	}

	toggleScreenShare() {
		// Disabling screenShare
		if (this.localUsersService.areBothConnected()) {
			this.localUsersService.disableScreenUser();
			return;
		}

		// Enabling screenShare
		if (this.localUsersService.isOnlyWebcamConnected()) {
			const screenPublisher = this.initScreenPublisher();

			screenPublisher.on('accessAllowed', (event) => {
				screenPublisher.stream
					.getMediaStream()
					.getVideoTracks()[0]
					.addEventListener('ended', () => {
						this.log.d('Clicked native stop button. Stopping screen sharing');
						this.toggleScreenShare();
					});
				this.localUsersService.enableScreenUser(screenPublisher);
				if (!this.localUsersService.hasWebcamVideoActive()) {
					this.localUsersService.disableWebcamUser();
				}
			});

			screenPublisher.on('accessDenied', (event) => {
				this.log.w('ScreenShare: Access Denied');
				if (event && event['name'] === OpenViduErrorName.SCREEN_SHARING_NOT_SUPPORTED) {
					this.dialogRef = this.dialog.open(DialogComponent, {
						data: {
							'message': event['message'],
							'cancelBtn': false,
							'okBtn': true,
							'cancelBtnText': 'Cancel',
							'okBtnText': 'OK'
						}
					});
				}
			});
			return;
		}

		// Disabling screnShare and enabling webcam
		this.localUsersService.enableWebcamUser();
		this.localUsersService.disableScreenUser();
	}

	toggleMic() {
		this.isAudioActive = !this.isAudioActive;
		this.publishAudio(this.isAudioActive);
	}

	captureAvatar() {
		this.capturedAvatar = this.avatarService.createCapture();
		this.captuteButtonLabel = 'Re-Capture';
		this.onSelectAvatar(this.avatarTypeEnum.CAPTURED);
	}
	resetCaptureAvatar() {
		this.avatarService.clear();
		this.capturedAvatar = '';
		this.captuteButtonLabel = 'Capture';
		this.onSelectAvatar(this.avatarTypeEnum.DEFAULT);
	}

	initNicknameAndSubscribeToChanges() {
		if (this.externalConfig) {
			this.nicknameFormControl.setValue(this.externalConfig.getNickname());
			this.localUsersService.updateUsersNickname(this.externalConfig.getNickname());
			return;
		}
		// const nickname = this.storageSrv.get(Storage.USER_NICKNAME) || this.utilsSrv.generateNickname();

		let nickname = '';
		if (this.storageSrv.get(Storage.USER_NICKNAME)) {
			const storeName = this.storageSrv.get(Storage.USER_NICKNAME);
			if (!storeName.includes("OpenVidu")) {
				nickname = storeName;
			}
		}
		this.nicknameFormControl.setValue(nickname);
		this.localUsersService.updateUsersNickname(nickname);

		this.nicknameFormControl.valueChanges.subscribe((value) => {
			this.localUsersService.updateUsersNickname(value);
			this.storageSrv.set(Storage.USER_NICKNAME, value);
			this.configReady.emit(this.sessionEventObject);
		});
	}

	eventKeyPress(event) {
		if (event && event.keyCode === 13 && this.nicknameFormControl.valid) {
			this.joinSession();
		}
	}

	onResize(event) {
		this.columns = event.target.innerWidth > 900 ? 2 : 1;
		this.breakpoint = (event.target.innerWidth <= 767) ? 1 : 2;
	}

	joinSession() {
		if (this.nicknameFormControl.valid) {
			this.avatarService.setFinalAvatar(this.avatarSelected);
			return this.join.emit();
		}
		this.scrollToBottom();
	}

	close() {
		this.leaveSession.emit();
		this.showConfigCard = false;
	}

	onSelectAvatar(type: AvatarType) {
		this.avatarSelected = type;
	}

	private setDevicesInfo() {
		this.hasVideoDevices = this.oVDevicesService.hasVideoDeviceAvailable();
		this.hasAudioDevices = this.oVDevicesService.hasAudioDeviceAvailable();
		this.microphones = this.oVDevicesService.getMicrophones();
		this.cameras = this.oVDevicesService.getCameras();
		this.camSelected = this.oVDevicesService.getCamSelected();
		this.micSelected = this.oVDevicesService.getMicSelected();
	}

	private setSessionName() {
		this.route.params.subscribe((params: Params) => {
			this.mySessionId = this.externalConfig ? this.externalConfig.getSessionName() : params.roomName;
			let regex = /^[a-zA-Z0-9_-]+$/i;
			if (!(regex.test(this.mySessionId))) {
				const message = 'Invalid room name. Alphanumeric, "_" and "-" are allowed in the room name.';
				alert(message);
				this.router.navigate(['']);
			} else {
				this.tokenService.setSessionId(this.mySessionId);
				sessionStorage.setItem('MeetMonkConfRoomName', this.mySessionId);
			}

		});
		// Enable and update user if participants menu is true
		this.route.queryParams.subscribe(qParams => {
			this.localUsersService.setParticipantsMenu(false);
			sessionStorage.setItem('meetmonk_confrnc_cordntr', 'false');
			if (Object.keys(qParams).length > 0) {
				if ('participantRole' in qParams) {
					let participantsMenu = String(qParams['participantRole']);
					if (participantsMenu != '') {
						participantsMenu = participantsMenu.trim();
						participantsMenu = participantsMenu.toLowerCase();
						if (participantsMenu === 'conferencecoordinator') {
							this.localUsersService.setParticipantsMenu(true);
							sessionStorage.setItem('meetmonk_confrnc_cordntr', 'true');
						}
					}
				}
			}
		});

	}

	private scrollToBottom(): void {
		try {
			this.bodyCard.nativeElement.scrollTop = this.bodyCard.nativeElement.scrollHeight;
		} catch (err) { }
	}

	private initScreenPublisher(): Publisher {
		const videoSource = ScreenType.SCREEN;
		const audioSource = this.hasAudioDevices ? undefined : null;
		const willThereBeWebcam = this.localUsersService.isWebCamEnabled() && this.localUsersService.hasWebcamVideoActive();
		const hasAudio = willThereBeWebcam ? false : this.hasAudioDevices && this.isAudioActive;
		const properties = this.openViduWebRTCService.createPublisherProperties(videoSource, audioSource, true, hasAudio, false);

		try {
			return this.openViduWebRTCService.initPublisher(undefined, properties);
		} catch (error) {
			this.log.e(error);
			this.utilsSrv.handlerScreenShareError(error);
		}
	}

	private publishAudio(audio: boolean) {
		this.localUsersService.isWebCamEnabled()
			? this.openViduWebRTCService.publishWebcamAudio(audio)
			: this.openViduWebRTCService.publishScreenAudio(audio);
	}

	private subscribeToLocalUsersEvents() {
		this.oVUsersSubscription = this.localUsersService.OVUsers.subscribe((users) => {
			this.localUsers = users;
		});
		this.screenShareStateSubscription = this.localUsersService.screenShareState.subscribe((enabled) => {
			this.screenShareEnabled = enabled;
		});
	}

	private async initwebcamPublisher() {
		const micStorageDevice = this.micSelected?.device || undefined;
		const camStorageDevice = this.camSelected?.device || undefined;

		const videoSource = this.hasVideoDevices ? camStorageDevice : false;
		const audioSource = this.hasAudioDevices ? micStorageDevice : false;
		const publishAudio = this.hasAudioDevices ? this.isAudioActive : false;
		const publishVideo = this.hasVideoDevices ? this.isVideoActive : false;
		const mirror = this.camSelected && this.camSelected.type === CameraType.FRONT;
		const properties = this.openViduWebRTCService.createPublisherProperties(
			videoSource,
			audioSource,
			publishVideo,
			publishAudio,
			mirror
		);
		const publisher = await this.openViduWebRTCService.initPublisherAsync(undefined, properties);
		this.localUsersService.setWebcamPublisher(publisher);
		this.handlePublisherSuccess(publisher);
		this.handlePublisherError(publisher);
	}

	private emitPublisher(publisher) {
		this.publisherCreated.emit(publisher);
	}

	private handlePublisherSuccess(publisher: Publisher) {
		publisher.once('accessAllowed', async () => {
			if (this.oVDevicesService.areEmptyLabels()) {
				await this.oVDevicesService.initDevices();
				if (this.hasAudioDevices) {
					const audioLabel = publisher?.stream?.getMediaStream()?.getAudioTracks()[0]?.label;
					this.oVDevicesService.setMicSelected(audioLabel);
				}

				if (this.hasVideoDevices) {
					const videoLabel = publisher?.stream?.getMediaStream()?.getVideoTracks()[0]?.label;
					this.oVDevicesService.setCamSelected(videoLabel);
				}
				this.setDevicesInfo();
			}
			// Emit publisher to webcomponent and angular-library

			this.emitPublisher(publisher);

			if (this.ovSettings.isAutoPublish()) {
				this.joinSession();
				return;
			}
			this.showConfigCard = true;
		});
	}

	private handlePublisherError(publisher: Publisher) {
		publisher.once('accessDenied', (e: any) => {
			let message: string;
			if (e.name === OpenViduErrorName.DEVICE_ALREADY_IN_USE) {
				this.log.w('Video device already in use. Disabling video device...');
				// Allow access to the room with only mic if camera device is already in use
				this.hasVideoDevices = false;
				this.oVDevicesService.disableVideoDevices();

				return this.initwebcamPublisher();
			}
			if (e.name === OpenViduErrorName.DEVICE_ACCESS_DENIED) {
				message = 'Access to media devices was not allowed.';
			} else if (e.name === OpenViduErrorName.NO_INPUT_SOURCE_SET) {
				message = 'No video or audio devices have been found. Please, connect at least one.';
			}
			this.utilsSrv.showErrorMessage(e.name.replace(/_/g, ' '), message, true);
			this.log.e(e.message);
		});
	}


}

