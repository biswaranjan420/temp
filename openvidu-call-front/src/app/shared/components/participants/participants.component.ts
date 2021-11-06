import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { Connection } from 'openvidu-browser';
import { forkJoin, Subscription } from 'rxjs';
import { UserModel } from '../../models/user-model';
import { OpenViduLayoutService } from '../../services/layout/layout.service';
import { LocalUsersService } from '../../services/local-users/local-users.service';
import { OpenViduWebrtcService } from '../../services/openvidu-webrtc/openvidu-webrtc.service';
import { RemoteUsersService } from '../../services/remote-users/remote-users.service';
import { Signal } from '../../types/singal-type';
import { UserName } from '../../types/username-type';
import { VideoType } from '../../types/video-type';

@Component({
	selector: 'app-participants',
	templateUrl: './participants.component.html',
	styleUrls: ['./participants.component.css']
})
export class ParticipantsComponent implements OnInit {
	participantsNameList: UserName[] = [];
	private remoteUsersSubscription: Subscription;
	private localUsersSubscription: Subscription;
	participants: UserModel[] = [];
	localUser: UserModel[] = [];
	isTeacher = false;
	isProgressBar = false;
	@Output() localUserMicClick = new EventEmitter<any>();
	@Output() localUserCamClick = new EventEmitter<any>();
	constructor(
		private remoteUsersService: RemoteUsersService,
		private oVLayout: OpenViduLayoutService,
		private openViduWebRTCService: OpenViduWebrtcService,
		private localUserService: LocalUsersService
	) { }

	ngOnInit(): void {
		this.isProgressBar = false;
		this.localUser = [];
		this.participants = [];
		this.subscribeToLocalUsers();
		this.subscribeToRemoteUsers();
	}


	private subscribeToLocalUsers() {
		this.localUsersSubscription = this.localUserService.OVUsers.subscribe((users: UserModel[]) => {
			this.localUser = [...users];
			this.oVLayout.update();
		});
	}
	private subscribeToRemoteUsers() {
		this.remoteUsersSubscription = this.remoteUsersService.remoteUsers.subscribe((users: UserModel[]) => {
			this.participants = [...users];
			this.oVLayout.update();
			
		});
	}

	toggleAudioToLocalUser() {
		this.localUserMicClick.emit();
	}
	toggleCameraToLocalUser() {
		this.localUserCamClick.emit();
	}
	toggleAudioToUser(participant: UserModel) {
		this.isProgressBar = true;
		const signalType = participant.isAudioActive() ? Signal.DISABLE_AUDIO : Signal.ENABLE_AUDIO;
		const connection = participant.getStreamManager().stream.connection;
		this.openViduWebRTCService.sendSignal(signalType, connection);
		setTimeout(() => {
			this.isProgressBar = false;
		}, 1000);
	}
	toggleCameraTolUser(participant: UserModel) {
		this.openViduWebRTCService.sendSignal(Signal.TOGGLE_VIDEO, participant.getStreamManager().stream.connection);
	}

	enableAudioForAll() {
		
		this.isProgressBar = true;
		/*if (!this.isLocalMicEnabled()) {
			this.toggleAudioToLocalUser();
		}*/
		let audioDisabledUserModel: UserModel[] = this.participants.filter(um => {
			return um.isAudioActive() === false;
		});
		audioDisabledUserModel.forEach(um => {
			const signalType = Signal.ENABLE_AUDIO;
			const connection = um.getStreamManager().stream.connection;
			this.openViduWebRTCService.sendSignal(signalType, connection);
		});
		setTimeout(() => {
			this.isProgressBar = false;
		}, 1000);
	}

	disableAudioForAll() {
		
		this.isProgressBar = true;
		/*if (this.isLocalMicEnabled()) {
			this.toggleAudioToLocalUser();
		}*/
		let audioEnabledUserModel: UserModel[] = this.participants.filter(um => {
			return um.isAudioActive() === true;
		})
		audioEnabledUserModel.forEach(um => {
			const signalType = Signal.DISABLE_AUDIO;
			const connection = um.getStreamManager().stream.connection;
			this.openViduWebRTCService.sendSignal(signalType, connection);
		});
		setTimeout(() => {
			this.isProgressBar = false;
		}, 1000);
	}

	enableCameraForAll(){
		this.isProgressBar = true;
		/*if (!this.isLocalCamEnabled()) {
			this.toggleCameraToLocalUser();
		}*/
		let camDisabledUserModel: UserModel[] = this.participants.filter(um => {
			return um.isVideoActive() === false;
		});
		camDisabledUserModel.forEach(um => {
			const connection = um.getStreamManager().stream.connection;
			this.openViduWebRTCService.sendSignal(Signal.TOGGLE_VIDEO, connection);
		});
		setTimeout(() => {
			this.isProgressBar = false;
		}, 1000);
	}
	disableCameraForAll(){
		this.isProgressBar = true;
		/*if (this.isLocalCamEnabled()) {
			this.toggleCameraToLocalUser();
		}*/
		let camEnabledUserModel: UserModel[] = this.participants.filter(um => {
			return um.isVideoActive() === true;
		});
		camEnabledUserModel.forEach(um => {
			const connection = um.getStreamManager().stream.connection;
			this.openViduWebRTCService.sendSignal(Signal.TOGGLE_VIDEO, connection);
		});
		setTimeout(() => {
			this.isProgressBar = false;
		}, 1000);
	}
	isLocalMicEnabled(): boolean {
		if (this.localUser.length > 0) {
			return this.localUser[0].streamManager.stream.audioActive;
		}
	}
	isLocalCamEnabled(): boolean {
		if (this.localUser.length > 0) {
			return this.localUser[0].streamManager.stream.videoActive;
		}
	}
}
