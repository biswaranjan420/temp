import { PlatformUtils } from "openvidu-browser/lib/OpenViduInternal/Utils/Platform";

export class Auditlog {
    sessionId: string;
    event: string;
    platform: string;
    hasAudio: boolean;
    hasCamera: boolean;
    timestamp: number;
    clientData:Object;
    constructor() {
        this.sessionId = sessionStorage.getItem('MeetMonkConfRoomName');
        this.timestamp = new Date().getTime();
        this.event = 'sessionConfig';
        this.platform = this.browserName();
    }

    browserName() {
        const platForm = PlatformUtils.getInstance();
        return platForm.getDescription();
    }
}
