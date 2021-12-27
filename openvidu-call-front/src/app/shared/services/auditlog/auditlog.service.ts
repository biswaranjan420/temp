import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Auditlog, SystemResource } from '../../models/auditlog';
import { StorageService } from '../storage/storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuditlogService {
  auditLog: Auditlog;
  private URL = 'http://localhost:8080/api/rsbcihi';
  private WEBHOOK_URL = 'http://50.18.225.154:9001/logs';
  constructor(
    private http: HttpClient,
    private storageServ: StorageService
  ) {
    if (environment.production) {
      this.URL = 'https://configvc.meetmonk.com/MeetmonkVCAuditLog/api/rsbcihi';
    }
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
  }
  public save() {

    this.auditLog.time = new Date();
    // try {
    //   this.http.post(this.WEBHOOK_URL, this.auditLog).subscribe(
    //     (res) => {

    //     },
    //     (err) => {

    //     }
    //   )

    // } catch (error) {

    // }

    try {
      this.http.post(this.URL + '/save', this.auditLog).subscribe(
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
          reject(err);
        }
      )
    });

  }
}
