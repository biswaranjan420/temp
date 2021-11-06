import { Injectable } from '@angular/core';
import { Signal } from '../../types/singal-type';
import { CanvasWhiteboardUpdate, CanvasWhiteboardService, CanvasWhiteboardOptions } from 'ng2-canvas-whiteboard';
import { BehaviorSubject, Observable } from 'rxjs';
import { OpenViduWebrtcService } from '../openvidu-webrtc/openvidu-webrtc.service';
import { Session } from 'openvidu-browser';
@Injectable({
  providedIn: 'root'
})
export class WhiteboardService {

  private session: Session;
  isHost = true;
  isMyConnection = false;
  amIPresenting = false;

  isWhiteboardOpened: Observable<boolean>;
  private _isWhiteboardOpened = <BehaviorSubject<boolean>>new BehaviorSubject(false);
  constructor(
    private openViduWebrtcService: OpenViduWebrtcService,
    private canvasWhiteboardService: CanvasWhiteboardService
  ) {
    this.isWhiteboardOpened = this._isWhiteboardOpened.asObservable();
  }

  initialize() {
    this.session = this.openViduWebrtcService.getWebcamSession();
  }

  getOptions(isHost: boolean): CanvasWhiteboardOptions {
    return {
      drawButtonEnabled: isHost,
      clearButtonEnabled: isHost,
      redoButtonEnabled: isHost,
      strokeColorPickerEnabled: isHost,
      fillColorPickerEnabled: isHost,
      undoButtonEnabled: isHost,
      shapeSelectorEnabled: isHost,
      saveDataButtonEnabled: true,
      shouldDownloadDrawing: true,
      drawButtonClass: 'drawButtonClass',
      drawButtonText: 'Draw',
      clearButtonClass: 'clearButtonClass',
      clearButtonText: 'Clear',
      undoButtonText: 'Undo',
      redoButtonText: 'Redo',
      saveDataButtonText: 'Save',
      lineWidth: 5,
      strokeColor: 'rgb(0,0,0)',
      drawingEnabled:true
    
    };
  }

  toggleWhiteboard() {
    this.send(Signal.WHITEBOARD_TOGGLE, { opened: !this._isWhiteboardOpened.getValue() });
    this._isWhiteboardOpened.next(!this._isWhiteboardOpened.getValue());
     this.amIPresenting = this._isWhiteboardOpened.getValue();
    


  }
  draw(traces: CanvasWhiteboardUpdate[]) {
    this.send(Signal.WHITEBOARD_DRAW, { traces });
  }
  undo(traceId: string) {
    this.send(Signal.WHITEBOARD_UNDO, { traceId });
  }
  redo(traceId: string) {
    this.send(Signal.WHITEBOARD_REDO, { traceId });
  }

  clear() {
    this.send(Signal.WHITEBOARD_CLEAR);
  }

  subscribeToWhiteboardEvents() {
    
    this.session.on('signal:' + Signal.WHITEBOARD_UNDO, (event: any) => {
      if(!this.amIPresenting){
        const traceId = JSON.parse(event.data).traceId;
        this.canvasWhiteboardService.undoCanvas(traceId);
      }
      
    });
    this.session.on('signal:' + Signal.WHITEBOARD_REDO, (event: any) => {
      if(!this.amIPresenting){
        const traceId = JSON.parse(event.data).traceId;
        this.canvasWhiteboardService.redoCanvas(traceId);
      }
    });
    this.session.on('signal:' + Signal.WHITEBOARD_DRAW, (event: any) => {
      if(!this.amIPresenting){
        const traces: CanvasWhiteboardUpdate[] = JSON.parse(event.data).traces;
        this.canvasWhiteboardService.drawCanvas(traces);
      }
    });
    this.session.on('signal:' + Signal.WHITEBOARD_CLEAR, (event: any) => {
      if(!this.amIPresenting){
        this.canvasWhiteboardService.clearCanvas();
      }
    });

    this.session.on('signal:' + Signal.WHITEBOARD_TOGGLE, (event: any) => {
      if(!this.amIPresenting){
        const opened: boolean = JSON.parse(event.data).opened;
        this._isWhiteboardOpened.next(opened);
      }
    });
  }
  private send(signal: Signal, data?: any) {
    this.openViduWebrtcService.sendSignal(signal, undefined, data);
  }
}
