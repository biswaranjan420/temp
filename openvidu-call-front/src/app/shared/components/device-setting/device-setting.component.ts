import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserModel } from '../../models/user-model';
import { DevicesService } from '../../services/devices/devices.service';
import { LocalUsersService } from '../../services/local-users/local-users.service';
import { OpenViduWebrtcService } from '../../services/openvidu-webrtc/openvidu-webrtc.service';
import { IDevice } from '../../types/device-type';


@Component({
  selector: 'app-device-setting',
  templateUrl: './device-setting.component.html',
  styleUrls: ['./device-setting.component.css']
})
export class DeviceSettingComponent implements OnInit {
  cameras: IDevice[];
  microphones: IDevice[];
  camSelected: IDevice;
  micSelected: IDevice;
  hasVideoDevices = false;
  hasAudioDevices = false;
  deviceLoaded = false;
  localUsers: UserModel[] = [];

  constructor(
    private oVDevicesService: DevicesService,
    private localUserService: LocalUsersService,
    private openViduWebRTCService: OpenViduWebrtcService,
    private _snackBar: MatSnackBar
  ) {
    this.localUserService.OVUsers.subscribe((users) => {
      this.localUsers = users;
    });
  }


  async ngOnInit() {
    this.microphones = [];
    this.cameras = [];
    await this.oVDevicesService.initDevices();
    this.hasVideoDevices = this.oVDevicesService.hasVideoDeviceAvailable();
    this.hasAudioDevices = this.oVDevicesService.hasAudioDeviceAvailable();
    this.oVDevicesService.getMicrophones().forEach(
      (mic, index) => {
        if (mic.device !== null) {
          mic['micindex'] = 'mic-' + index;
          this.microphones.push(mic);
        }
      }
    );
    this.oVDevicesService.getCameras().forEach(
      (cam, index) => {
        if (cam.device !== null) {
          cam['camindex'] = 'cam-' + index;
          this.cameras.push(cam);
        }
      }
    );
    this.camSelected = this.oVDevicesService.getCamSelected();
    this.micSelected = this.oVDevicesService.getMicSelected();
    this.hideSpinner();

  }


  hideSpinner(): void {
    this.deviceLoaded = true;
  }
  audioSource: any;
  videoSource: any;
  isDisabled = true;
  successMessage:string;
  updateAudioVideoTrack() {
    //console.log(this.audioSource['source']['id'] + ' , ' + this.videoSource?.value);

    if (this.audioSource === undefined && this.videoSource === undefined) {
      return;
    }
    if (this.audioSource === undefined) {
      this.audioSource = this.micSelected.device;
    }
    if (this.videoSource === undefined) {
      this.videoSource = this.camSelected.device;
    }
    let _audioRadioId: string;
    let _camRadioId: string;

    if (typeof this.audioSource === 'object') {
      _audioRadioId = this.audioSource['source']['id'];
      this.audioSource = this.audioSource?.value;
      this.loadDeviceProperty('load', _audioRadioId);
    }
    if (typeof this.videoSource === 'object') {
      _camRadioId = this.videoSource['source']['id'];
      this.videoSource = this.videoSource?.value;
      this.loadDeviceProperty('load', _camRadioId);

    }

    if (this.oVDevicesService.needUpdateVideoTrack(this.videoSource) || this.oVDevicesService.needUpdateAudioTrack(this.audioSource)) {
      const mirror = this.oVDevicesService.cameraNeedsMirror(this.videoSource);
      const hasAudio = this.localUserService.hasWebcamAudioActive();
      const hasVideo = this.localUserService.hasWebcamVideoActive();
      this.openViduWebRTCService.switchCameraOrAudioTrack(this.videoSource, this.audioSource, hasAudio,hasVideo, mirror).then(
        (res) => {
          if (_audioRadioId) {
            this.loadDeviceProperty('unload', _audioRadioId);
          }
          if (_camRadioId) {
            this.loadDeviceProperty('unload', _camRadioId);
          }
          this.oVDevicesService.setCamSelected(this.videoSource);
          this.oVDevicesService.setMicSelected(this.audioSource);
          this.camSelected = this.oVDevicesService.getCamSelected();
          this.micSelected = this.oVDevicesService.getMicSelected();
          //this.openSnackBar(res);
          this.successMessage = res;
          this.isDisabled = true;
        }
      ).catch(
        (err: Error) => {
          if (_audioRadioId) {
            this.loadDeviceProperty('unload', _audioRadioId);
          }
          if (_camRadioId) {
            this.loadDeviceProperty('unload', _camRadioId);
          }
          console.error(err);
        }
      );

    }


  }
  changeMicrophone(event: any) {
    this.audioSource = event;
    this.isDisabled = false;
    this.successMessage=null;
  }
  changeCamera(event: any) {
    this.videoSource = event;
    this.isDisabled = false;
    this.successMessage=null;
  }
  loadDeviceProperty(action: string, propertid: any) {
    const elemId = `matprog-${propertid}`;
    if ('load' === action) {
      document.getElementById(elemId).style.display = 'block';
    }
    if ('unload' === action) {
      document.getElementById(elemId).style.display = 'none';
    }

  }

  openSnackBar(message: string) {
    this._snackBar.open(message, '', {
      duration: 1000
    });
  }
  showVideoAvtar(action: string, id: string) {
    try {
      if ('show' === action) {
        document.getElementById(id).style.display = 'block';

      } else {
        let elements = document.getElementsByClassName('videoContainer');
        for (let i = 0; i < elements.length; i++) {
          elements[i]['style'].display = "none";
        }
      }
    } catch (error) {

    }

  }

  private publishAudio(audio: boolean) {
    this.localUserService.isWebCamEnabled()
      ? this.openViduWebRTCService.publishWebcamAudio(audio)
      : this.openViduWebRTCService.publishScreenAudio(audio);
  }
}
