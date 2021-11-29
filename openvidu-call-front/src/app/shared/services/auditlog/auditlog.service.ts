import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Auditlog } from '../../models/auditlog';

@Injectable({
  providedIn: 'root'
})
export class AuditlogService {
  auditLog: Auditlog;
  private URL = 'http://localhost:8080/api/rsbcihi/save';
  constructor(
    private http: HttpClient
  ) {
    this.initialize();
    if (environment.production) {
      this.URL = 'https://configvc.meetmonk.com/MeetmonkVCAuditLog/api/rsbcihi/save';
    }
  }

  private initialize() {
    this.auditLog = new Auditlog();
  }
  public setIsAudio(value: boolean) {
    this.auditLog.hasAudio = value;
  }
  public setIsVideo(value: boolean) {
    this.auditLog.hasCamera = value;
  }
  public setClient(clientData:string){
    const obj = {};
    obj['clientData'] = clientData;
    this.auditLog.clientData = obj;
  }
  public save() {
    try {
      return this.http.post(this.URL, this.auditLog);
    } catch (error) {
        console.error(error);
    }
  }
}
