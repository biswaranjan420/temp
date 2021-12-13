import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Auditlog } from '../../models/auditlog';

@Injectable({
  providedIn: 'root'
})
export class AuditlogService {
  auditLog: Auditlog;
  private URL = 'http://localhost:8080/api/rsbcihi';
  private WEBHOOK_URL = 'http://50.18.225.154:9001/logs';
  constructor(
    private http: HttpClient
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
  public setHasAudio(value: boolean) {
    this.auditLog.hasAudio = value;
  }
  public setHasVideo(value: boolean) {
    this.auditLog.hasCamera = value;
  }
  public setAudioSource(source: string) {
    this.auditLog.audioSource = source;
  }
  public setVideoSource(source: string) {
    this.auditLog.videoSource = source;
  }
  public setEvent(value: string) {
    this.auditLog.event = value;
  }
  public setResourceNews(value: string) {
    this.auditLog.resourceNews = value;
  }
  public setRoomId(roomId: any) {
    this.auditLog.roomId = roomId;
  }
  public setUserName(name: string) {
    this.auditLog.userName = name;
  }
  public setSessionId(sessionId: string) {
    this.auditLog.sessionId = sessionId;
  }
  public setSpeed(speed: string) {
    this.auditLog.networkSpeed = speed;
  }
  public reset(): void {
    this.auditLog = null;
  }
  public save(): Observable<any> {

    try {
      this.http.post(this.WEBHOOK_URL, this.auditLog).subscribe(
        (res) => {

        },
        (err) => {

        }
      )
    } catch (error) {

    }

    try {

      return this.http.post(this.URL + '/save', this.auditLog);
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
