import { PlatformUtils } from "openvidu-browser/lib/OpenViduInternal/Utils/Platform";

export class Auditlog {
    roomId: string;
    sessionId: string;
    userId: string;
    userName: String;
    event: string;
    platform: string;
    hasAudio: boolean;
    hasCamera: boolean;
    audioSource: string;
    videoSource: string;
    resourceNews:string;
    
    constructor() {
        this.sessionId = sessionStorage.getItem('MeetMonkConfRoomName');
        this.userId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        this.platform = this.browserName();
    }

    browserName() {
        const platForm = PlatformUtils.getInstance();
        return platForm.getDescription();
    }
}

export class CustomSessionEvent {
	event: string;
	resourceNews: string;
	constructor() {
		this.event = 'sessionConfig';
	}
}
