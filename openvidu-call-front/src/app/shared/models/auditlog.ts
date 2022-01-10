import { PlatformUtils } from "openvidu-browser/lib/OpenViduInternal/Utils/Platform";

export class Auditlog {
    roomId: string;
    roomName: string;
    userId: string;
    userName: string;
    participant_status: string;
    platform: string;
    time: Date;
    connection_status: string;
    systemResource: SystemResource;


    constructor() {
        this.userId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        this.platform = this.browserName();
    }

    browserName() {
        const platForm = PlatformUtils.getInstance();
        return platForm.getDescription();
    }
}
export class SystemResource {
    audio: number;
    video: number
}

export class CustomSessionEvent {
    participant_status: string;
    deviceStatus:string;
    systemResource: SystemResource;
    constructor() {
        this.participant_status = 'WAITING';
    }
}

export class ChatReport {
    roomId: string;
    userName: string;
    message: string;
    time: Date;
}
