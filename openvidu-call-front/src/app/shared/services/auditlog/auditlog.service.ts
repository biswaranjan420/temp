import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Auditlog, ChatReport, SystemResource } from '../../models/auditlog';
import { StorageService } from '../storage/storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuditlogService {

  deviceStatus: string;
  auditLog: Auditlog;
  chatReport: ChatReport;
  private URL = 'http://localhost:8080/api/rsbcihi';
  private WEBHOOK_URL = 'NULL';
  constructor(
    private http: HttpClient,
    private storageServ: StorageService
  ) {
    if (environment.production) {
      this.URL = 'https://configvc.meetmonk.com/MeetmonkVCAuditLog/api/rsbcihi';
      this.WEBHOOK_URL = 'https://us-central1-website-hosting-309708.cloudfunctions.net/updateStatus';
    }
    this.chatReport = new ChatReport();
  }

  public initialize() {
    this.auditLog = new Auditlog();
  }
  public getAuditLog(): Auditlog {
    return this.auditLog;
  }

  public setRoomId(roomId: any) {
    this.auditLog.roomId = roomId;
  }
  public setUserName(name: string) {
    this.auditLog.userName = name;
  }
  public setRoomName(roomName: string) {
    this.auditLog.roomName = roomName;
  }
  public setSystemResource(systemResource: SystemResource) {
    this.auditLog.systemResource = systemResource;
  }
  public setDeviceStatus(status: string) {
    if (status) {
      this.deviceStatus = status;
    }
  }
  public getDeviceStatus(): string {
    return this.deviceStatus;
  }
  public setConnectionStatus(speed: any): boolean {
    try {
      const speedValue = parseInt(speed);
      if (speedValue < 5) {
        this.auditLog.connection_status = 'POOR';
      }
      if (speedValue >= 5 && speedValue <= 20) {
        this.auditLog.connection_status = 'AVG';
      }
      if (speedValue > 20) {
        this.auditLog.connection_status = 'GOOD';
      }
      if (this.storageServ.get("connection_status") != this.auditLog.connection_status) {
        this.storageServ.set("connection_status", this.auditLog.connection_status);
        return true;
      } else {
        return false;
      }

    } catch (e) {

    }
  }
  public setParticipantStatus(participant_status: string) {
    this.auditLog.participant_status = participant_status;
  }
  public reset(): void {
    this.auditLog = null;
    this.deviceStatus = '';
  }
  public save() {
    this.auditLog.time = new Date();
    if (this.WEBHOOK_URL != 'NULL') {
      try {
        this.http.post(this.WEBHOOK_URL, this.auditLog).subscribe(
          (res) => {

          },
          (err) => {

          }
        )

      } catch (error) {

      }
    }

    try {
      this.http.post(this.URL + '/save', this.auditLog).subscribe(
        () => {

        }
      )
    } catch (error) {
      // console.error(error);
    }
  }

  saveChatReport(message: string) {
    this.chatReport.time = new Date();
    this.chatReport.message = message;
    this.chatReport.userName = this.auditLog.userName;
    this.chatReport.roomId = this.auditLog.roomId;
    try {
      this.http.post(this.URL + '/saveChatReport', this.chatReport).subscribe(
        () => {

        }
      )
    } catch (error) {
      // console.error(error);
    }
  }

  getRoomId(sessionId: string) {

    const httpOptions = {
      headers: new HttpHeaders({
        'instancename': 'MEETMONK_RSBCIHI_VC',
        'password': 'Rsbcihi@12345'
      })
    };
    return new Promise((resolve, reject) => {
      this.http.get(this.URL + '/getRoomId/' + sessionId, httpOptions).subscribe(
        (res) => {
          resolve(res);
        },
        (err) => {
          resolve({ 'roomId': 'NULL' });
        }
      )
    });

  }
}
