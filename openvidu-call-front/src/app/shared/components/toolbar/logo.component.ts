import { Component, Input } from '@angular/core';

@Component({
	selector: 'app-toolbar-logo',
	template: `
		<div id="navSessionInfo">
			<a>
				<img id="header_img" alt="MeetMonk Logo" [src]="logoUrl" />
			</a>
			<div *ngIf="!compact && sessionId" [ngClass]="{'titleContent': true, 'titleContentLight': lightTheme, 'titleContentDark': false}">
				<span id="session-title" style="margin-left:10px">{{ sessionId }}</span>
			</div>
		</div>
	`,
	styleUrls: ['./toolbar.component.css']
})
export class ToolbarLogoComponent {
	@Input() lightTheme: boolean;
	@Input() compact: boolean;
	@Input() sessionId: string;
	@Input() logoUrl: string;

	constructor() {}
}
