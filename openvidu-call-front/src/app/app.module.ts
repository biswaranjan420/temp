import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Injector } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSliderModule } from '@angular/material/slider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatBottomSheetModule, MAT_BOTTOM_SHEET_DEFAULT_OPTIONS } from '@angular/material/bottom-sheet';
import {MatTabsModule} from '@angular/material/tabs';
import {MatRadioModule} from '@angular/material/radio';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClientModule } from '@angular/common/http';
import { createCustomElement } from '@angular/elements';
import { ElementZoneStrategyFactory } from 'elements-zone-strategy';
import { FlexLayoutModule } from '@angular/flex-layout';
import { AppRoutingModule } from './app-routing.module';
import { OverlayContainer } from '@angular/cdk/overlay';
import { PickerModule } from '@ctrl/ngx-emoji-mart';


// Pipes
import { LinkifyPipe } from './shared/pipes/linkfy';
import {
	HasChatPipe,
	HasAudioPipe,
	HasVideoPipe,
	IsAutoPublishPipe,
	HasScreenSharingPipe,
	HasFullscreenPipe,
	HasLayoutSpeakingPipe,
	HasExitPipe,
	HasFooterPipe,
	HasToolbarPipe
} from './shared/pipes/ovSettings.pipe';
import { TooltipListPipe } from './shared/pipes/tooltipList.pipe';

// Components
import { StreamComponent } from './shared/components/stream/stream.component';
import { ChatComponent } from './shared/components/chat/chat.component';
import { OpenViduVideoComponent } from './shared/components/stream/ov-video.component';
import { DialogErrorComponent } from './shared/components/dialog-error/dialog-error.component';
import { ToolbarComponent } from './shared/components/toolbar/toolbar.component';
import { ToolbarLogoComponent } from './shared/components/toolbar/logo.component';
import { RoomConfigComponent } from './shared/components/room-config/room-config.component';
import { WebComponentComponent } from './web-component/web-component.component';
import { VideoRoomComponent } from './video-room/video-room.component';
import { HomeComponent } from './home/home.component';
import { AppComponent } from './app.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { CanvasWhiteboardModule } from 'ng2-canvas-whiteboard';

// Services
import { NetworkService } from './shared/services/network/network.service';
import { OpenViduWebrtcService } from './shared/services/openvidu-webrtc/openvidu-webrtc.service';
import { UtilsService } from './shared/services/utils/utils.service';
import { DevicesService } from './shared/services/devices/devices.service';
import { RemoteUsersService } from './shared/services/remote-users/remote-users.service';
import { ChatService } from './shared/services/chat/chat.service';
import { LoggerService } from './shared/services/logger/logger.service';
import { NotificationService } from './shared/services/notifications/notification.service';
import { StorageService } from './shared/services/storage/storage.service';
import { CdkOverlayContainer } from './shared/config/custom-cdk-overlay-container';
import { LocalUsersService } from './shared/services/local-users/local-users.service';
import { DialogComponent } from './shared/components/dialog/dialog.component';
import { ParticipantsComponent } from './shared/components/participants/participants.component';
import { MatListModule } from '@angular/material/list';
import { WhiteboardComponent } from './shared/components/whiteboard/whiteboard.component';
import { DeviceSettingComponent } from './shared/components/device-setting/device-setting.component';
import { AuditlogService } from './shared/services/auditlog/auditlog.service';

@NgModule({
	declarations: [
		AppComponent,
		VideoRoomComponent,
		HomeComponent,
		StreamComponent,
		ChatComponent,
		OpenViduVideoComponent,
		DialogErrorComponent,
		RoomConfigComponent,
		WebComponentComponent,
		ToolbarComponent,
		ToolbarLogoComponent,
		LinkifyPipe,
		HasChatPipe,
		HasAudioPipe,
		HasVideoPipe,
		IsAutoPublishPipe,
		HasScreenSharingPipe,
		HasFullscreenPipe,
		HasLayoutSpeakingPipe,
		HasExitPipe,
		HasFooterPipe,
		HasToolbarPipe,
		TooltipListPipe,
		FooterComponent,
		DialogComponent,
		ParticipantsComponent,
		WhiteboardComponent,
		DeviceSettingComponent
	],
	imports: [
		CanvasWhiteboardModule,
		FormsModule,
		ReactiveFormsModule,
		BrowserModule,
		BrowserAnimationsModule,
		MatButtonModule,
		MatCardModule,
		MatToolbarModule,
		MatIconModule,
		MatInputModule,
		MatFormFieldModule,
		MatDialogModule,
		MatTooltipModule,
		MatBadgeModule,
		MatGridListModule,
		MatSelectModule,
		MatOptionModule,
		MatProgressSpinnerModule,
		MatSliderModule,
		MatSidenavModule,
		MatSnackBarModule,
		MatListModule,
		MatProgressBarModule,
		MatButtonToggleModule,
		MatBottomSheetModule,
		MatTabsModule,
		MatRadioModule,
		AppRoutingModule,
		HttpClientModule,
		FlexLayoutModule,
		MatMenuModule,
		PickerModule
	],
	entryComponents: [DialogErrorComponent, WebComponentComponent],
	providers: [
		NetworkService,
		OpenViduWebrtcService,
		LocalUsersService,
		UtilsService,
		RemoteUsersService,
		DevicesService,
		LoggerService,
		ChatService,
		NotificationService,
		StorageService,
		AuditlogService,
		CdkOverlayContainer,
		{ provide: OverlayContainer, useClass: CdkOverlayContainer },
		{provide: MAT_BOTTOM_SHEET_DEFAULT_OPTIONS, useValue: {hasBackdrop: false}}
	],
	bootstrap: [AppComponent]
})
export class AppModule {
	constructor(private injector: Injector) {
		const strategyFactory = new ElementZoneStrategyFactory(WebComponentComponent, this.injector);
		const element = createCustomElement(WebComponentComponent, { injector: this.injector, strategyFactory });
		customElements.define('openvidu-webcomponent', element);
	}

	ngDoBootstrap() { }
}
