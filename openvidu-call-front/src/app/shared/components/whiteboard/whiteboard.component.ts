import { Component, OnInit } from '@angular/core';
import { CanvasWhiteboardComponent, CanvasWhiteboardUpdate,CanvasWhiteboardOptions } from 'ng2-canvas-whiteboard';
import { WhiteboardService } from '../../services/whiteboard/whiteboard.service';

@Component({
  selector: 'app-whiteboard',
  viewProviders: [CanvasWhiteboardComponent],
  templateUrl: './whiteboard.component.html',
  styleUrls: ['./whiteboard.component.css']
})
export class WhiteboardComponent implements OnInit {
  canvasOptions: CanvasWhiteboardOptions;
  constructor(
    private whiteboardSrv: WhiteboardService
  ) { }

  ngOnInit(): void {
    this.canvasOptions = this.whiteboardSrv.getOptions(true);
  }
  sendBatchUpdate(event: CanvasWhiteboardUpdate[]) {
    this.whiteboardSrv.draw(event);
  }

  onCanvasClear() {
    this.whiteboardSrv.clear();
  }

  onCanvasUndo(event: string) {
    this.whiteboardSrv.undo(event);
  }

  onCanvasRedo(event: string) {
    this.whiteboardSrv.redo(event);
  }
}
